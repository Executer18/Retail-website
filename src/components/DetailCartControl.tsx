// src/components/DetailCartControl.tsx
//
// The add-to-cart control for ProductDetailPage (single-size AND each size
// of a multi-size product). Deliberately separate from ProductCard's
// AddToCartControl:
//   - its DOM id is `pd-addrow-{variantId}`, NOT `addrow-{variantId}`. The
//     grid card sitting behind the popup already owns `addrow-{id}`, and
//     htmx's out-of-band swap always hits the FIRST element with a given id,
//     so a shared id made the popup's control never update.
//   - it is a full-width button / stepper that matches the detail page,
//     not the small round card button.
//
// Both components below are also returned as out-of-band swaps from
// cart.tsx's renderCardOob(), which is what keeps the detail page, the grid
// card, the cart popup and the badge in sync after ANY cart change.

import type { FC } from 'hono/jsx'
import { formatSize, toPackCount } from '../lib/format'
import type { ProductVariant } from './ProductCard'

const EPS = 1e-9

// Fly animation starts from the gallery; toast fires on every add.
const FLY =
  "var o=document.getElementById('pd-main-img-wrap');if(o){flyToCart(o.querySelector('img'),o)}toast('Added to cart 🛒')"

export const DetailCartControl: FC<{
  variant: ProductVariant
  qtyKg: number
  /** Set by cart.tsx's renderCardOob() when re-rendering as an out-of-band swap. */
  oob?: boolean
}> = ({ variant: v, qtyKg, oob = false }) => {
  const packCount = toPackCount(qtyKg, v.sizeKg)
  // Can't ADD when less than one full pack is left. A line already in the
  // cart always keeps its stepper so it can still be reduced.
  const cannotAdd = v.inStockKg + EPS < v.sizeKg
  const atMax = qtyKg + v.sizeKg > v.inStockKg + EPS
  const url = `/api/cart/adjust/${v.id}`
  const sizeLabel = formatSize(v.sizeKg)

  return (
    <div id={`pd-addrow-${v.id}`} class="pd-cart" hx-swap-oob={oob ? 'true' : undefined}>
      {packCount === 0 ? (
        cannotAdd ? (
          <button type="button" class="pd-cart__add" disabled>
            Out of stock
          </button>
        ) : (
          <form hx-post={url} hx-target="#cart-count" hx-swap="innerHTML">
            <input type="hidden" name="delta" value={v.sizeKg} />
            <button type="submit" class="pd-cart__add" onclick={FLY}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="9" cy="20" r="1.5" />
                <circle cx="18" cy="20" r="1.5" />
                <path d="M2 3h3l2.6 12.5h11L21 7H6" />
              </svg>
              Add to Cart
            </button>
          </form>
        )
      ) : (
        <div class="pd-cart__stepper">
          <form hx-post={url} hx-target="#cart-count" hx-swap="innerHTML">
            <input type="hidden" name="delta" value={-v.sizeKg} />
            <button type="submit" aria-label={`Remove one ${sizeLabel} pack`}>
              −
            </button>
          </form>
          <div class="pd-cart__qty">
            <b>{packCount}</b>
            
          </div>
          <form hx-post={url} hx-target="#cart-count" hx-swap="innerHTML">
            <input type="hidden" name="delta" value={v.sizeKg} />
            <button
  type="submit"
  class={atMax ? 'plus is-max' : 'plus'}
  data-avail={toPackCount(v.inStockKg, v.sizeKg)}
  onclick={FLY}
  aria-label={`Add one more ${sizeLabel} pack`}
>
              +
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

// Small count bubble on a size box (ProductDetailPage's boxed variant
// picker). Swapped on its own — NOT the whole box — so the box's
// client-side "selected" state (.on) is never lost when the cart changes.
export const DetailVariantBadge: FC<{
  variant: ProductVariant
  qtyKg: number
  oob?: boolean
}> = ({ variant: v, qtyKg, oob = false }) => {
  const packCount = toPackCount(qtyKg, v.sizeKg)
  return (
    <span id={`pd-vbadge-${v.id}`} class="variant-box__badge" hx-swap-oob={oob ? 'true' : undefined}>
      {packCount > 0 ? String(packCount) : ''}
    </span>
  )
}