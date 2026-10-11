// src/routes/cart.tsx
//
// Updated for the new Annapurna Chakki cart UI:
//   - loadCartWithProducts now also pulls products.discount and returns
//     items already carrying mrpPerKg/discountPct, plus totalMrp/
//     totalSavings alongside the existing `total` (to-pay)
//   - POST /api/cart/update/:cartItemId now detects when it had to clamp
//     the requested quantity down to inStockKg and attaches a `warning`
//     to that one row, so CartContents can show "Only Xkg available"
//     next to the control the user just touched, and disable its + button
//   - new GET /api/cart/contents — just the CartContents fragment, for
//     Layout's cart-modal (#cart-body) and the full /cart page to share
//   - new GET /api/cart/summary — the floating "View Cart" button
//     fragment Layout's #floatcart-slot self-loads
//   - add/update/remove all set `HX-Trigger: cart-updated`, which
//     Layout's #cart-count and #floatcart-slot listen for (hx-trigger
//     includes "cart-updated from:body") so they refresh themselves
//     after a change made elsewhere on the page (the modal in
//     particular), without this route having to know those elements
//     exist. The qty/remove forms inside the modal still target
//     #cart-contents directly for the fast, local swap.

import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { getDB } from '../db'
import { cartItems, products } from '../db/schema'
import type { Env, Variables } from '../db'
import { CartContents, rupee, type CartRow } from '../pages/fragments/CartContents'
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
      discount: products.discount,
      imageUrl: products.imageUrl,
      inStockKg: products.inStockKg,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.productId))
    .where(eq(cartItems.sessionId, sessionId))

  const items: CartRow[] = rows.map((r) => {
    const discountPct = r.discount ?? 0
    // products.discount is assumed to be "percent off MRP", so the
    // pre-discount price is pricePerKg / (1 - discount/100). Flag this
    // assumption if your discount column actually means something else.
    const mrpPerKg = discountPct > 0 ? r.pricePerKg / (1 - discountPct / 100) : r.pricePerKg
    return {
      cartItemId: r.cartItemId,
      productId: r.productId,
      quantityKg: r.quantityKg,
      name: r.name,
      pricePerKg: r.pricePerKg,
      mrpPerKg,
      discountPct,
      imageUrl: r.imageUrl,
      inStockKg: r.inStockKg,
    }
  })

  const total = items.reduce((sum, item) => sum + item.pricePerKg * item.quantityKg, 0)
  const totalMrp = items.reduce((sum, item) => sum + item.mrpPerKg * item.quantityKg, 0)
  const totalSavings = totalMrp - total

  return { items, total, totalMrp, totalSavings }
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

  const { items } = await loadCartWithProducts(db, sessionId)
  const itemCount = items.length

  const warningHtml = wasClamped
    ? `<span id="cart-add-feedback" hx-swap-oob="true" class="cart-add-feedback cart-add-feedback--visible">Only ${product.inStockKg}kg available — added the maximum.</span>`
    : `<span id="cart-add-feedback" hx-swap-oob="true" class="cart-add-feedback"></span>`

  c.header('HX-Trigger', 'cart-updated')
  return c.html(`${itemCount}${warningHtml}`)
})

// ---------- Adjust by product id (ProductCard's ADD button and +/- stepper,
// and the size-variant popup — anywhere a card shows a live qty for one
// product, not a cart-line id). delta is +1/-1 from a hidden form field. ----------
cartRoutes.post('/api/cart/adjust/:productId', async (c) => {
  const db = getDB(c.env)
  const sessionId = c.get('sessionId')
  const productId = parseInt(c.req.param('productId'), 10)

  const body = await c.req.parseBody()
  const delta = parseFloat(String(body.delta ?? '0'))

  const [product] = await db.select().from(products).where(eq(products.productId, productId))
  if (!product) return c.text('Product not found', 404)

  const [existing] = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.sessionId, sessionId), eq(cartItems.productId, productId)))

  const nextQty = Math.max(0, Math.min((existing?.quantityKg ?? 0) + delta, product.inStockKg))

  if (nextQty <= 0) {
    if (existing) {
      await db.delete(cartItems).where(and(eq(cartItems.sessionId, sessionId), eq(cartItems.productId, productId)))
    }
  } else {
    await db
      .insert(cartItems)
      .values({ sessionId, productId, quantityKg: nextQty })
      .onConflictDoUpdate({
        target: [cartItems.sessionId, cartItems.productId],
        set: { quantityKg: nextQty },
      })
  }

  c.header('HX-Trigger', 'cart-updated')
  return c.html(<AddRow productId={productId} quantityKg={nextQty} inStockKg={product.inStockKg} />)
})

