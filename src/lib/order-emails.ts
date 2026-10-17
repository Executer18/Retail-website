// src/lib/order-emails.ts
//
// Automatic emails to the customer's account email (user.email):
//   - sendOrderBookedEmail: when an order is booked
//       counter order -> right after checkout
//       online order  -> once the payment is confirmed (verify route / webhook)
//   - sendOrderReadyEmail: when the admin moves an order to "Ready"
//
// Sent through Resend, the same way auth.ts sends the password-reset email.
// An email problem is only logged — it never breaks checkout or an admin action.
// Without RESEND_API_KEY nothing is sent (the subject is logged instead), which is handy locally.
//
// NOTE: Resend's shared sender (onboarding@resend.dev) only delivers to the email address of
// your own Resend account. To email real customers, verify a domain in Resend and set EMAIL_FROM,
// e.g.  EMAIL_FROM = "Atta Chakki <orders@yourdomain.com>"

import { asc, eq } from 'drizzle-orm'
import type { Env, getDB } from '../db'
import { customers, orderItems, orders, products } from '../db/schema'
import { user } from '../../auth-schema'
import { STORE, hoursLabel, rupee } from './checkout-ui'
import { pickupParts } from './orders-ui'

type DB = ReturnType<typeof getDB>

// Runs a promise without making the visitor wait for it. On Workers it is kept alive with
// waitUntil; anywhere else (local Node) it just keeps running. Errors are logged, not thrown.
export function runInBackground(c: any, work: Promise<unknown>): void {
  const safe = work.catch((err) => console.error('[background task failed]', err))
  try {
    c.executionCtx.waitUntil(safe)
  } catch {
    // no executionCtx here — the promise still runs
  }
}

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

async function loadOrderForEmail(db: DB, orderId: number) {
  const [row] = await db
    .select({ order: orders, email: user.email })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.customerId))
    .innerJoin(user, eq(customers.authUserId, user.id))
    .where(eq(orders.orderId, orderId))
  if (!row) return null

  const items = await db
    .select({
      name: products.itemName,
      quantityKg: orderItems.weightKg,
      pricePerKg: orderItems.pricePerKgAtPurchase,
    })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.productId))
    .where(eq(orderItems.orderId, orderId))
    .orderBy(asc(orderItems.itemId))

  return { order: row.order, email: row.email, items }
}

async function sendEmail(env: Env, to: string, subject: string, html: string): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.log(`[email skipped - no RESEND_API_KEY] to ${to}: ${subject}`)
    return
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM || 'Atta Chakki <orders@surveyspeck.com>',
      to: [to],
      subject,
      html,
    }),
  })
  if (!res.ok) console.error('[email] Resend rejected the email', res.status, await res.text())
}

function shell(content: string): string {
  return `<div style="font-family:system-ui,'Segoe UI',Arial,sans-serif;background:#f6f1ea;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5ded5">
    <div style="background:#e81e57;color:#ffffff;padding:18px 22px;font-size:18px;font-weight:700">${esc(STORE.name)}</div>
    <div style="padding:22px;color:#453f3a;font-size:14px;line-height:1.6">${content}</div>
    <div style="padding:14px 22px;background:#faf7f2;color:#8a8078;font-size:12px;line-height:1.5">
      ${esc(STORE.name)}, ${esc(STORE.line1)} ${esc(STORE.line2)}<br>${esc(hoursLabel())}
    </div>
  </div></div>`
}

function itemsTable(items: { name: string; quantityKg: number; pricePerKg: number }[], total: number): string {
  const rows = items
    .map(
      (i) => `<tr>
        <td style="padding:6px 0;border-bottom:1px solid #f0ebe3">${esc(i.name)} <span style="color:#8a8078">× ${esc(i.quantityKg)} kg</span></td>
        <td style="padding:6px 0;border-bottom:1px solid #f0ebe3;text-align:right">${esc(rupee(i.pricePerKg * i.quantityKg))}</td>
      </tr>`
    )
    .join('')
  return `<table style="width:100%;border-collapse:collapse;margin:14px 0">${rows}
    <tr><td style="padding:10px 0;font-weight:700;color:#211b17">Total</td>
        <td style="padding:10px 0;text-align:right;font-weight:700;color:#e81e57">${esc(rupee(total))}</td></tr>
  </table>`
}

function pickupLine(slot: string): string {
  const p = pickupParts(slot)
  return p ? `${p.dateLong}, ${p.time}` : slot
}

function orderLink(env: Env, orderId: number): string {
  const base = (env.BETTER_AUTH_URL || '').replace(/\/+$/, '')
  return `${base}/orders/${orderId}`
}

// ---------------------------------------------------------------- booked

