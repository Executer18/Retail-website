// src/routes/checkout.ts
//
// Route: GET  /checkout   — shows the form (name, phone, pickup slot picker).
// Route: POST /checkout   — requires login. Finds-or-creates the matching
//                            Customers row for the logged-in Better Auth
//                            user, creates one `orders` row + matching
//                            `order_items` rows from the cart, clears the
//                            cart, shows confirmation.
//
// No wheat-swap / bring-wheat-buy-atta logic here — that flow is
// walk-in-only, handled by the shop owner in person, never online.

import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getDB } from "../db";
import { cartItems, products, orders, orderItems, customers } from "../db/schema";
import { createAuth } from "../auth";
import type { Env, Variables } from "../db";
import { getAvailablePickupSlots } from "../lib/pickup-slots";
import { CheckoutPage } from "../pages/CheckoutPage";
import { OrderConfirmationPage } from "../pages/OrderConfirmationPage";

export const checkoutRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

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
      pricePerKg: products.pricePerKg,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.productId))
    .where(eq(cartItems.sessionId, sessionId));

  if (rows.length === 0) {
    return c.redirect("/cart");
  }

  const total = rows.reduce((sum, r) => sum + r.pricePerKg * r.quantityKg, 0);
  const slots = getAvailablePickupSlots();

  return c.html(<CheckoutPage items={rows} total={total} slots={slots} />);
});

checkoutRoutes.post("/checkout", async (c) => {
  const customerId = await getLoggedInCustomerId(c);
  if (!customerId) {
    return c.redirect("/login?redirect=/checkout");
  }

  const db = getDB(c.env);
  const sessionId = c.get("sessionId");
  const body = await c.req.parseBody();

  // NOTE: form field must be name="pickupSlot" in CheckoutPage.tsx —
  // this matches the existing orders.pickupSlot column from Phase 2,
  // not a new duplicate column.
  const pickupSlot = String(body.pickupSlot || "");
  const customerName = String(body.customerName || "");
  const customerPhone = String(body.customerPhone || "");

  if (!pickupSlot || !customerName || !customerPhone) {
    return c.text("Please fill in all required fields.", 400);
  }

  const cartRows = await db
    .select({
      productId: cartItems.productId,
      quantityKg: cartItems.quantityKg,
      pricePerKg: products.pricePerKg,
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

  const totalAmount = cartRows.reduce(
    (sum, row) => sum + row.pricePerKg * row.quantityKg,
    0
  );

  const [insertedOrder] = await db
    .insert(orders)
    .values({
      customerId,
      status: "Reserved", // matches your real enum default, not "placed"
      pickupSlot,
      customerName,
      customerPhone,
      totalAmount,
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

  // Cart cleared once the order is placed.
  await db.delete(cartItems).where(eq(cartItems.sessionId, sessionId));

  return c.html(
    <OrderConfirmationPage orderId={insertedOrder.orderId} pickupSlot={pickupSlot} />
  );
});