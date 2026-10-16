// src/lib/order-status.ts
//
// The order status flow used by the admin screen:
//
//   Reserved -> Confirmed -> Preparing -> Ready -> Collected      (one step at a time)
//   any of these (except Collected) -> Cancelled                   (see cancelOrderAsAdmin)
//
// Rules:
//  - An online order that is not paid yet can't move forward — the money hasn't arrived.
//  - Collecting a counter order that is still unpaid marks it paid (cash taken at the counter).
//  - The update only applies if the order is still in the status the admin saw, so two
//    people clicking at once (or a double click) can't skip a step.

import { and, eq } from 'drizzle-orm'
import type { getDB } from '../db'
import { orders } from '../db/schema'

type DB = ReturnType<typeof getDB>

export const STATUS_FLOW = ['Reserved', 'Confirmed', 'Preparing', 'Ready', 'Collected'] as const
export type FlowStatus = (typeof STATUS_FLOW)[number]

export function nextStatus(status: string): FlowStatus | null {
  const i = STATUS_FLOW.indexOf(status as FlowStatus)
  return i >= 0 && i < STATUS_FLOW.length - 1 ? STATUS_FLOW[i + 1] : null
}

export type AdvanceResult =
  | { ok: true; order: typeof orders.$inferSelect }
  | { ok: false; message: string }

export async function advanceOrder(db: DB, orderId: number, to: string): Promise<AdvanceResult> {
  const [order] = await db.select().from(orders).where(eq(orders.orderId, orderId))
  if (!order) return { ok: false, message: 'Order not found.' }

  if (order.status === 'Cancelled') return { ok: false, message: 'This order is cancelled.' }
  if (order.status === 'Collected') return { ok: false, message: 'This order is already collected.' }

  if (nextStatus(order.status) !== to) {
    return { ok: false, message: `The order is now ${order.status}. Refresh and try again.` }
  }
  if (order.paymentMethod === 'online' && order.paymentStatus !== 'paid') {
    return { ok: false, message: 'The online payment has not been received yet.' }
  }

  const collectingCounterOrder = to === 'Collected' && order.paymentMethod === 'counter' && order.paymentStatus === 'unpaid'

  const updated = await db
    .update(orders)
    .set({
      status: to as FlowStatus,
      ...(collectingCounterOrder ? { paymentStatus: 'paid' as const } : {}),
    })
    .where(and(eq(orders.orderId, orderId), eq(orders.status, order.status)))
    .returning()

  if (updated.length === 0) return { ok: false, message: 'The order changed. Refresh and try again.' }
  return { ok: true, order: updated[0] }
}