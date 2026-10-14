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

// The ADD / stepper / SELECT SIZE control — pulled out of ProductCard so
// ProductDetailPage can render the exact same thing inline (right after
// the name+price, per your ask) instead of a second, drifting copy of
// the add-to-cart logic. Used two ways:
//   - inside a .pcard grid card: flyOriginExpr defaults to
//     "this.closest('.pcard')", and this control's own id (addrow-{id})
//     sits nested inside the card's id (pcard-{id})
//   - standalone on the product detail page: pass a flyOriginExpr that
//     points at the big gallery image instead (see ProductDetailPage.tsx)
//
// cart.tsx's renderCardOob() emits an OOB update for BOTH id patterns
// after every cart change, so whichever context this is rendered in —
// grid card, detail page, both at once if the sheet is open over the
// grid — stays in sync from one route.
export const AddToCartControl: FC<{
  product: ProductCardData
  currentQtyKg?: number
  flyOriginExpr?: string
  /** Set by cart.tsx's renderCardOob() when re-rendering this as an out-of-band swap into id={`addrow-${product.id}`}. */
  oob?: boolean
}> = ({ product, currentQtyKg = 0, flyOriginExpr = "this.closest('.pcard')", oob = false }) => {
  const isOutOfStock = product.inStockKg <= 0
  const hasMultipleSizes = product.variants.length > 1
  const sizeKg = product.variants[0].sizeKg
  const atMax = currentQtyKg >= product.inStockKg
  const fly = `flyToCart((${flyOriginExpr}).querySelector('img'), (${flyOriginExpr}));toast('Added to cart 🛒')`

  return (
    <div id={`addrow-${product.id}`} class="addrow" hx-swap-oob={oob ? 'true' : undefined}>
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
          <button type="submit" class="addbtn" onclick={fly}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 3h2l.4 2M5.5 14h11l3-8H5.4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              <circle cx="8" cy="19" r="1.6" fill="currentColor" />
              <circle cx="16" cy="19" r="1.6" fill="currentColor" />
              <path d="M14 7.5v4M12 9.5h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
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
            <button type="submit" disabled={atMax} onclick={fly}>
              +
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export const ProductCard: FC<{ product: ProductCardData; currentQtyKg?: number; oob?: boolean }> = ({
  product,
  currentQtyKg = 0,
  oob = false,
}) => {
  const isOutOfStock = product.inStockKg <= 0
  const hasMultipleSizes = product.variants.length > 1
  const sizeKg = product.variants[0].sizeKg
  const inCart = currentQtyKg > 0
  // Opens the bottom-sheet popup instead of navigating: the GET fills
  // #detail-modal-body, the onclick opens the sheet right away (same
  // "don't wait on the response to open" pattern as SELECT SIZE below).

  return (
    <div
      id={`pcard-${product.id}`}
      class={`pcard${isOutOfStock ? ' out-of-stock' : ''}${inCart ? ' in-cart' : ''}`}
      data-id={product.id}
      hx-swap-oob={oob ? 'true' : undefined}
    >
      <div
        class="img"
        style="cursor:pointer"
        hx-get={`/products/${product.id}`}
        hx-target="#detail-modal-body"
        hx-swap="innerHTML"
        onclick="openSheet('detailModal')"
      >
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} loading="lazy" />
        ) : (
          <span aria-hidden="true">🌾</span>
        )}
        {product.discountPct > 0 && <span class="off">{product.discountPct}% OFF</span>}
      </div>

      <div class="body">
        <div
          class="nm"
          style="cursor:pointer"
          hx-get={`/products/${product.id}`}
          hx-target="#detail-modal-body"
          hx-swap="innerHTML"
          onclick="openSheet('detailModal')"
        >
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

        <AddToCartControl product={product} currentQtyKg={currentQtyKg} />
      </div>
    </div>
  )
}