// ---------- Adjust by a small delta (ProductCard's ADD button, and each
// row of the size-variant picker modal) ----------
// Separate from /api/cart/add above: that route takes an arbitrary
// quantityKg (ProductDetailPage, where the shopper picks an exact
// amount before adding). This one just nudges by +/-delta kg from
// whatever's already in the cart for that product — a plain repeatable
// tap, since the product grid has no cartItemId to update by.
cartRoutes.post('/api/cart/adjust/:productId', async (c) => {
  const db = getDB(c.env)
  const sessionId = c.get('sessionId')
  const productId = parseInt(c.req.param('productId'), 10)

  const body = await c.req.parseBody()
  const delta = parseFloat(String(body.delta ?? '1')) || 1

  const [product] = await db.select().from(products).where(eq(products.productId, productId))
  if (!product) {
    return c.text('Product not found', 404)
  }

  const [existing] = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.sessionId, sessionId), eq(cartItems.productId, productId)))

  const currentQty = existing?.quantityKg ?? 0
  const rawNext = currentQty + delta
  const nextQty = Math.max(0, Math.min(rawNext, product.inStockKg))
  const wasClamped = delta > 0 && nextQty < rawNext

  if (nextQty <= 0) {
    if (existing) {
      await db.delete(cartItems).where(eq(cartItems.cartItemId, existing.cartItemId))
    }
  } else if (existing) {
    await db.update(cartItems).set({ quantityKg: nextQty }).where(eq(cartItems.cartItemId, existing.cartItemId))
  } else {
    await db.insert(cartItems).values({ sessionId, productId, quantityKg: nextQty })
  }

  const { items } = await loadCartWithProducts(db, sessionId)
  const itemCount = items.length

  const warningHtml = wasClamped
    ? `<span id="cart-add-feedback" hx-swap-oob="true" class="cart-add-feedback cart-add-feedback--visible">Only ${product.inStockKg}kg available — added the maximum.</span>`
    : `<span id="cart-add-feedback" hx-swap-oob="true" class="cart-add-feedback"></span>`

  c.header('HX-Trigger', 'cart-updated')
  return c.html(`${itemCount}${warningHtml}`)
})

// ---------- Cart count (Layout's header badge) ----------
cartRoutes.get('/api/cart/count', async (c) => {
  const db = getDB(c.env)
  const sessionId = c.get('sessionId')
  const { items } = await loadCartWithProducts(db, sessionId)
  return c.text(String(items.length))
})

// ---------- Floating "View Cart" button (Layout's #floatcart-slot) ----------
cartRoutes.get('/api/cart/summary', async (c) => {
  const db = getDB(c.env)
  const sessionId = c.get('sessionId')
  const { items, total } = await loadCartWithProducts(db, sessionId)
  const show = items.length > 0

  return c.html(`
    <button class="floatcart${show ? ' show' : ''}" id="floatcart" type="button" onclick="openSheet('cartModal')">
      <span class="fc-left">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.6 12.5h11L21 7H6"/></svg>
        <span><b>View Cart</b><small class="ftot">${rupee(total)}</small></span>
      </span>
      <span class="fc-view">View →</span>
    </button>
  `)
})

// ---------- Cart fragment (Layout's cart-modal #cart-body, and the full page below) ----------
cartRoutes.get('/api/cart/contents', async (c) => {
  const db = getDB(c.env)
  const sessionId = c.get('sessionId')
  const { items, total, totalMrp, totalSavings } = await loadCartWithProducts(db, sessionId)
  return c.html(<CartContents items={items} total={total} totalMrp={totalMrp} totalSavings={totalSavings} />)
})

// ---------- Update quantity ----------
cartRoutes.post('/api/cart/update/:cartItemId', async (c) => {
  const db = getDB(c.env)
  const sessionId = c.get('sessionId')
  const cartItemId = parseInt(c.req.param('cartItemId'), 10)

  const body = await c.req.parseBody()
  const requestedKg = parseFloat(String(body.quantityKg ?? '1'))

  let clampedTo: number | null = null

  if (requestedKg <= 0) {
    await db.delete(cartItems).where(and(eq(cartItems.cartItemId, cartItemId), eq(cartItems.sessionId, sessionId)))
  } else {
    const [row] = await db
      .select({ productId: cartItems.productId })
      .from(cartItems)
      .where(and(eq(cartItems.cartItemId, cartItemId), eq(cartItems.sessionId, sessionId)))

    if (row) {
      const [product] = await db.select().from(products).where(eq(products.productId, row.productId))
      const maxKg = product?.inStockKg ?? requestedKg
      const clampedKg = Math.min(requestedKg, maxKg)
      if (clampedKg < requestedKg) clampedTo = maxKg

      await db
        .update(cartItems)
        .set({ quantityKg: clampedKg })
        .where(and(eq(cartItems.cartItemId, cartItemId), eq(cartItems.sessionId, sessionId)))
    }
  }

  const { items, total, totalMrp, totalSavings } = await loadCartWithProducts(db, sessionId)
  const withWarning =
    clampedTo !== null
      ? items.map((item) =>
          item.cartItemId === cartItemId ? { ...item, warning: `Only ${clampedTo}kg available — adjusted.` } : item
        )
      : items

  c.header('HX-Trigger', 'cart-updated')
  return c.html(<CartContents items={withWarning} total={total} totalMrp={totalMrp} totalSavings={totalSavings} />)
})

// ---------- Remove line ----------
cartRoutes.post('/api/cart/remove/:cartItemId', async (c) => {
  const db = getDB(c.env)
  const sessionId = c.get('sessionId')
  const cartItemId = parseInt(c.req.param('cartItemId'), 10)

  await db.delete(cartItems).where(and(eq(cartItems.cartItemId, cartItemId), eq(cartItems.sessionId, sessionId)))

  const { items, total, totalMrp, totalSavings } = await loadCartWithProducts(db, sessionId)
  c.header('HX-Trigger', 'cart-updated')
  return c.html(<CartContents items={items} total={total} totalMrp={totalMrp} totalSavings={totalSavings} />)
})

// ---------- Cart page (direct /cart visit — the modal is the primary path now) ----------
cartRoutes.get('/cart', async (c) => {
  const db = getDB(c.env)
  const sessionId = c.get('sessionId')

  const { items, total, totalMrp, totalSavings } = await loadCartWithProducts(db, sessionId)
  return c.html(<CartPage items={items} total={total} totalMrp={totalMrp} totalSavings={totalSavings} />)
})