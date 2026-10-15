import type { FC } from 'hono/jsx'
import { rupee, formatSize, formatUnitPrice, packPrice, toPackCount } from '../lib/format'

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
  /** Every pack size for this item (same itemName — see product-variants.ts). ProductCard reads the whole list (for its chip row); AddToCartControl only ever looks at variants[0] — see its own note below. */
  variants: ProductVariant[]
}

// The ADD / stepper for exactly ONE variant — this never shows a size
// picker itself (ProductCard's chip row and ProductDetailPage's variant
// boxes handle picking; this just adds/steps whichever single variant
// its caller already decided on). Only variants[0] is ever read, so
// callers representing "one specific variant" (ProductDetailPage, and
// cart.tsx's renderCardOob) must pass a `variants` array containing
// just that one — don't pass a whole multi-size family here.
//
// Shows PACK COUNT (1, 2, 3…), not raw kilograms: delta sent to the
// server is still the variant's sizeKg in kg (so cart totals stay
// correct), only the number printed in the stepper is converted via
// toPackCount.
export const AddToCartControl: FC<{
  product: ProductCardData
  currentQtyKg?: number
  flyOriginExpr?: string
  /** Set by cart.tsx's renderCardOob() when re-rendering this as an out-of-band swap into id={`addrow-${product.id}`}. */
  oob?: boolean
}> = ({ product, currentQtyKg = 0, flyOriginExpr = "this.closest('.pcard')", oob = false }) => {
  const isOutOfStock = product.inStockKg <= 0
  const sizeKg = product.variants[0].sizeKg
  const packCount = toPackCount(currentQtyKg, sizeKg)
  const atMax = currentQtyKg >= product.inStockKg
  const fly = `flyToCart((${flyOriginExpr}).querySelector('img'), (${flyOriginExpr}));toast('Added to cart 🛒')`

  return (
    <div id={`addrow-${product.id}`} class="addrow" hx-swap-oob={oob ? 'true' : undefined}>
      {isOutOfStock ? (
        <button class="addbtn" disabled style="opacity:.5">
          Out of stock
        </button>
      ) : packCount === 0 ? (
        <form hx-post={`/api/cart/adjust/${product.id}`} hx-target="#cart-count" hx-swap="innerHTML">
          <input type="hidden" name="delta" value={sizeKg} />
          <button type="submit" class="addbtn" onclick={fly}>
           <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
               <circle cx="9" cy="20" r="1.5" />
                <circle cx="18" cy="20" r="1.5" />
                <path d="M2 3h3l2.6 12.5h11L21 7H6" />
              </svg> 
              Add to Cart
          </button>
        </form>
      ) : null}

      {!isOutOfStock && packCount > 0 && (
        <div class="stepper">
          <form hx-post={`/api/cart/adjust/${product.id}`} hx-target="#cart-count" hx-swap="innerHTML">
            <input type="hidden" name="delta" value={-sizeKg} />
            <button type="submit">−</button>
          </form>
          <b>{packCount}</b>
         
        <form hx-post={`/api/cart/adjust/${product.id}`} hx-target="#cart-count" hx-swap="innerHTML">
            <input type="hidden" name="delta" value={sizeKg} />
            <button
  type="submit"
  class={atMax ? 'plus is-max' : 'plus'}
  data-avail={toPackCount(product.inStockKg, sizeKg)}
  onclick={fly}
>
              +
            </button>
          </form>

          
        </div>
      )}
    </div>
  )
}

export const ProductCard: FC<{
  product: ProductCardData
  /** productId -> quantityKg for the WHOLE session cart, not just this card's primary variant — a multi-size card needs every sibling's own qty for its chip badges. */
  cartQuantities: Record<number, number>
  oob?: boolean
}> = ({ product, cartQuantities, oob = false }) => {
  const isOutOfStock = product.inStockKg <= 0
  const hasMultipleSizes = product.variants.length > 1
  const primaryVariant = product.variants[0]
  const currentQtyKg = cartQuantities[product.id] ?? 0
  const inCart = currentQtyKg > 0
  const flyExpr = "this.closest('.pcard')"

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

        <div class="pr">
          {rupee(packPrice(product.pricePerKg, primaryVariant.sizeKg))}
          {product.discountPct > 0 && (
            <s>{rupee(packPrice(product.pricePerKg, primaryVariant.sizeKg) / (1 - product.discountPct / 100))}</s>
          )}
        </div>
        <div class="unit-price">{formatUnitPrice(product.pricePerKg, primaryVariant.sizeKg)}</div>

        {hasMultipleSizes ? (
          <div class="variant-chip-row">
            {product.variants.map((v) => {
              const vQtyKg = cartQuantities[v.id] ?? 0
              const vPackCount = toPackCount(vQtyKg, v.sizeKg)
              const vOutOfStock = v.inStockKg <= 0
              return (
                <form hx-post={`/api/cart/adjust/${v.id}`} hx-target="#cart-count" hx-swap="innerHTML">
                  <input type="hidden" name="delta" value={v.sizeKg} />
                  <button
                    type="submit"
                    class={`variant-chip${vPackCount > 0 ? ' has-qty' : ''}`}
                    disabled={vOutOfStock}
                    data-avail={toPackCount(v.inStockKg, v.sizeKg)}
                    onclick={vOutOfStock ? undefined : `flyToCart((${flyExpr}).querySelector('img'), (${flyExpr}));toast('Added to cart 🛒')`}
                  >
                    <span class="variant-chip__size">{formatSize(v.sizeKg)}</span>
                    <span class="variant-chip__price">{rupee(packPrice(v.pricePerKg, v.sizeKg))}</span>
                    {vPackCount > 0 && <span class="variant-chip__badge">{vPackCount}</span>}
                  </button>
                </form>
              )
            })}
          </div>
        ) : (
          <AddToCartControl product={product} currentQtyKg={currentQtyKg} />
        )}
      </div>
    </div>
  )
}