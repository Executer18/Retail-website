/** @jsxImportSource hono/jsx */
// src/pages/admin/orders.tsx
//
// GET  /admin/orders                  — all orders, newest first, filter by status / payment, search
// GET  /admin/orders/:id              — one order: customer, items, payment and the action buttons
// POST /admin/orders/:id/status       — move to the next status (Ready also emails the customer)
// POST /admin/orders/:id/mark-paid    — counter order: payment received at the counter
// POST /admin/orders/:id/cancel       — cancel (stock goes back on the shelf)
// POST /admin/orders/:id/refund       — cancelled online order: record the refund (test mode: no Razorpay call)
// POST /admin/orders/:id/cancel-refund— cancel + refund in one click (paid online orders)
//
// Mounted in index.tsx with:  app.route("/admin/orders", adminOrdersRouter)

import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { and, desc, eq, inArray, like, or, sql } from 'drizzle-orm'
import { requireAdmin } from '../../middleware/admin'
import { getDB } from '../../db'
import type { Env } from '../../db'
import { customers, orderItems, orders, products } from '../../db/schema'
import { user } from '../../../auth-schema'
import {
  cancelOrderAsAdmin,
  expireStaleOnlineOrders,
  markCounterOrderPaid,
  refundOnlineOrder,
} from '../../lib/order-payments'
import { advanceOrder, nextStatus } from '../../lib/order-status'
import { runInBackground, sendOrderReadyEmail } from '../../lib/order-emails'
import { rupee } from '../../lib/checkout-ui'
import { paymentInfo, pickupParts, pickupText, placedOnText, statusPill } from '../../lib/orders-ui'
import { AdminLayout } from './AdminLayout'

export const adminOrdersRouter = new Hono<{ Bindings: Env }>()

const STATUS_TABS = ['All', 'Reserved', 'Confirmed', 'Preparing', 'Ready', 'Collected', 'Cancelled'] as const
const PAY_FILTERS = ['unpaid', 'paid', 'refunded'] as const
const PAGE_SIZE = 20

// ---------------------------------------------------------------- small helpers

// Same-site POSTs only.
function sameOrigin(c: any): boolean {
  const origin = c.req.header('origin')
  if (!origin) return true
  try {
    return new URL(origin).host === new URL(c.req.url).host
  } catch {
    return false
  }
}

// After an action, go back to the page it came from — but only inside /admin/orders.
function safeBack(value: unknown, fallback: string): string {
  const v = String(value ?? '')
  return v.startsWith('/admin/orders') && !v.startsWith('//') ? v : fallback
}

// One-time message shown on the next admin orders page (kept in a short-lived cookie).
function flash(c: any, kind: 'success' | 'error', text: string) {
  setCookie(c, 'admin_flash', `${kind}|${text}`, { path: '/admin', maxAge: 60, httpOnly: true, sameSite: 'Lax' })
}
function takeFlash(c: any): { kind: 'success' | 'error'; text: string } | null {
  const raw = getCookie(c, 'admin_flash')
  if (!raw) return null
  deleteCookie(c, 'admin_flash', { path: '/admin' })
  const i = raw.indexOf('|')
  if (i < 0) return null
  const kind = raw.slice(0, i) === 'error' ? 'error' : 'success'
  return { kind, text: raw.slice(i + 1) }
}

function listUrl(f: { status: string; pay: string; q: string; p?: number }) {
  const sp = new URLSearchParams()
  if (f.status !== 'All') sp.set('status', f.status)
  if (f.pay !== 'all') sp.set('pay', f.pay)
  if (f.q) sp.set('q', f.q)
  if (f.p && f.p > 1) sp.set('p', String(f.p))
  const s = sp.toString()
  return '/admin/orders' + (s ? `?${s}` : '')
}

const awaitingOnline = (o: { paymentMethod: string; paymentStatus: string; status: string }) =>
  o.paymentMethod === 'online' && o.paymentStatus === 'unpaid' && o.status === 'Reserved'

function StatusBadge({ o }: { o: { status: string; paymentMethod: string; paymentStatus: string } }) {
  const pill = statusPill(o)
  return <span class={`badge badge-${pill.cls === 'pending' ? 'pending' : o.status}`}>{pill.label}</span>
}

