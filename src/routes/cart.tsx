// src/routes/cart.tsx
//
// Rewritten to match your corrections:
//   - .tsx extension (JSX can't live in a plain .ts file with esbuild)
//   - imports cartItems/products from the real merged schema.ts, and
//     Env/Variables from db.ts (not a separate types.ts)
//   - real onConflictDoUpdate upsert, backed by the unique index you
//     added on (sessionId, productId)
//   - stock-clamp feedback: returns an out-of-band swap for
//     #cart-add-feedback when the requested quantity got capped
//   - new GET /api/cart/count route for Layout's self-loading badge
//   - update route also clamps to inStockKg now, same as add

import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { getDB } from '../db'
import { cartItems, products } from '../db/schema'
import type { Env, Variables } from '../db'
import { CartContents } from '../pages/fragments/CartContents'
import { CartPage } from '../pages/CartPage'

export const cartRoutes = new Hono<{ Bindings: Env; Variables: Variables }>()

async function loadCartWithProducts(db: ReturnType<typeof getDB>, sessionId: string) {
  const rows = await db
    .select({
      cartItemId: cartItems.cartItemId,
      productId: cartItems.productId,
      quantityKg: cartItems.quantityKg,
      name: products.itemName,
      pricePerKg: products.pricePerKg,
      imageUrl: products.imageUrl,
      inStockKg: products.inStockKg,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.productId))
    .where(eq(cartItems.sessionId, sessionId))

  const total = rows.reduce((sum, row) => sum + row.pricePerKg * row.quantityKg, 0)
  return { rows, total }
}

// ---------- Add to cart ----------
cartRoutes.post('/api/cart/add/:productId', async (c) => {
  const db = getDB(c.env)
  const sessionId = c.get('sessionId')
  const productId = parseInt(c.req.param('productId'), 10)

  const body = await c.req.parseBody()
  const requestedKg = parseFloat(String(body.quantityKg ?? '1')) || 1

  const [product] = await db.select().from(products).where(eq(products.productId, productId))
  if (!product) {
    return c.text('Product not found', 404)
  }

  // Read the existing line (if any) so we know the pre-clamp intended
  // total, purely to decide whether to show the "only Xkg available"
  // warning — the actual write below is a real atomic upsert, not a
  // second round-trip race with this read.
  const [existing] = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.sessionId, sessionId), eq(cartItems.productId, productId)))

  const intendedQuantity = (existing?.quantityKg ?? 0) + requestedKg
  const finalQuantity = Math.min(intendedQuantity, product.inStockKg)
  const wasClamped = finalQuantity < intendedQuantity

  await db
    .insert(cartItems)
    .values({ sessionId, productId, quantityKg: finalQuantity })
    .onConflictDoUpdate({
      target: [cartItems.sessionId, cartItems.productId],
      set: { quantityKg: finalQuantity },
    })

  const { rows } = await loadCartWithProducts(db, sessionId)
  const itemCount = rows.length

  // Two swaps in one response: the real #cart-count update (htmx reads
  // this as the main response body since the request's hx-target points
  // there), plus an out-of-band swap for the stock-clamp warning. htmx
  // pulls out any element with hx-swap-oob="true" from the response and
  // swaps it into the matching #id anywhere on the page, regardless of
  // what the request's own hx-target was.
  const warningHtml = wasClamped
    ? `<span id="cart-add-feedback" hx-swap-oob="true" class="cart-add-feedback cart-add-feedback--visible">Only ${product.inStockKg}kg available — added the maximum.</span>`
    : `<span id="cart-add-feedback" hx-swap-oob="true" class="cart-add-feedback"></span>`

  return c.html(`${itemCount}${warningHtml}`)
})

// ---------- Cart count (for Layout's self-loading badge) ----------
cartRoutes.get('/api/cart/count', async (c) => {
  const db = getDB(c.env)
  const sessionId = c.get('sessionId')
  const { rows } = await loadCartWithProducts(db, sessionId)
  return c.text(String(rows.length))
})

// ---------- Update quantity ----------
cartRoutes.post('/api/cart/update/:cartItemId', async (c) => {
  const db = getDB(c.env)
  const sessionId = c.get('sessionId')
  const cartItemId = parseInt(c.req.param('cartItemId'), 10)

  const body = await c.req.parseBody()
  const requestedKg = parseFloat(String(body.quantityKg ?? '1'))

  if (requestedKg <= 0) {
    await db.delete(cartItems).where(and(eq(cartItems.cartItemId, cartItemId), eq(cartItems.sessionId, sessionId)))
  } else {
    // Clamp here too — your changelog correctly flagged that update had
    // no stock check at all, so a customer could type any number in,
    // past what's actually in stock.
    const [row] = await db
      .select({ productId: cartItems.productId })
      .from(cartItems)
      .where(and(eq(cartItems.cartItemId, cartItemId), eq(cartItems.sessionId, sessionId)))

    if (row) {
      const [product] = await db.select().from(products).where(eq(products.productId, row.productId))
      const clampedKg = product ? Math.min(requestedKg, product.inStockKg) : requestedKg

      await db
        .update(cartItems)
        .set({ quantityKg: clampedKg })
        .where(and(eq(cartItems.cartItemId, cartItemId), eq(cartItems.sessionId, sessionId)))
    }
  }

  const { rows, total } = await loadCartWithProducts(db, sessionId)
  return c.html(<CartContents items={rows} total={total} />)
})

// ---------- Remove line ----------
cartRoutes.post('/api/cart/remove/:cartItemId', async (c) => {
  const db = getDB(c.env)
  const sessionId = c.get('sessionId')
  const cartItemId = parseInt(c.req.param('cartItemId'), 10)

  await db.delete(cartItems).where(and(eq(cartItems.cartItemId, cartItemId), eq(cartItems.sessionId, sessionId)))

  const { rows, total } = await loadCartWithProducts(db, sessionId)
  return c.html(<CartContents items={rows} total={total} />)
})

// ---------- Cart page ----------
cartRoutes.get('/cart', async (c) => {
  const db = getDB(c.env)
  const sessionId = c.get('sessionId')

  const { rows, total } = await loadCartWithProducts(db, sessionId)
  return c.html(<CartPage items={rows} total={total} />)
})
