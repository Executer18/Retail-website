// src/lib/product-variants.ts
//
// products.size (the "size_variants" column you just added) means one DB
// row = one pack size of an item, e.g. two separate rows for "Sharbati
// Atta" at 1kg and 5kg. This groups rows that share an itemName into a
// single ProductCardData with a `variants` list attached, so the grid
// shows one card with a "+1 size" badge instead of two near-duplicate
// cards.
//
// ASSUMPTION: itemName is the grouping key — rows are treated as the
// same product family only if their itemName matches exactly. If two
// unrelated products ever happen to share a name, give one a distinct
// itemName, or swap this for a dedicated product-family id column later.

import type { ProductCardData, ProductVariant } from '../components/ProductCard'

export type ProductRow = {
  productId: number
  itemName: string
  category: string
  pricePerKg: number
  inStockKg: number
  imageUrl: string | null
  size: number | null
  discount: number | null
}

export function groupBySizeVariants(rows: ProductRow[]): ProductCardData[] {
  const families = new Map<string, ProductRow[]>()
  for (const row of rows) {
    const list = families.get(row.itemName) ?? []
    list.push(row)
    families.set(row.itemName, list)
  }

  return Array.from(families.values()).map((rowsForName) => {
    const variants: ProductVariant[] = [...rowsForName]
      .sort((a, b) => (a.size ?? 0) - (b.size ?? 0))
      .map((row) => ({
        id: row.productId,
        sizeKg: row.size ?? 1,
        pricePerKg: row.pricePerKg,
        inStockKg: row.inStockKg,
        discountPct: row.discount ?? 0,
      }))

    // Default the card to the first in-stock variant (falling back to
    // the first variant at all if every size is sold out), so an
    // out-of-stock small pack doesn't hide a size that's actually
    // available.
    const primaryVariant = variants.find((v) => v.inStockKg > 0) ?? variants[0]
    const primaryRow = rowsForName.find((r) => r.productId === primaryVariant.id)!

    return {
      id: primaryVariant.id,
      name: primaryRow.itemName,
      category: primaryRow.category,
      pricePerKg: primaryVariant.pricePerKg,
      inStockKg: primaryVariant.inStockKg,
      discountPct: primaryVariant.discountPct,
      imageUrl: primaryRow.imageUrl,
      variants,
    }
  })
}

/** Highest in-stock quantity across a card's variants — what "top N by available quantity" sorts on once sizes are grouped. */
export function maxVariantStock(card: ProductCardData): number {
  return Math.max(...card.variants.map((v) => v.inStockKg))
}

/**
 * Pushes cards with zero available stock (across every size) to the end,
 * leaving everything else in whatever order it was already in — a
 * stable partition, not a full re-sort, so it doesn't fight whatever
 * ordering (name, newest, etc.) the caller already applied. Use on
 * ProductsListPage; HomePage's "top by stock" sort already puts
 * out-of-stock items last as a side effect of sorting by quantity.
 */
export function sortOutOfStockLast(cards: ProductCardData[]): ProductCardData[] {
  const inStock = cards.filter((c) => maxVariantStock(c) > 0)
  const outOfStock = cards.filter((c) => maxVariantStock(c) === 0)
  return [...inStock, ...outOfStock]
}