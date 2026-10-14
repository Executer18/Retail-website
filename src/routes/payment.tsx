// src/routes/payment.tsx
//
// GET  /checkout/pay/:orderId          — creates (once) the Razorpay order, shows the pay page
// POST /checkout/pay/:orderId/verify   — browser callback: checks the signature, marks the order paid
// POST /checkout/pay/:orderId/cancel   — customer closed the Razorpay window: order -> Cancelled
// POST /webhooks/razorpay              — Razorpay -> us; the reliable source of truth for "paid"
//
// Amounts always come from orders.totalAmount in the database — never from the browser.

import { Hono } from 'hono'
import { and, eq, isNull } from 'drizzle-orm'
import { getDB } from '../db'
import { orders, orderItems, products, customers } from '../db/schema'
import type { Env, Variables } from '../db'
import { createAuth } from '../auth'
import {
  createRazorpayOrder,
  razorpayConfigured,
  razorpayTestMode,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from '../lib/razorpay'
import { PAYMENT_WINDOW_MINUTES, expireStaleOnlineOrders, markOrderPaid } from '../lib/order-payments'
import { PaymentPage } from '../pages/PaymentPage'

export const paymentRoutes = new Hono<{ Bindings: Env; Variables: Variables }>()

// Logged-in customer (id + email), or null. Never creates a customers row —
// anyone who has an order already has one.
async function getCustomer(c: any): Promise<{ customerId: number; email: string } | null> {
  const session = await createAuth(c.env).api.getSession({ headers: c.req.raw.headers })
  if (!session?.user) return null

  const db = getDB(c.env)
  const [row] = await db.select().from(customers).where(eq(customers.authUserId, session.user.id))
  return row ? { customerId: row.customerId, email: session.user.email } : null
}

// Same-site requests only (guard for cookie-authenticated POSTs).
function sameOrigin(c: any): boolean {
  const origin = c.req.header('origin')
  if (!origin) return true
  try {
    return new URL(origin).host === new URL(c.req.url).host
  } catch {
    return false
  }
}

async function findOwnedOrder(c: any, customerId: number, orderId: number) {
  const db = getDB(c.env)
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.orderId, orderId), eq(orders.customerId, customerId)))
  return order ?? null
}

// ---------- Pay page ----------
paymentRoutes.get('/checkout/pay/:orderId', async (c) => {
  const orderId = Number(c.req.param('orderId'))
  if (!Number.isInteger(orderId)) return c.notFound()

  const me = await getCustomer(c)
  if (!me) return c.redirect('/login?redirect=' + encodeURIComponent(`/checkout/pay/${orderId}`))

  const db = getDB(c.env)
  await expireStaleOnlineOrders(db, me.customerId)

  const order = await findOwnedOrder(c, me.customerId, orderId)
  if (!order) return c.notFound()

  // Only an online, unpaid, still-open order can be paid.
  if (order.paymentMethod !== 'online') return c.redirect(`/orders/${orderId}`)
  if (order.paymentStatus === 'paid') return c.redirect(`/order-confirmed/${orderId}`)
  if (order.status === 'Cancelled') return c.redirect(`/orders/${orderId}`)

  const items = await db
    .select({
      name: products.itemName,
      quantityKg: orderItems.weightKg,
      pricePerKg: orderItems.pricePerKgAtPurchase,
      imageUrl: products.imageUrl,
    })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.productId))
    .where(eq(orderItems.orderId, orderId))
    .orderBy(orderItems.itemId)

  let razorpayOrderId = order.razorpayOrderId
  let error: string | null = null

  if (!razorpayConfigured(c.env)) {
    error = 'Online payments are not set up yet. Please go back and choose pay at counter.'
  } else if (!razorpayOrderId) {
    // First visit: create the Razorpay order with the amount from OUR database, and remember its id.
    const created = await createRazorpayOrder(c.env, {
      amountPaise: Math.round(order.totalAmount * 100),
      receipt: `order_${order.orderId}`,
      notes: { order_id: String(order.orderId) },
    })

    if (!created) {
      error = 'We could not start the payment. Please try again in a moment.'
    } else {
      await db
        .update(orders)
        .set({ razorpayOrderId: created.id })
        .where(and(eq(orders.orderId, order.orderId), isNull(orders.razorpayOrderId)))

      // If two tabs raced, keep whichever id got stored first.
      const [fresh] = await db
        .select({ id: orders.razorpayOrderId })
        .from(orders)
        .where(eq(orders.orderId, order.orderId))
      razorpayOrderId = fresh?.id ?? created.id
    }
  }

  return c.html(
    <PaymentPage
      order={{
        orderId: order.orderId,
        totalAmount: order.totalAmount,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        email: me.email,
      }}
      items={items}
      razorpay={
        razorpayOrderId && !error
          ? {
              keyId: c.env.RAZORPAY_KEY_ID,
              razorpayOrderId,
              amountPaise: Math.round(order.totalAmount * 100),
            }
          : null
      }
      error={error}
      testMode={razorpayTestMode(c.env)}
      windowMinutes={PAYMENT_WINDOW_MINUTES}
    />
  )
})

