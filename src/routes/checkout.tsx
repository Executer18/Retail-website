import { Hono } from "hono";
import { and, eq, asc } from "drizzle-orm";
import { getDB } from "../db";
import { cartItems, products, orders, orderItems, customers } from "../db/schema";
import { createAuth } from "../auth";
import type { Env, Variables } from "../db";
import { getAvailablePickupSlots } from "../lib/pickup-slots";
import { razorpayConfigured } from "../lib/razorpay";
import { cancelUnpaidOnlineOrders, expireStaleOnlineOrders } from "../lib/order-payments";
import { CheckoutPage } from "../pages/CheckoutPage";
import { OrderConfirmationPage } from "../pages/OrderConfirmationPage";
import { redirect } from 'react-router-dom';

export const checkoutRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

const round2 = (n: number) => Math.round(n * 100) / 100;

// MRP per kg = selling price + discount (discount can be null/0).
const mrpPerKg = (pricePerKg: number, discount: number | null) =>
  pricePerKg + Math.max(0, discount ?? 0);

function calcTotals(
  rows: { pricePerKg: number; quantityKg: number; discount: number | null }[]
) {
  let mrp = 0;
  let pay = 0;
  for (const r of rows) {
    mrp += mrpPerKg(r.pricePerKg, r.discount) * r.quantityKg;
    pay += r.pricePerKg * r.quantityKg;
  }
  return { mrp: round2(mrp), pay: round2(pay), save: round2(mrp - pay) };
}

// Reads the real Better Auth session. Returns the matching customers.customerId,
// creating a Customers row the first time this auth user ever reaches checkout.
// Returns null if nobody is logged in.
async function getLoggedInCustomerId(c: any): Promise<number | null> {
  const session = await createAuth(c.env).api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session?.user) return null;

  const db = getDB(c.env);

  const existing = await db
    .select()
    .from(customers)
    .where(eq(customers.authUserId, session.user.id));

  if (existing[0]) return existing[0].customerId;

  // First time this logged-in user has reached checkout — create their
  // Customers row now, linked by authUserId.
  const [created] = await db
    .insert(customers)
    .values({
      authUserId: session.user.id,
      fullName: session.user.name ?? "",
      phoneNumber: null,
    })
    .returning();

  return created.customerId;
}

checkoutRoutes.get("/checkout", async (c) => {
  const customerId = await getLoggedInCustomerId(c);
  if (!customerId) {
    // Login required only at this step — browsing, cart, and the
    // grind/sell calculators all stay public.
    return c.redirect("/login?redirect=/checkout");
  }

  const db = getDB(c.env);
  const sessionId = c.get("sessionId");

  const rows = await db
    .select({
      cartItemId: cartItems.cartItemId,
      productId: cartItems.productId,
      quantityKg: cartItems.quantityKg,
      name: products.itemName,
      imageUrl: products.imageUrl,
      pricePerKg: products.pricePerKg,
      discount: products.discount,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.productId))
    .where(eq(cartItems.sessionId, sessionId));

  if (rows.length === 0) {
    return c.redirect("/cart");
  }

  const items = rows.map((r) => ({
    productId: r.productId,
    quantityKg: r.quantityKg,
    name: r.name,
    imageUrl: r.imageUrl,
    pricePerKg: r.pricePerKg,
    mrpPerKg: mrpPerKg(r.pricePerKg, r.discount),
  }));
  const totals = calcTotals(rows);
  const slots = getAvailablePickupSlots();

  return c.html(
    <CheckoutPage
      items={items}
      totals={totals}
      slots={slots}
      onlineEnabled={razorpayConfigured(c.env)}
    />
  );
});

