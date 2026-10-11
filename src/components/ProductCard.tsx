import React, { lazy } from 'react';
import type { FC } from 'hono/jsx'
import { rupee, formatSize } from '../lib/format'

export type ProductVariant = {
  id: number
  sizeKg: number
  pricePerKg: number
  inStockKg: number
  discountPct: number
}

export type ProductCardData = {
  id: number
  name: string
  category: string
  pricePerKg: number
  inStockKg: number
  discountPct: number
  imageUrl: string | null
  /** Every pack size for this item (same itemName — see product-variants.ts). Always at least length 1, this card's own size included. */
  variants: ProductVariant[]
}

export const ProductCard: FC<{ product: ProductCardData }> = ({ product }) => {
  const isOutOfStock = product.inStockKg <= 0
  const hasMultipleSizes = product.variants.length > 1
  const goTo = `location.href='/products/${product.id}'`

  return (
    <div class={`pcard${isOutOfStock ? ' out-of-stock' : ''}`} data-id={product.id}>
      <div class="img" style="cursor:pointer" onclick={goTo}>
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} loading="lazy" />
        ) : (
          <span aria-hidden="true">🌾</span>
        )}
        {product.discountPct > 0 && <span class="off">{product.discountPct}% OFF</span>}
      </div>

      <div class="body">
        <div class="nm" style="cursor:pointer" onclick={goTo}>
          {product.name}
        </div>
        <div class="wt">
          {formatSize(product.variants[0].sizeKg)} · Stone ground
          {hasMultipleSizes && <span class="size-badge">+{product.variants.length - 1}</span>}
        </div>
        <div class="pr">
          {rupee(product.pricePerKg)}
          {product.discountPct > 0 && <s>{rupee(product.pricePerKg / (1 - product.discountPct / 100))}</s>}
        </div>

        <div class="addrow">
          {isOutOfStock ? (
            <button class="addbtn" disabled style="opacity:.5">
              Out of stock
            </button>
          ) : hasMultipleSizes ? (
            // Both fire on click: the GET fills #variant-modal-body, the
            // onclick opens the sheet right away rather than waiting on
            // the response — a one-beat-early open reads better than a
            // delay, and the body's loading state (see products.ts)
            // covers the gap.
            <button
              type="button"
              class="addbtn"
              hx-get={`/api/products/${product.id}/variants`}
              hx-target="#variant-modal-body"
              hx-swap="innerHTML"
              onclick="openSheet('variantModal')"
            >
              SELECT SIZE
            </button>
          ) : (
            <form hx-post={`/api/cart/adjust/${product.id}`} hx-target="#cart-count" hx-swap="innerHTML">
              <input type="hidden" name="delta" value="1" />
              <button type="submit" class="addbtn">
                ADD
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}