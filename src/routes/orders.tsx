import { Hono } from 'hono'
import { eq, and, desc, asc } from 'drizzle-orm'
import { getDB } from '../db'
import { orders, orderItems, products, customers } from '../db/schema'
import type { Env, Variables } from '../db'
import { createAuth } from '../auth'
import { PAYMENT_WINDOW_MINUTES, expireStaleOnlineOrders } from '../lib/order-payments'
import { OrderHistoryPage, type OrderCard } from '../pages/OrderHistoryPage'
import { OrderDetailPage } from '../pages/OrderDetailPage'
import { redirect } from 'react-router-dom';

export const orderRoutes = new Hono<{ Bindings: Env; Variables: Variables }>()

const round2 = (n: number) => Math.round(n * 100) / 100

// Tells "not logged in" apart from "logged in but never reached checkout yet".
// Like before, this does NOT create a customers row — a logged-in user with no
// customer record simply has no orders, so they get the empty state instead of
// being bounced to /login.
async function getAuthState(c: any): Promise<{ loggedIn: boolean; customerId: number | null }> {
  const session = await createAuth(c.env).api.getSession({ headers: c.req.raw.headers })

  if (!session?.user) {
    return { loggedIn: false, customerId: null }
  }

  const db = getDB(c.env)
  const [existingCustomer] = await db
    .select()
    .from(customers)
    .where(eq(customers.authUserId, session.user.id))

  return { loggedIn: true, customerId: existingCustomer ? existingCustomer.customerId : null }
}

orderRoutes.get('/orders', async (c) => {
  const { loggedIn, customerId } = await getAuthState(c)
  if (!loggedIn) {
    return c.redirect('/login?redirect=/orders')
  }
  if (!customerId) {
    return c.html(<OrderHistoryPage orders={[]} />)
  }

  const db = getDB(c.env)
  await expireStaleOnlineOrders(db, customerId)

  // One query: every order of this customer with its lines + product image.
  // leftJoin so an order with no lines still shows up.
  const rows = await db
    .select({
      orderId: orders.orderId,
      status: orders.status,
      pickupSlot: orders.pickupSlot,
      totalAmount: orders.totalAmount,
      paymentMethod: orders.paymentMethod,
      paymentStatus: orders.paymentStatus,
      itemId: orderItems.itemId,
      name: products.itemName,
      imageUrl: products.imageUrl,
    })
    .from(orders)
    .leftJoin(orderItems, eq(orderItems.orderId, orders.orderId))
    .leftJoin(products, eq(orderItems.productId, products.productId))
    .where(eq(orders.customerId, customerId))
    .orderBy(desc(orders.orderId), asc(orderItems.itemId))

  // Group lines under their order (Map keeps the newest-first order).
  const byOrder = new Map<number, OrderCard>()
  for (const r of rows) {
    let card = byOrder.get(r.orderId)
    if (!card) {
      card = {
        orderId: r.orderId,
        status: r.status,
        pickupSlot: r.pickupSlot,
        totalAmount: r.totalAmount,
        paymentMethod: r.paymentMethod,
        paymentStatus: r.paymentStatus,
        itemCount: 0,
        items: [],
      }
      byOrder.set(r.orderId, card)
    }
    if (r.itemId !== null) {
      card.itemCount++
      if (card.items.length < 4) {
        card.items.push({ name: r.name ?? '', imageUrl: r.imageUrl })
      }
    }
  }

  return c.html(<OrderHistoryPage orders={Array.from(byOrder.values())} />)
})

orderRoutes.get('/orders/:id', async (c) => {
  const { loggedIn, customerId } = await getAuthState(c)
  if (!loggedIn) {
    return c.redirect('/login?redirect=/orders')
  }
  if (!customerId) {
    return c.notFound()
  }

  const db = getDB(c.env)
  const orderId = parseInt(c.req.param('id'), 10)
  if (Number.isNaN(orderId)) {
    return c.notFound()
  }

  await expireStaleOnlineOrders(db, customerId)

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.orderId, orderId), eq(orders.customerId, customerId)))

  if (!order) {
    return c.notFound()
  }

  const items = await db
    .select({
      productId: orderItems.productId,
      quantityKg: orderItems.weightKg,
      pricePerKgAtPurchase: orderItems.pricePerKgAtPurchase,
      name: products.itemName,
      imageUrl: products.imageUrl,
      discount: products.discount,
    })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.productId))
    .where(eq(orderItems.orderId, orderId))
    .orderBy(asc(orderItems.itemId))

  // MRP = price paid per kg + the product's discount (price 100 + discount 40 -> MRP 140).
  // Order rows only store the price paid, so the discount comes from the product as it is now.
  let mrp = 0
  let paidForItems = 0
  for (const it of items) {
    mrp += (it.pricePerKgAtPurchase + Math.max(0, it.discount ?? 0)) * it.quantityKg
    paidForItems += it.pricePerKgAtPurchase * it.quantityKg
  }
  const payment = { mrp: round2(mrp), save: Math.max(0, round2(mrp - paidForItems)) }

  return c.html(
    <OrderDetailPage
      order={{
        orderId: order.orderId,
        status: order.status,
        pickupSlot: order.pickupSlot,
        orderDate: order.orderDate,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        razorpayPaymentId: order.razorpayPaymentId,
      }}
      items={items}
      payment={payment}
      windowMinutes={PAYMENT_WINDOW_MINUTES}
    />
  )
}) 