import { Hono } from 'hono'
import { eq, and, desc } from 'drizzle-orm'
import { getDB } from '../db'
import { orders, orderItems, products, customers } from '../db/schema'
import type { Env, Variables } from '../db'
import { createAuth } from '../auth' // adjust path/name if your real helper differs
import { OrderHistoryPage } from '../pages/OrderHistoryPage'
import { OrderDetailPage } from '../pages/OrderDetailPage'
import { redirect } from 'react-router-dom';

export const orderRoutes = new Hono<{ Bindings: Env; Variables: Variables }>()

async function getLoggedInCustomerId(c: any): Promise<number | null> {
  const auth = createAuth(c.env)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!session?.user) {
    return null
  }

  const db = getDB(c.env)
  const [existingCustomer] = await db.select().from(customers).where(eq(customers.authUserId, session.user.id))

  // Unlike checkout.tsx, this route does NOT auto-create a customers row
  // if one doesn't exist — viewing order history with no customer
  // record yet just means "no orders," which the empty-state already
  // handles correctly. Auto-creating here would be pointless (nothing
  // to attach to this new row) and would silently mask a real bug if it
  // ever happened unexpectedly.
  return existingCustomer ? existingCustomer.customerId : null
}

orderRoutes.get('/orders', async (c) => {
  const customerId = await getLoggedInCustomerId(c)
  if (!customerId) {
    return c.redirect('/login?redirect=/orders')
  }

  const db = getDB(c.env)
  const rows = await db.select().from(orders).where(eq(orders.customerId, customerId)).orderBy(desc(orders.orderId))

  return c.html(<OrderHistoryPage orders={rows} />)
})

orderRoutes.get('/orders/:id', async (c) => {
  const customerId = await getLoggedInCustomerId(c)
  if (!customerId) {
    return c.redirect('/login?redirect=/orders')
  }

  const db = getDB(c.env)
  const orderId = parseInt(c.req.param('id'), 10)

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
      weightKg: orderItems.weightKg,
      pricePerKgAtPurchase: orderItems.pricePerKgAtPurchase,
      name: products.itemName,
    })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.productId))
    .where(eq(orderItems.orderId, orderId))

  return c.html(<OrderDetailPage order={order} items={items} />)
})
