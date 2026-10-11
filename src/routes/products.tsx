// src/routes/products.ts
//
// New file. Just the one route Layout's shared #variantModal needs:
// GET /api/products/:id/variants fills #variant-modal-body with every
// pack size that shares the clicked product's itemName (see
// lib/product-variants.ts for the grouping assumption).
//
// Mount this alongside your other route modules in index.tsx, e.g.:
//   import { productRoutes } from './routes/products'
//   app.route('/', productRoutes)

import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { getDB } from '../db'
import { products } from '../db/schema'
import type { Env, Variables } from '../db'
import { rupee, formatSize } from '../lib/format'

export const productRoutes = new Hono<{ Bindings: Env; Variables: Variables }>()

productRoutes.get('/api/products/:id/variants', async (c) => {
  const db = getDB(c.env)
  const productId = parseInt(c.req.param('id'), 10)

  const [clicked] = await db.select().from(products).where(eq(products.productId, productId))
  if (!clicked) return c.text('Product not found', 404)

  const siblings = await db.select().from(products).where(eq(products.itemName, clicked.itemName))
  const variants = siblings.sort((a, b) => (a.size ?? 0) - (b.size ?? 0))

  return c.html(`
    <div class="img" style="width:64px;height:64px;border-radius:var(--radius-soft);margin:0 auto 10px;font-size:28px">
      ${clicked.imageUrl ? `<img src="${clicked.imageUrl}" alt="${clicked.itemName}">` : '<span aria-hidden="true">🌾</span>'}
    </div>
    <h3 style="justify-content:center">${clicked.itemName}</h3>
    <p class="sub" style="text-align:center">Choose a pack size</p>
    <div class="variant-list">
      ${variants
        .map((v) => {
          const outOfStock = v.inStockKg <= 0
          return `
        <form class="variant-row" hx-post="/api/cart/adjust/${v.productId}" hx-target="#cart-count" hx-swap="innerHTML">
          <input type="hidden" name="delta" value="1">
          <span class="variant-row__size">${formatSize(v.size ?? 1)}</span>
          <span class="variant-row__price">${rupee(v.pricePerKg)}${outOfStock ? ' <small>· Out of stock</small>' : ''}</span>
          <button type="submit" class="variant-row__add" ${outOfStock ? 'disabled' : ''} aria-label="Add ${formatSize(v.size ?? 1)} to cart">+</button>
        </form>`
        })
        .join('')}
    </div>
  `)
})