// ---------- Browser callback after a successful payment ----------
paymentRoutes.post('/checkout/pay/:orderId/verify', async (c) => {
  if (!sameOrigin(c)) return c.json({ message: 'Request blocked.' }, 403)

  const me = await getCustomer(c)
  if (!me) return c.json({ message: 'Please log in again.' }, 401)

  const orderId = Number(c.req.param('orderId'))
  if (!Number.isInteger(orderId)) return c.json({ message: 'Order not found.' }, 404)

  let body: any
  try {
    body = await c.req.json()
  } catch {
    return c.json({ message: 'Invalid request.' }, 400)
  }
  const paymentId = String(body?.razorpay_payment_id ?? '')
  const signature = String(body?.razorpay_signature ?? '')
  if (!/^pay_[A-Za-z0-9]{6,40}$/.test(paymentId) || !signature) {
    return c.json({ message: 'Invalid payment details.' }, 400)
  }

  const order = await findOwnedOrder(c, me.customerId, orderId)
  if (!order || order.paymentMethod !== 'online' || !order.razorpayOrderId) {
    return c.json({ message: 'Order not found.' }, 404)
  }

  // Already confirmed (e.g. the webhook got there first) — nothing more to do.
  if (order.paymentStatus === 'paid') {
    return c.json({ ok: true, redirect: `/order-confirmed/${orderId}` })
  }

  // The Razorpay order id comes from OUR database, so a payment made for another order can't be replayed here.
  const valid = await verifyPaymentSignature(c.env, order.razorpayOrderId, paymentId, signature)
  if (!valid) {
    console.error('[razorpay] bad signature for order', orderId)
    return c.json({ message: 'Payment could not be verified.' }, 400)
  }

  await markOrderPaid(getDB(c.env), orderId, paymentId)
  return c.json({ ok: true, redirect: `/order-confirmed/${orderId}` })
})

// ---------- Customer closed the Razorpay window ----------
paymentRoutes.post('/checkout/pay/:orderId/cancel', async (c) => {
  if (!sameOrigin(c)) return c.json({ message: 'Request blocked.' }, 403)

  const me = await getCustomer(c)
  if (!me) return c.json({ message: 'Please log in again.' }, 401)

  const orderId = Number(c.req.param('orderId'))
  if (!Number.isInteger(orderId)) return c.json({ message: 'Order not found.' }, 404)

  // Only an unpaid online order that is still open can be cancelled this way.
  // The cart is deliberately left alone.
  await getDB(c.env)
    .update(orders)
    .set({ status: 'Cancelled' })
    .where(
      and(
        eq(orders.orderId, orderId),
        eq(orders.customerId, me.customerId),
        eq(orders.paymentMethod, 'online'),
        eq(orders.paymentStatus, 'unpaid'),
        eq(orders.status, 'Reserved')
      )
    )

  return c.json({ ok: true })
})

// ---------- Razorpay webhook (source of truth) ----------
// Set up in Razorpay Dashboard (Test mode) -> Settings -> Webhooks:
//   URL:    https://<your-worker>/webhooks/razorpay
//   Events: payment.captured, order.paid
//   Secret: the same value as RAZORPAY_WEBHOOK_SECRET
paymentRoutes.post('/webhooks/razorpay', async (c) => {
  // The signature is computed over the exact raw body, so read it as text first.
  const rawBody = await c.req.text()
  const signature = c.req.header('x-razorpay-signature') ?? ''

  if (!(await verifyWebhookSignature(c.env, rawBody, signature))) {
    return c.json({ message: 'Invalid signature' }, 400)
  }

  let event: any
  try {
    event = JSON.parse(rawBody)
  } catch {
    return c.json({ message: 'Bad payload' }, 400)
  }

  // Everything else (payment.failed, refunds, ...) is acknowledged and ignored.
  if (event?.event !== 'payment.captured' && event?.event !== 'order.paid') {
    return c.json({ ok: true, ignored: event?.event ?? null })
  }

  const payment = event?.payload?.payment?.entity
  if (!payment?.id || !payment?.order_id || payment.status !== 'captured') {
    return c.json({ ok: true, ignored: 'not a captured payment' })
  }

  const db = getDB(c.env)
  const [order] = await db.select().from(orders).where(eq(orders.razorpayOrderId, String(payment.order_id)))
  if (!order) {
    console.error('[razorpay webhook] no order for', payment.order_id)
    return c.json({ ok: true, ignored: 'unknown order' })
  }

  // The captured amount must be exactly what we asked for.
  if (payment.currency !== 'INR' || Number(payment.amount) !== Math.round(order.totalAmount * 100)) {
    console.error('[razorpay webhook] amount mismatch for order', order.orderId, payment.amount, payment.currency)
    return c.json({ ok: true, ignored: 'amount mismatch' })
  }

  // Idempotent: a repeat delivery (or the browser verify already ran) changes nothing.
  // A database error here throws -> 500 -> Razorpay retries the webhook later.
  await markOrderPaid(db, order.orderId, String(payment.id))
  return c.json({ ok: true })
})