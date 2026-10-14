// src/lib/order-payments.ts
//
// Database helpers for the online-payment life cycle of an order.
//
//   created (online, unpaid, Reserved)
//     ├─ payment succeeds  -> markOrderPaid()                 (verify route OR webhook, whichever is first)
//     ├─ customer closes the Razorpay window -> cancel route  (status Cancelled)
//     └─ nothing happens for 15 minutes -> expireStaleOnlineOrders()  (status Cancelled)
//
// The cart is NOT touched when an online order is created; it is only cleared
// when the payment succeeds (see markOrderPaid), so a cancelled payment never
// costs the customer their cart.

import { and, eq, inArray, sql } from 'drizzle-orm'
import type { getDB } from '../db'
import { orders, orderItems, cartItems } from '../db/schema'

type DB = ReturnType<typeof getDB>

export const PAYMENT_WINDOW_MINUTES = 15

// Online orders that were never paid within the window become Cancelled.
// Called whenever a page reads a customer's orders, so no cron job is needed.
// orderDate is CURRENT_TIMESTAMP (UTC), the same clock as datetime('now').
export async function expireStaleOnlineOrders(db: DB, customerId: number): Promise<void> {
  await db
    .update(orders)
    .set({ status: 'Cancelled' })
    .where(
      and(
        eq(orders.customerId, customerId),
        eq(orders.paymentMethod, 'online'),
        eq(orders.paymentStatus, 'unpaid'),
        eq(orders.status, 'Reserved'),
        sql`${orders.orderDate} < datetime('now', ${`-${PAYMENT_WINDOW_MINUTES} minutes`})`
      )
    )
}

// Starting a new checkout supersedes any online order the customer left waiting for payment.
export async function cancelUnpaidOnlineOrders(db: DB, customerId: number): Promise<void> {
  await db
    .update(orders)
    .set({ status: 'Cancelled' })
    .where(
      and(
        eq(orders.customerId, customerId),
        eq(orders.paymentMethod, 'online'),
        eq(orders.paymentStatus, 'unpaid'),
        eq(orders.status, 'Reserved')
      )
    )
}

// Marks an order paid. Safe to call twice (browser verify + webhook): only the call that
// actually flips unpaid -> paid returns true and clears the cart.
// "Paid always wins": if the order was cancelled while the payment was still in flight,
// it goes back to Reserved so the customer's money is never attached to a cancelled order.
export async function markOrderPaid(db: DB, orderId: number, razorpayPaymentId: string): Promise<boolean> {
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

  // Payment is in: remove the bought products from the cart this order came from.
  const sessionId = updated[0].cartSessionId
  if (sessionId) {
    const lines = await db
      .select({ productId: orderItems.productId })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId))
    const productIds = lines.map((l) => l.productId)
    if (productIds.length > 0) {
      await db
        .delete(cartItems)
        .where(and(eq(cartItems.sessionId, sessionId), inArray(cartItems.productId, productIds)))
    }
  }

  return true
}