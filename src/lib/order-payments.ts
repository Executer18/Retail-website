// src/lib/order-payments.ts
//
// Database helpers for an order's payment life cycle AND its stock.
//
// Stock rule: Products.inStockKg is reduced when an order is BOOKED (reserveStock,
// at checkout) and given back when the order is CANCELLED (restoreOrderStock) — by the
// customer closing the Razorpay window, the 15-minute expiry, a newer checkout, or
// the admin. A cancellation only restores stock for the order that really flipped to
// Cancelled, so it can never be restored twice.
//
//   online order:  created (unpaid, Reserved)
//     ├─ payment succeeds  -> markOrderPaid()                  (verify route OR webhook, first one wins)
//     ├─ customer closes the Razorpay window -> cancel route   (Cancelled, stock restored)
//     └─ nothing for 15 minutes -> expireStaleOnlineOrders()    (Cancelled, stock restored)
//
// The cart is NOT touched when an online order is created; it is only cleared
// when the payment succeeds (see markOrderPaid), so a cancelled payment never
// costs the customer their cart.

import { and, eq, gte, inArray, notInArray, sql, type SQL } from 'drizzle-orm'
import type { getDB } from '../db'
import { orders, orderItems, cartItems, products } from '../db/schema'

type DB = ReturnType<typeof getDB>

export const PAYMENT_WINDOW_MINUTES = 15

export type StockLine = { productId: number; quantityKg: number }

// ---------------------------------------------------------------- stock

// Takes stock for every line, or for none of them. Each product is reduced only if enough
// is left (a single conditional UPDATE), so two customers can't both book the last kilos.
export async function reserveStock(
  db: DB,
  lines: StockLine[]
): Promise<{ ok: true } | { ok: false; productId: number }> {
  const taken: StockLine[] = []

  for (const line of lines) {
    const updated = await db
      .update(products)
      .set({ inStockKg: sql`${products.inStockKg} - ${line.quantityKg}` })
      .where(and(eq(products.productId, line.productId), gte(products.inStockKg, line.quantityKg)))
      .returning({ id: products.productId })

    if (updated.length === 0) {
      await releaseStock(db, taken) // give back what this checkout already took
      return { ok: false, productId: line.productId }
    }
    taken.push(line)
  }

  return { ok: true }
}

export async function releaseStock(db: DB, lines: StockLine[]): Promise<void> {
  for (const line of lines) {
    await db
      .update(products)
      .set({ inStockKg: sql`${products.inStockKg} + ${line.quantityKg}` })
      .where(eq(products.productId, line.productId))
  }
}

async function orderLines(db: DB, orderId: number): Promise<StockLine[]> {
  const rows = await db
    .select({ productId: orderItems.productId, quantityKg: orderItems.weightKg })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))
  return rows
}

// Puts an order's kilos back on the shelf.
export async function restoreOrderStock(db: DB, orderId: number): Promise<void> {
  await releaseStock(db, await orderLines(db, orderId))
}

// A cancelled order that gets paid after all ("paid always wins") needs its stock again.
// It never goes below zero: the customer already paid, so the order stands.
async function reReserveOrderStock(db: DB, orderId: number): Promise<void> {
  for (const line of await orderLines(db, orderId)) {
    await db
      .update(products)
      .set({ inStockKg: sql`max(0, ${products.inStockKg} - ${line.quantityKg})` })
      .where(eq(products.productId, line.productId))
  }
}

// ---------------------------------------------------------------- cancelling

// Flips matching orders to Cancelled and restores stock for exactly those orders.
async function cancelOrdersWhere(db: DB, condition: SQL | undefined): Promise<number[]> {
  const cancelled = await db
    .update(orders)
    .set({ status: 'Cancelled' })
    .where(condition)
    .returning({ orderId: orders.orderId })

  for (const o of cancelled) await restoreOrderStock(db, o.orderId)
  return cancelled.map((o) => o.orderId)
}

// Online orders that were never paid within the window become Cancelled.
// Called whenever a page reads orders (a customer's own, or all of them for the admin),
// so no cron job is needed. orderDate is CURRENT_TIMESTAMP (UTC) = datetime('now').
export async function expireStaleOnlineOrders(db: DB, customerId?: number): Promise<void> {
  await cancelOrdersWhere(
    db,
    and(
      customerId === undefined ? undefined : eq(orders.customerId, customerId),
      eq(orders.paymentMethod, 'online'),
      eq(orders.paymentStatus, 'unpaid'),
      eq(orders.status, 'Reserved'),
      sql`${orders.orderDate} < datetime('now', ${`-${PAYMENT_WINDOW_MINUTES} minutes`})`
    )
  )
}