function PaymentBadge({ o }: { o: { status: string; paymentMethod: string; paymentStatus: string } }) {
  const cls = o.paymentStatus === 'paid' ? 'paid' : o.paymentStatus === 'refunded' ? 'refunded' : 'unpaid'
  const text = o.paymentStatus === 'paid' ? 'Paid' : o.paymentStatus === 'refunded' ? 'Refunded' : 'Unpaid'
  return (
    <span>
      <span class={`badge badge-${cls}`}>{text}</span>
      <div class="muted" style="margin-top:3px">
        {o.paymentMethod === 'online' ? 'Online' : 'At counter'}
      </div>
    </span>
  )
}

// ---------------------------------------------------------------- list

adminOrdersRouter.get('/', requireAdmin, async (c) => {
  const db = getDB(c.env)
  await expireStaleOnlineOrders(db)

  const statusParam = c.req.query('status') ?? 'All'
  const status = (STATUS_TABS as readonly string[]).includes(statusParam) ? statusParam : 'All'
  const payParam = c.req.query('pay') ?? ''
  const pay = (PAY_FILTERS as readonly string[]).includes(payParam) ? payParam : 'all'
  const q = (c.req.query('q') ?? '').trim().slice(0, 60)
  const page = Math.max(1, parseInt(c.req.query('p') ?? '1', 10) || 1)

  const conditions: any[] = []
  if (status !== 'All') conditions.push(eq(orders.status, status as any))
  if (pay !== 'all') conditions.push(eq(orders.paymentStatus, pay as any))
  if (q) {
    const asId = /^#?\d+$/.test(q) ? Number(q.replace('#', '')) : null
    conditions.push(
      or(
        asId !== null ? eq(orders.orderId, asId) : undefined,
        like(orders.customerName, `%${q}%`),
        like(orders.customerPhone, `%${q}%`)
      )
    )
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined

  // Tab counts (all orders, whatever the other filters are).
  const countRows = await db
    .select({ status: orders.status, n: sql<number>`count(*)` })
    .from(orders)
    .groupBy(orders.status)
  const counts: Record<string, number> = {}
  let all = 0
  for (const r of countRows) {
    counts[r.status] = Number(r.n)
    all += Number(r.n)
  }
  counts.All = all

  const [{ n: matching }] = await db.select({ n: sql<number>`count(*)` }).from(orders).where(where)
  const totalMatching = Number(matching ?? 0)
  const pages = Math.max(1, Math.ceil(totalMatching / PAGE_SIZE))

  const rows = await db
    .select()
    .from(orders)
    .where(where)
    .orderBy(desc(orders.orderId))
    .limit(PAGE_SIZE)
    .offset((Math.min(page, pages) - 1) * PAGE_SIZE)

  // Items for the rows on this page (max 20 orders -> one small query).
  const ids = rows.map((r) => r.orderId)
  const lineRows =
    ids.length === 0
      ? []
      : await db
          .select({
            orderId: orderItems.orderId,
            name: products.itemName,
            quantityKg: orderItems.weightKg,
          })
          .from(orderItems)
          .innerJoin(products, eq(orderItems.productId, products.productId))
          .where(inArray(orderItems.orderId, ids))
  const linesByOrder = new Map<number, { name: string; quantityKg: number }[]>()
  for (const l of lineRows) {
    const list = linesByOrder.get(l.orderId) ?? []
    list.push({ name: l.name, quantityKg: l.quantityKg })
    linesByOrder.set(l.orderId, list)
  }

  const message = takeFlash(c)
  const here = new URL(c.req.url)
  const back = here.pathname + here.search
  const current = { status, pay, q }

  return c.html(
    <AdminLayout title="Orders" wide>
      <div class="header-row">
        <h1 style="margin:0">Orders</h1>
        <a href="/admin" class="btn btn-secondary btn-sm">
          ← Dashboard
        </a>
      </div>

      {message && <div class={`alert alert-${message.kind === 'error' ? 'error' : 'success'}`}>{message.text}</div>}

      <div class="tabs">
        {STATUS_TABS.map((t) => (
          <a class={`tab${status === t ? ' on' : ''}`} href={listUrl({ ...current, status: t })}>
            {t}
            <small>{counts[t] ?? 0}</small>
          </a>
        ))}
      </div>

      <form method="GET" action="/admin/orders" class="toolbar">
        {status !== 'All' && <input type="hidden" name="status" value={status} />}
        <input type="text" name="q" value={q} placeholder="Search order #, name or phone" />
        <select name="pay">
          <option value="all" selected={pay === 'all'}>
            Any payment
          </option>
          <option value="unpaid" selected={pay === 'unpaid'}>
            Unpaid
          </option>
          <option value="paid" selected={pay === 'paid'}>
            Paid
          </option>
          <option value="refunded" selected={pay === 'refunded'}>
            Refunded
          </option>
        </select>
        <button type="submit" class="btn btn-primary btn-sm">
          Filter
        </button>
        {(q || pay !== 'all') && (
          <a class="btn btn-secondary btn-sm" href={listUrl({ status, pay: 'all', q: '' })}>
            Clear
          </a>
        )}
      </form>

      {rows.length === 0 ? (
        <div class="empty">No orders match.</div>
      ) : (
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Pickup</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const lines = linesByOrder.get(o.orderId) ?? []
                const next = nextStatus(o.status)
                const blocked = awaitingOnline(o)
                return (
                  <tr>
                    <td>
                      <a href={`/admin/orders/${o.orderId}`}>
                        <b>#{o.orderId}</b>
                      </a>
                      <div class="muted">{placedOnText(o.orderDate) ?? ''}</div>
                    </td>
                    <td>
                      {o.customerName}
                      <div class="muted">{o.customerPhone}</div>
                    </td>
                    <td>{pickupText(o.pickupSlot)}</td>
                    <td style="font-size:13px">
                      {lines.slice(0, 2).map((l) => (
                        <div>
                          {l.name} × {l.quantityKg} kg
                        </div>
                      ))}
                      {lines.length > 2 && <div class="muted">+{lines.length - 2} more</div>}
                    </td>
                    <td>{rupee(o.totalAmount)}</td>
                    <td>
                      <PaymentBadge o={o} />
                    </td>
                    <td>
                      <StatusBadge o={o} />
                    </td>
                    <td>
                      <div class="row-actions">
                        {next && !blocked && (
                          <form method="POST" action={`/admin/orders/${o.orderId}/status`}>
                            <input type="hidden" name="to" value={next} />
                            <input type="hidden" name="back" value={back} />
                            <button type="submit" class="btn btn-primary btn-sm">
                              Mark {next}
                            </button>
                          </form>
                        )}
                        {blocked && <span class="muted">Awaiting payment</span>}
                        <a href={`/admin/orders/${o.orderId}`} class="btn btn-outline btn-sm">
                          Open
                        </a>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div class="pager">
          {page > 1 ? (
            <a class="btn btn-secondary btn-sm" href={listUrl({ ...current, p: page - 1 })}>
              ← Newer
            </a>
          ) : (
            <span class="muted">← Newer</span>
          )}
          <span>
            Page {Math.min(page, pages)} of {pages}
          </span>
          {page < pages ? (
            <a class="btn btn-secondary btn-sm" href={listUrl({ ...current, p: page + 1 })}>
              Older →
            </a>
          ) : (
            <span class="muted">Older →</span>
          )}
        </div>
      )}
    </AdminLayout>
  )
})

// ---------------------------------------------------------------- one order

adminOrdersRouter.get('/:id', requireAdmin, async (c) => {
  const orderId = Number(c.req.param('id'))
  if (!Number.isInteger(orderId)) return c.notFound()

  const db = getDB(c.env)
  await expireStaleOnlineOrders(db)

  const [row] = await db
    .select({ order: orders, email: user.email })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.customerId))
    .leftJoin(user, eq(customers.authUserId, user.id))
    .where(eq(orders.orderId, orderId))
  if (!row) return c.notFound()
  const order = row.order

  const items = await db
    .select({
      productId: orderItems.productId,
      name: products.itemName,
      imageUrl: products.imageUrl,
      quantityKg: orderItems.weightKg,
      pricePerKg: orderItems.pricePerKgAtPurchase,
      inStockKg: products.inStockKg,
    })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.productId))
    .where(eq(orderItems.orderId, orderId))

  const message = takeFlash(c)
  const pay = paymentInfo(order)
  const pickup = pickupParts(order.pickupSlot)
  const next = nextStatus(order.status)
  const blocked = awaitingOnline(order)
  const open = order.status !== 'Cancelled' && order.status !== 'Collected'
  const paidOnline = order.paymentMethod === 'online' && order.paymentStatus === 'paid'
  const base = `/admin/orders/${order.orderId}`

  return c.html(
    <AdminLayout title={`Order #${order.orderId}`} wide>
      <div class="header-row">
        <h1 style="margin:0">
          Order #{order.orderId} <StatusBadge o={order} />
        </h1>
        <a href="/admin/orders" class="btn btn-secondary btn-sm">
          ← All orders
        </a>
      </div>

      {message && <div class={`alert alert-${message.kind === 'error' ? 'error' : 'success'}`}>{message.text}</div>}

      {blocked && (
        <div class="banner banner-warn">
          Waiting for the online payment. The order can't move forward until it's paid, and it's cancelled
          automatically if the customer doesn't pay in time.
        </div>
      )}

      {/* Actions */}
      <div class="panel">
        <h2>Actions</h2>
        <div class="row-actions">
          {open && next && !blocked && (
            <form method="POST" action={`${base}/status`}>
              <input type="hidden" name="to" value={next} />
              <input type="hidden" name="back" value={base} />
              <button type="submit" class="btn btn-primary">
                Mark {next}
              </button>
            </form>
          )}
          {open && order.paymentMethod === 'counter' && order.paymentStatus === 'unpaid' && (
            <form method="POST" action={`${base}/mark-paid`}>
              <button type="submit" class="btn btn-success">
                Mark payment received
              </button>
            </form>
          )}
          {open && paidOnline && (
            <form method="POST" action={`${base}/cancel-refund`}>
              <button
                type="submit"
                class="btn btn-danger"
                onclick={`return confirm('Cancel order #${order.orderId} and refund ${rupee(order.totalAmount)} to the customer?')`}
              >
                Cancel &amp; refund
              </button>
            </form>
          )}
          {open && !paidOnline && (
            <form method="POST" action={`${base}/cancel`}>
              <button
                type="submit"
                class="btn btn-danger"
                onclick={`return confirm('Cancel order #${order.orderId}? The stock goes back on the shelf.')`}
              >
                Cancel order
              </button>
            </form>
          )}
          {order.status === 'Cancelled' && order.paymentMethod === 'online' && order.paymentStatus === 'paid' && (
            <form method="POST" action={`${base}/refund`}>
              <button
                type="submit"
                class="btn btn-primary"
                onclick={`return confirm('Refund ${rupee(order.totalAmount)} to the customer for order #${order.orderId}?')`}
              >
                Refund {rupee(order.totalAmount)}
              </button>
            </form>
          )}
          {!open && !(order.status === 'Cancelled' && paidOnline) && (
            <span class="muted">
              {order.status === 'Collected' ? 'This order is complete.' : 'This order is cancelled.'}
            </span>
          )}
        </div>
        {order.paymentStatus === 'refunded' && (
          <p class="muted" style="margin-top:10px">
            Refunded. The customer sees "Refunded {rupee(order.totalAmount)} to original payment method".
          </p>
        )}
        {next === 'Ready' && open && !blocked && (
          <p class="muted" style="margin-top:10px">
            Marking it Ready emails the customer automatically.
          </p>
        )}
      </div>

      <div class="detail-grid">
        <div>
          <div class="panel">
            <h2>Customer &amp; pickup</h2>
            <div class="kv">
              <span>Name</span>
              <b>{order.customerName}</b>
            </div>
            <div class="kv">
              <span>Phone</span>
              <b>{order.customerPhone}</b>
            </div>
            <div class="kv">
              <span>Email</span>
              <b>{row.email ?? '—'}</b>
            </div>
            <div class="kv">
              <span>Pickup</span>
              <b>{pickup ? `${pickup.dateLong}, ${pickup.time}` : order.pickupSlot}</b>
            </div>
            <div class="kv">
              <span>Placed on</span>
              <b>{placedOnText(order.orderDate) ?? '—'}</b>
            </div>
          </div>

          <div class="panel">
            <h2>Payment</h2>
            <div class="kv">
              <span>Method</span>
              <b>{order.paymentMethod === 'online' ? 'Online (Razorpay)' : 'Pay at counter'}</b>
            </div>
            <div class="kv">
              <span>Status</span>
              <PaymentBadge o={order} />
            </div>
            <div class="kv">
              <span>{pay.totalLabel}</span>
              <b>{rupee(order.totalAmount)}</b>
            </div>
            {order.razorpayPaymentId && (
              <div class="kv">
                <span>Payment ID</span>
                <b style="font-size:12px;word-break:break-all">{order.razorpayPaymentId}</b>
              </div>
            )}
          </div>
        </div>

        <div class="panel">
          <h2>Items</h2>
          <table class="items-table">
            <tbody>
              {items.map((i) => (
                <tr>
                  <td style="width:56px">
                    {i.imageUrl ? <img class="thumb" src={i.imageUrl} alt="" /> : <span style="font-size:22px">🌾</span>}
                  </td>
                  <td>
                    <b>{i.name}</b>
                    <div class="muted">
                      {i.quantityKg} kg × {rupee(i.pricePerKg)}/kg · {Math.round(i.inStockKg * 100) / 100} kg in stock
                    </div>
                  </td>
                  <td style="text-align:right">{rupee(i.pricePerKg * i.quantityKg)}</td>
                </tr>
              ))}
              <tr>
                <td></td>
                <td>
                  <b>Total</b>
                </td>
                <td style="text-align:right">
                  <b>{rupee(order.totalAmount)}</b>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  )
})