checkoutRoutes.post("/checkout", async (c) => {
  const customerId = await getLoggedInCustomerId(c);
  if (!customerId) {
    return c.redirect("/login?redirect=/checkout");
  }

  const db = getDB(c.env);
  const sessionId = c.get("sessionId");
  const body = await c.req.parseBody();

  // Form field must be name="pickupSlot" in CheckoutPage.tsx — this matches
  // the existing orders.pickupSlot column, not a new duplicate column.
  const pickupSlot = String(body.pickupSlot || "");
  const customerName = String(body.customerName || "").trim();
  const customerPhone = String(body.customerPhone || "").trim();
  // Anything other than "online" is the default, pay at counter.
  const paymentMethod: "counter" | "online" = body.paymentMethod === "online" ? "online" : "counter";

  // The browser already checks these (see CheckoutPage.tsx); this is the
  // server-side backstop for anyone bypassing the form.
  if (customerName.length < 2) {
    return c.text("Please enter your name.", 400);
  }
  if (!/^[0-9]{10}$/.test(customerPhone)) {
    return c.text("Please enter a valid 10-digit phone number.", 400);
  }
  if (!pickupSlot) {
    return c.text("Please pick a pickup time slot.", 400);
  }
  // Slots are generated fresh from "now", so also reject slots that are no
  // longer offered (e.g. the page was left open and the slot has since passed).
  if (!getAvailablePickupSlots().some((s) => s.value === pickupSlot)) {
    return c.text(
      "That pickup time is no longer available. Please go back and choose another slot.",
      400
    );
  }
  if (paymentMethod === "online" && !razorpayConfigured(c.env)) {
    return c.text("Online payment isn't available right now. Please choose pay at counter.", 400);
  }

  const cartRows = await db
    .select({
      productId: cartItems.productId,
      quantityKg: cartItems.quantityKg,
      pricePerKg: products.pricePerKg,
      discount: products.discount,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.productId))
    .where(eq(cartItems.sessionId, sessionId));

  if (cartRows.length === 0) {
    return c.redirect("/cart");
  }

  for (const row of cartRows) {
    if (row.quantityKg <= 0) {
      return c.text("Cart contains an invalid quantity.", 400);
    }
  }

  // Customer pays the selling price (pay), not the MRP.
  const { pay: totalAmount } = calcTotals(cartRows);

  // Starting a new checkout replaces any online order still waiting for payment.
  await cancelUnpaidOnlineOrders(db, customerId);

  const [insertedOrder] = await db
    .insert(orders)
    .values({
      customerId,
      status: "Reserved", // matches your real enum default, not "placed"
      pickupSlot,
      customerName,
      customerPhone,
      totalAmount,
      paymentMethod,
      paymentStatus: "unpaid",
      // Online orders remember which cart they came from, so the cart can be
      // cleared once the payment is confirmed (even if only the webhook sees it).
      cartSessionId: paymentMethod === "online" ? sessionId : null,
    })
    .returning();

  await db.insert(orderItems).values(
    cartRows.map((row) => ({
      orderId: insertedOrder.orderId,
      productId: row.productId,
      weightKg: row.quantityKg, // matches real column name: weightKg
      pricePerKgAtPurchase: row.pricePerKg,
    }))
  );

  if (paymentMethod === "online") {
    // Cart stays until the payment succeeds.
    return c.redirect(`/checkout/pay/${insertedOrder.orderId}`, 303);
  }

  // Counter order: nothing more to wait for, so the cart is cleared now.
  await db.delete(cartItems).where(eq(cartItems.sessionId, sessionId));
  return c.redirect(`/order-confirmed/${insertedOrder.orderId}`, 303);
});

// Confirmation page for an order that is placed (counter) or paid (online).
checkoutRoutes.get("/order-confirmed/:orderId", async (c) => {
  const orderId = Number(c.req.param("orderId"));
  if (!Number.isInteger(orderId)) return c.notFound();

  const customerId = await getLoggedInCustomerId(c);
  if (!customerId) {
    return c.redirect("/login?redirect=" + encodeURIComponent(`/order-confirmed/${orderId}`));
  }

  const db = getDB(c.env);
  await expireStaleOnlineOrders(db, customerId);

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.orderId, orderId), eq(orders.customerId, customerId)));

  if (!order) return c.notFound();

  // An online order that isn't paid yet isn't "confirmed": send it back to payment, or to its page if cancelled.
  if (order.paymentMethod === "online" && order.paymentStatus !== "paid") {
    return c.redirect(order.status === "Cancelled" ? `/orders/${orderId}` : `/checkout/pay/${orderId}`);
  }
  if (order.status === "Cancelled") {
    return c.redirect(`/orders/${orderId}`);
  }

  const items = await db
    .select({
      name: products.itemName,
      quantityKg: orderItems.weightKg,
      imageUrl: products.imageUrl,
    })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.productId))
    .where(eq(orderItems.orderId, orderId))
    .orderBy(asc(orderItems.itemId));

  return c.html(
    <OrderConfirmationPage
      orderId={order.orderId}
      customerName={order.customerName}
      customerPhone={order.customerPhone}
      pickupSlot={order.pickupSlot}
      items={items}
      total={order.totalAmount}
      status={order.status}
      paymentMethod={order.paymentMethod}
      paymentStatus={order.paymentStatus}
    />
  );
});