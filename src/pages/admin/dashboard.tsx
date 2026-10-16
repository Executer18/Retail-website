/** @jsxImportSource hono/jsx */
// src/pages/admin/dashboard.tsx
//
// GET /admin — the admin dashboard: what needs doing today, stock warnings
// (under 5 kg = low, under 1 kg = almost out) and the latest orders.
// Mounted in index.tsx with:  app.route("/admin", dashboardRouter)

import { Hono } from 'hono'
import { and, asc, desc, eq, inArray, like, lt, or, sql } from 'drizzle-orm'
import { requireAdmin } from '../../middleware/admin'
import { getDB } from '../../db'
import type { Env } from '../../db'
import { orders, products } from '../../db/schema'
import { expireStaleOnlineOrders } from '../../lib/order-payments'
import { rupee } from '../../lib/checkout-ui'
import { paymentInfo, pickupText, statusPill } from '../../lib/orders-ui'
import { AdminLayout } from './AdminLayout'

export const dashboardRouter = new Hono<{ Bindings: Env }>()

const ACTIVE = ['Reserved', 'Confirmed', 'Preparing', 'Ready'] as const
const LOW_STOCK_KG = 5
const ALMOST_OUT_KG = 1

// Today's date in IST as "YYYY-MM-DD" — pickup slots are stored as IST wall-clock text.
const istToday = () => new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10)

const kg = (n: number) => `${Math.round(n * 100) / 100} kg`

dashboardRouter.get('/', requireAdmin, async (c) => {
  const db = getDB(c.env)
  // Unpaid online orders older than 15 minutes are cancelled (and their stock returned) first.
  await expireStaleOnlineOrders(db)

  // Orders the shop has to act on: active, and either a counter order or an online order that is paid.
  const needsAction = and(
    inArray(orders.status, [...ACTIVE]),
    or(eq(orders.paymentMethod, 'counter'), eq(orders.paymentStatus, 'paid'))
  )

  const count = async (where: any) => {
    const [row] = await db.select({ n: sql<number>`count(*)` }).from(orders).where(where)
    return Number(row?.n ?? 0)
  }

  const [activeCount, readyCount, awaitingPayment, pickupsToday] = await Promise.all([
    count(needsAction),
    count(eq(orders.status, 'Ready')),
    count(and(eq(orders.paymentMethod, 'online'), eq(orders.paymentStatus, 'unpaid'), eq(orders.status, 'Reserved'))),
    count(
      and(
        like(orders.pickupSlot, `${istToday()}%`),
        inArray(orders.status, [...ACTIVE, 'Collected'])
      )
    ),
  ])

  const [cash] = await db
    .select({ total: sql<number>`coalesce(sum(${orders.totalAmount}), 0)` })
    .from(orders)
    .where(
      and(
        eq(orders.paymentMethod, 'counter'),
        eq(orders.paymentStatus, 'unpaid'),
        inArray(orders.status, [...ACTIVE])
      )
    )

  const lowStock = await db
    .select()
    .from(products)
    .where(lt(products.inStockKg, LOW_STOCK_KG))
    .orderBy(asc(products.inStockKg), asc(products.itemName))
  const almostOut = lowStock.filter((p) => p.inStockKg < ALMOST_OUT_KG)
  const low = lowStock.filter((p) => p.inStockKg >= ALMOST_OUT_KG)

  const recent = await db.select().from(orders).orderBy(desc(orders.orderId)).limit(6)

  const productLabel = (p: (typeof lowStock)[number]) => (p.size ? `${p.itemName} (size ${p.size})` : p.itemName)

  return c.html(
    <AdminLayout title="Dashboard" wide>
      <h1>Dashboard</h1>

      {almostOut.length > 0 && (
        <div class="banner banner-danger">
          <b>
            ⚠️ Almost out of stock (under {ALMOST_OUT_KG} kg): {almostOut.length} product{almostOut.length === 1 ? '' : 's'}
          </b>
          <ul>
            {almostOut.map((p) => (
              <li>
                <a href={`/admin/products/${p.productId}/edit`}>{productLabel(p)}</a> — {kg(p.inStockKg)} left
              </li>
            ))}
          </ul>
        </div>
      )}

      {low.length > 0 && (
        <div class="banner banner-warn">
          <b>
            Low stock (under {LOW_STOCK_KG} kg): {low.length} product{low.length === 1 ? '' : 's'}
          </b>
          <ul>
            {low.map((p) => (
              <li>
                <a href={`/admin/products/${p.productId}/edit`}>{productLabel(p)}</a> — {kg(p.inStockKg)} left
              </li>
            ))}
          </ul>
        </div>
      )}

      {lowStock.length === 0 && (
        <div class="alert alert-success">All products have at least {LOW_STOCK_KG} kg in stock.</div>
      )}

      <div class="stat-grid">
        <div class="stat">
          <a href="/admin/orders?status=All">
            <small>Orders to handle</small>
            <b>{activeCount}</b>
          </a>
        </div>
        <div class="stat">
          <a href="/admin/orders?status=Ready">
            <small>Ready to collect</small>
            <b>{readyCount}</b>
          </a>
        </div>
        <div class="stat">
          <small>Pickups today</small>
          <b>{pickupsToday}</b>
        </div>
        <div class="stat">
          <small>Awaiting online payment</small>
          <b>{awaitingPayment}</b>
        </div>
        <div class="stat">
          <small>To collect at counter</small>
          <b>{rupee(Number(cash?.total ?? 0))}</b>
        </div>
      </div>

      <div class="panel">
        <div class="header-row" style="margin-bottom:12px">
          <h2 style="margin:0">Latest orders</h2>
          <a href="/admin/orders" class="btn btn-secondary btn-sm">
            All orders →
          </a>
        </div>
        {recent.length === 0 ? (
          <p class="muted">No orders yet.</p>
        ) : (
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Pickup</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((o) => {
                  const pill = statusPill(o)
                  const pay = paymentInfo(o)
                  return (
                    <tr>
                      <td>
                        <a href={`/admin/orders/${o.orderId}`}>#{o.orderId}</a>
                      </td>
                      <td>{o.customerName}</td>
                      <td>{pickupText(o.pickupSlot)}</td>
                      <td>{rupee(o.totalAmount)}</td>
                      <td>{pay.label}</td>
                      <td>
                        <span class={`badge badge-${pill.cls === 'pending' ? 'pending' : o.status}`}>{pill.label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
})