// ---------------------------------------------------------------- actions

adminOrdersRouter.post('/:id/status', requireAdmin, async (c) => {
  if (!sameOrigin(c)) return c.text('Request blocked.', 403)
  const orderId = Number(c.req.param('id'))
  const body = await c.req.parseBody()
  const to = String(body.to ?? '')
  const back = safeBack(body.back, `/admin/orders/${orderId}`)
  const db = getDB(c.env)

  const result = await advanceOrder(db, orderId, to)
  if (!result.ok) {
    flash(c, 'error', result.message)
    return c.redirect(back, 303)
  }

  // "Ready to collect" email — sent once, right when the status really changed.
  if (to === 'Ready') runInBackground(c, sendOrderReadyEmail(c.env, db, orderId))

  flash(c, 'success', `Order #${orderId} is now ${to}.${to === 'Ready' ? ' The customer is being emailed.' : ''}`)
  return c.redirect(back, 303)
})

adminOrdersRouter.post('/:id/mark-paid', requireAdmin, async (c) => {
  if (!sameOrigin(c)) return c.text('Request blocked.', 403)
  const orderId = Number(c.req.param('id'))
  const ok = await markCounterOrderPaid(getDB(c.env), orderId)
  flash(c, ok ? 'success' : 'error', ok ? `Order #${orderId} marked as paid.` : 'Could not mark this order as paid.')
  return c.redirect(`/admin/orders/${orderId}`, 303)
})