export async function sendOrderBookedEmail(env: Env, db: DB, orderId: number): Promise<void> {
  const data = await loadOrderForEmail(db, orderId)
  if (!data) return
  const { order, email, items } = data

  const paidOnline = order.paymentStatus === 'paid'
  const payLine = paidOnline
    ? `Payment of <b>${esc(rupee(order.totalAmount))}</b> received online. Thank you!`
    : `Please pay <b>${esc(rupee(order.totalAmount))}</b> at the counter when you collect your order.`

  const html = shell(`
    <p style="margin:0 0 10px">Hi ${esc(order.customerName)},</p>
    <p style="margin:0 0 10px">Your order <b>#${order.orderId}</b> is booked. We'll have it fresh-ground and packed for your slot.</p>
    <p style="margin:0 0 4px"><b>Pickup:</b> ${esc(pickupLine(order.pickupSlot))}</p>
    ${itemsTable(items, order.totalAmount)}
    <p style="margin:0 0 14px">${payLine}</p>
    <p style="margin:0 0 14px">We'll email you again as soon as it's ready to collect.</p>
    <p style="margin:0"><a href="${esc(orderLink(env, order.orderId))}" style="color:#e81e57;font-weight:700">View your order</a></p>
  `)

  await sendEmail(env, email, `Order #${order.orderId} booked — pickup ${pickupLine(order.pickupSlot)}`, html)
}

// ---------------------------------------------------------------- cancelled

// Sent when the admin cancels an order that had been booked.
export async function sendOrderCancelledEmail(env: Env, db: DB, orderId: number): Promise<void> {
  const data = await loadOrderForEmail(db, orderId)
  if (!data) return
  const { order, email, items } = data

  let moneyLine = 'No payment was taken for this order.'
  if (order.paymentStatus === 'paid') {
    moneyLine =
      order.paymentMethod === 'online'
        ? `Your online payment of <b>${esc(rupee(order.totalAmount))}</b> will be refunded to your original payment method. We'll email you once the refund is processed.`
        : `You paid <b>${esc(rupee(order.totalAmount))}</b> at the counter. Please contact the store to get your refund.`
  }

  const html = shell(`
    <p style="margin:0 0 10px">Hi ${esc(order.customerName)},</p>
    <p style="margin:0 0 10px;font-size:16px"><b>Your order #${order.orderId} has been cancelled.</b></p>
    <p style="margin:0 0 4px"><b>Pickup was:</b> ${esc(pickupLine(order.pickupSlot))}</p>
    ${itemsTable(items, order.totalAmount)}
    <p style="margin:0 0 14px">${moneyLine}</p>
    <p style="margin:0 0 14px">If you didn't expect this, please contact the store.</p>
    <p style="margin:0"><a href="${esc(orderLink(env, order.orderId))}" style="color:#e81e57;font-weight:700">View your order</a></p>
  `)

  await sendEmail(env, email, `Your order #${order.orderId} has been cancelled`, html)
}

// ---------------------------------------------------------------- refunded

// Sent when the admin marks a (cancelled) order as refunded.
export async function sendOrderRefundedEmail(env: Env, db: DB, orderId: number): Promise<void> {
  const data = await loadOrderForEmail(db, orderId)
  if (!data) return
  const { order, email, items } = data

  const where =
    order.paymentMethod === 'online'
      ? 'to your original payment method. Depending on your bank, it can take a few working days to show up'
      : 'at the store'

  const html = shell(`
    <p style="margin:0 0 10px">Hi ${esc(order.customerName)},</p>
    <p style="margin:0 0 10px;font-size:16px"><b>Your refund of ${esc(rupee(order.totalAmount))} is done.</b></p>
    <p style="margin:0 0 10px">Your order <b>#${order.orderId}</b> was cancelled and <b>${esc(rupee(order.totalAmount))}</b> has been refunded ${where}.</p>
    ${itemsTable(items, order.totalAmount)}
    <p style="margin:0"><a href="${esc(orderLink(env, order.orderId))}" style="color:#e81e57;font-weight:700">View your order</a></p>
  `)

  await sendEmail(env, email, `Refund of ${rupee(order.totalAmount)} for order #${order.orderId}`, html)
}

// ---------------------------------------------------------------- ready

export async function sendOrderReadyEmail(env: Env, db: DB, orderId: number): Promise<void> {
  const data = await loadOrderForEmail(db, orderId)
  if (!data) return
  const { order, email, items } = data

  const dueLine =
    order.paymentStatus === 'paid'
      ? 'Your order is already paid for.'
      : `Please pay <b>${esc(rupee(order.totalAmount))}</b> at the counter.`

  const html = shell(`
    <p style="margin:0 0 10px">Hi ${esc(order.customerName)},</p>
    <p style="margin:0 0 10px;font-size:16px"><b>Your order #${order.orderId} is ready to collect! 🎉</b></p>
    <p style="margin:0 0 4px"><b>Pickup slot:</b> ${esc(pickupLine(order.pickupSlot))}</p>
    ${itemsTable(items, order.totalAmount)}
    <p style="margin:0 0 14px">${dueLine} Show your order number <b>#${order.orderId}</b> at the counter.</p>
    <p style="margin:0"><a href="${esc(orderLink(env, order.orderId))}" style="color:#e81e57;font-weight:700">View your order</a></p>
  `)

  await sendEmail(env, email, `Your order #${order.orderId} is ready to collect`, html)
}