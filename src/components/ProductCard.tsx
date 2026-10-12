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

export const ProductCard: FC<{
  product: ProductCardData
  currentQtyKg?: number
  /** Set by cart.tsx's adjust route when re-rendering this card as an out-of-band swap into id={`pcard-${product.id}`}. */
  oob?: boolean
}> = ({ product, currentQtyKg = 0, oob = false }) => {
  const isOutOfStock = product.inStockKg <= 0
  const hasMultipleSizes = product.variants.length > 1
  const sizeKg = product.variants[0].sizeKg
  const inCart = currentQtyKg > 0
  const atMax = currentQtyKg >= product.inStockKg
  const goTo = `location.href='/products/${product.id}'`
  const flyFromThisCard = `flyToCart(this.closest('.pcard').querySelector('.img img'), this.closest('.pcard'));toast('Added to cart 🛒')`

  return (
    <div
      id={`pcard-${product.id}`}
      class={`pcard${isOutOfStock ? ' out-of-stock' : ''}${inCart ? ' in-cart' : ''}`}
      data-id={product.id}
      hx-swap-oob={oob ? 'true' : undefined}
    >
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
          {formatSize(sizeKg)} · Stone ground
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
              <input type="hidden" name="delta" value={sizeKg} />
              <button type="submit" class="addbtn" onclick={flyFromThisCard}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 3h2l.4 2M5.5 14h11l3-8H5.4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="8" cy="19" r="1.6" fill="currentColor"/>
    <circle cx="16" cy="19" r="1.6" fill="currentColor"/>
    <path d="M14 7.5v4M12 9.5h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  </svg>
              </button>
            </form>
          )}

          {!isOutOfStock && !hasMultipleSizes && (
            <div class="stepper">
              <form hx-post={`/api/cart/adjust/${product.id}`} hx-target="#cart-count" hx-swap="innerHTML">
                <input type="hidden" name="delta" value={-sizeKg} />
                <button type="submit">−</button>
              </form>
              <b>{currentQtyKg}</b>
              <form hx-post={`/api/cart/adjust/${product.id}`} hx-target="#cart-count" hx-swap="innerHTML">
                <input type="hidden" name="delta" value={sizeKg} />
                <button type="submit" disabled={atMax} onclick={flyFromThisCard}>
                  +
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}