adminOrdersRouter.post('/:id/cancel', requireAdmin, async (c) => {
  if (!sameOrigin(c)) return c.text('Request blocked.', 403)
  const orderId = Number(c.req.param('id'))
  const ok = await cancelOrderAsAdmin(getDB(c.env), orderId)
  flash(
    c,
    ok ? 'success' : 'error',
    ok ? `Order #${orderId} cancelled. Its stock is back on the shelf.` : 'This order can no longer be cancelled.'
  )
  return c.redirect(`/admin/orders/${orderId}`, 303)
})

adminOrdersRouter.post('/:id/refund', requireAdmin, async (c) => {
  if (!sameOrigin(c)) return c.text('Request blocked.', 403)
  const orderId = Number(c.req.param('id'))
  const db = getDB(c.env)

  // Only a cancelled order is refunded (use "Cancel & refund" for an active one).
  const [order] = await db.select({ status: orders.status }).from(orders).where(eq(orders.orderId, orderId))
  if (!order || order.status !== 'Cancelled') {
    flash(c, 'error', 'Only a cancelled order can be refunded.')
    return c.redirect(`/admin/orders/${orderId}`, 303)
  }

  const ok = await refundOnlineOrder(db, orderId)
  flash(c, ok ? 'success' : 'error', ok ? `Order #${orderId} refunded.` : 'This order has no online payment to refund.')
  return c.redirect(`/admin/orders/${orderId}`, 303)
})

adminOrdersRouter.post('/:id/cancel-refund', requireAdmin, async (c) => {
  if (!sameOrigin(c)) return c.text('Request blocked.', 403)
  const orderId = Number(c.req.param('id'))
  const db = getDB(c.env)

  const cancelled = await cancelOrderAsAdmin(db, orderId)
  if (!cancelled) {
    flash(c, 'error', 'This order can no longer be cancelled.')
    return c.redirect(`/admin/orders/${orderId}`, 303)
  }

  const refunded = await refundOnlineOrder(db, orderId)
  flash(
    c,
    'success',
    refunded
      ? `Order #${orderId} cancelled and refunded. Its stock is back on the shelf.`
      : `Order #${orderId} cancelled. It had no online payment to refund.`
  )
  return c.redirect(`/admin/orders/${orderId}`, 303)
})
