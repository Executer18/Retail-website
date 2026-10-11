// src/lib/products.ts
//
// NEW FILE. Groups product rows that are "the same item, different pack
// size" (sharing itemName + category) so cards show one representative
// row + a "+N sizes" pill instead of listing every size as its own card.
//
// ASSUMPTION (flag if wrong): the grouping key is itemName + category —
// there's no dedicated product-group id in schema.ts. If two genuinely
// different products ever share both an itemName and a category, they'll
// get incorrectly grouped; if that's a real risk, add a `groupKey` or
// `parentProductId` column instead and swap the key below.

import { eq, and } from 'drizzle-orm'
import type { getDB } from '../db'
import { products, cartItems } from '../db/schema'
import type { ProductCardData } from '../components/ProductCard'

type ProductRow = typeof products.$inferSelect

function groupKey(row: ProductRow): string {
  return `${row.itemName}::${row.category}`
}

/** Pick which sibling row represents the group on a card: most in-stock first. */
function pickRepresentative(rows: ProductRow[]): ProductRow {
  return [...rows].sort((a, b) => b.inStockKg - a.inStockKg)[0]
}

export function groupProductRows(
  rows: ProductRow[],
  cartQtyByProductId: Map<number, number>
): ProductCardData[] {
  const groups = new Map<string, ProductRow[]>()
  for (const row of rows) {
    const key = groupKey(row)
    const existing = groups.get(key)
    if (existing) existing.push(row)
    else groups.set(key, [row])
  }

  return [...groups.values()].map((siblings) => {
    const rep = pickRepresentative(siblings)
    return {
      id: rep.productId,
      name: rep.itemName,
      category: rep.category,
      pricePerKg: rep.pricePerKg,
      discountPct: rep.discount ?? 0,
      sizeKg: rep.size ?? null,
      inStockKg: rep.inStockKg,
      imageUrl: rep.imageUrl,
      cartQuantityKg: cartQtyByProductId.get(rep.productId) ?? 0,
      variantCount: siblings.length,
    }
  })
}

/** This session's cart quantity for every product id, for initial SSR of AddRow/stepper state. */
export async function getCartQuantitiesByProduct(
  db: ReturnType<typeof getDB>,
  sessionId: string
): Promise<Map<number, number>> {
  const rows = await db
    .select({ productId: cartItems.productId, quantityKg: cartItems.quantityKg })
    .from(cartItems)
    .where(eq(cartItems.sessionId, sessionId))

  return new Map(rows.map((r) => [r.productId, r.quantityKg]))
}

/**
 * Top N "featured" groups, ranked by total stock across all of a group's
 * pack-size siblings (not just the representative row's own stock).
 */
export async function getFeaturedProducts(
  db: ReturnType<typeof getDB>,
  sessionId: string,
  limit = 10
): Promise<ProductCardData[]> {
  const allRows = await db.select().from(products)
  const cartQty = await getCartQuantitiesByProduct(db, sessionId)

  const groups = new Map<string, ProductRow[]>()
  for (const row of allRows) {
    const key = groupKey(row)
    const existing = groups.get(key)
    if (existing) existing.push(row)
    else groups.set(key, [row])
  }

  const ranked = [...groups.values()].sort((a, b) => {
    const stockA = a.reduce((s, r) => s + r.inStockKg, 0)
    const stockB = b.reduce((s, r) => s + r.inStockKg, 0)
    return stockB - stockA
  })

  const topRows = ranked.slice(0, limit).flat()
  return groupProductRows(topRows, cartQty)
}

/** Sibling pack-size rows for one product id — used by the variant-picker popup. */
export async function getSiblingVariants(db: ReturnType<typeof getDB>, productId: number) {
  const [target] = await db.select().from(products).where(eq(products.productId, productId))
  if (!target) return { product: null, siblings: [] as ProductRow[] }

  const siblings = await db
    .select()
    .from(products)
    .where(and(eq(products.itemName, target.itemName), eq(products.category, target.category)))

  return { product: target, siblings: siblings.sort((a, b) => (a.size ?? 0) - (b.size ?? 0)) }
}