// Starting a new checkout replaces any online order the customer left waiting for payment.
export async function cancelUnpaidOnlineOrders(db: DB, customerId: number): Promise<void> {
  await cancelOrdersWhere(
    db,
    and(
      eq(orders.customerId, customerId),
      eq(orders.paymentMethod, 'online'),
      eq(orders.paymentStatus, 'unpaid'),
      eq(orders.status, 'Reserved')
    )
  )
}

// Customer closed the Razorpay window: cancel that one unpaid online order.
export async function cancelOwnUnpaidOnlineOrder(db: DB, orderId: number, customerId: number): Promise<boolean> {
  const done = await cancelOrdersWhere(
    db,
    and(
      eq(orders.orderId, orderId),
      eq(orders.customerId, customerId),
      eq(orders.paymentMethod, 'online'),
      eq(orders.paymentStatus, 'unpaid'),
      eq(orders.status, 'Reserved')
    )
  )
  return done.length > 0
}

// Admin cancel: any order that is not already Collected or Cancelled.
export async function cancelOrderAsAdmin(db: DB, orderId: number): Promise<boolean> {
  const done = await cancelOrdersWhere(
    db,
    and(eq(orders.orderId, orderId), notInArray(orders.status, ['Cancelled', 'Collected']))
  )
  return done.length > 0
}

// ---------------------------------------------------------------- paying

// Marks an order paid. Safe to call twice (browser verify + webhook): only the call that
// actually flips unpaid -> paid returns true — use that to send the "booked" email once.
// "Paid always wins": if the order was cancelled while the payment was still in flight,
// it goes back to Reserved (and takes its stock again) so the money is never attached to a
// cancelled order.
export async function markOrderPaid(db: DB, orderId: number, razorpayPaymentId: string): Promise<boolean> {
  const [before] = await db.select({ status: orders.status }).from(orders).where(eq(orders.orderId, orderId))

  const updated = await db
    .update(orders)
    .set({
      paymentStatus: 'paid',
      razorpayPaymentId,
      status: sql`CASE WHEN ${orders.status} = 'Cancelled' THEN 'Reserved' ELSE ${orders.status} END`,
    })
    .where(and(eq(orders.orderId, orderId), eq(orders.paymentStatus, 'unpaid')))
    .returning({ cartSessionId: orders.cartSessionId })

  if (updated.length === 0) return false

  if (before?.status === 'Cancelled') await reReserveOrderStock(db, orderId)

  // Payment is in: remove the bought products from the cart this order came from.
  const sessionId = updated[0].cartSessionId
  if (sessionId) {
    const lines = await orderLines(db, orderId)
    const productIds = lines.map((l) => l.productId)
    if (productIds.length > 0) {
      await db
        .delete(cartItems)
        .where(and(eq(cartItems.sessionId, sessionId), inArray(cartItems.productId, productIds)))
    }
  }

  return true
}

// Admin: cash (or UPI) received at the counter for a counter order.
export async function markCounterOrderPaid(db: DB, orderId: number): Promise<boolean> {
  const updated = await db
    .update(orders)
    .set({ paymentStatus: 'paid' })
    .where(
      and(
        eq(orders.orderId, orderId),
        eq(orders.paymentMethod, 'counter'),
        eq(orders.paymentStatus, 'unpaid'),
        notInArray(orders.status, ['Cancelled'])
      )
    )
    .returning({ id: orders.orderId })
  return updated.length > 0
}

// Admin: "refund" button. Online payments are test-only, so this just records the refund —
// no Razorpay refund API call is made. The customer then sees
// "Refunded ₹X to original payment method".
// Admin: "Mark as refunded" for any PAID order — online or paid at the counter.
export async function refundPaidOrder(db: DB, orderId: number): Promise<boolean> {
  const updated = await db
    .update(orders)
    .set({ paymentStatus: 'refunded' })
    .where(and(eq(orders.orderId, orderId), eq(orders.paymentStatus, 'paid')))
    .returning({ id: orders.orderId })
  return updated.length > 0
}
