// src/pages/ProductDetailPage.tsx
//
// Route: GET /products/:id
//
// Bottom-sheet popup (ProductDetailContent) + plain-page fallback for a
// direct visit (ProductDetailPage) — see the note at the bottom of this
// file for how index.tsx should pick between the two.
//
// Size selection is boxed chips, not the shared popup: pick one to
// reveal ITS OWN DetailCartControl (every variant's control is pre-rendered
// here, just hidden via display:none until picked — Layout.tsx's
// selectDetailVariant() toggles that, no network round trip for switching
// sizes). Trying to add before picking a size shows a red "Please select a
// size" message (pure frontend — see requireVariantSelection() in Layout.tsx).
//
// Cart sync: DetailCartControl (id `pd-addrow-{variantId}`) and the size
// box badge (id `pd-vbadge-{variantId}`) are re-sent as out-of-band swaps
// by cart.tsx's renderCardOob() after every add/adjust/update/remove, so
// they always match the grid card and the cart popup.

import type { FC } from 'hono/jsx'
import { Layout } from '../components/Layout'
import { ProductCard, type ProductCardData, type ProductVariant } from '../components/ProductCard'
import { DetailCartControl, DetailVariantBadge } from '../components/DetailCartControl'
import { rupee, formatSize, formatUnitPrice, packPrice } from '../lib/format'

export type ProductDetail = {
  id: number
  name: string
  category: string
  pricePerKg: number
  inStockKg: number
  discountPct: number
  images: string[]
  description?: string | null
  /** From the products.highlights column — pre-split into lines by the route, NOT derived from description. */
  highlights: string[]
  ingredients?: string | null
  /** This product's own pack-size siblings (itself included). Always at least length 1. */
  variants: ProductVariant[]
}

type ProductDetailProps = {
  product: ProductDetail
  sameCategoryProducts: ProductCardData[]
  otherProducts: ProductCardData[]
  /** productId -> quantityKg for the whole session cart — same map every other page uses. */
  cartQuantities: Record<number, number>
}

export const ProductDetailContent: FC<ProductDetailProps> = ({ product, sameCategoryProducts, otherProducts, cartQuantities }) => {
  const images = product.images
  const hasMultipleSizes = product.variants.length > 1
  const primaryVariant = product.variants[0]

  // If one of the sizes is already in the cart, open with it pre-selected so
  // its stepper is visible straight away. Otherwise nothing is selected and
  // the shopper must pick a size first (existing behaviour).
  const selectedId = hasMultipleSizes
    ? product.variants.find((v) => (cartQuantities[v.id] ?? 0) > 0)?.id
    : undefined

  const ingredientList = product.ingredients
    ? product.ingredients
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : []

  return (
    <>
      {/* ---------- Gallery ---------- */}
      <div class="pd-gallery" id="pd-main-img-wrap">
        {product.discountPct > 0 && <span class="pd-off">{product.discountPct}% OFF</span>}
        <div class="pd-track" id="pdTrack">
          {images.length > 0 ? (
            images.map((src, i) => (
              <div class="pd-slide" onclick={`openViewer(${JSON.stringify(images)}, ${i})`}>
                <img src={src} alt={`${product.name} photo ${i + 1}`} />
              </div>
            ))
          ) : (
            <div class="pd-slide" style="display:grid;place-items:center">
              <span aria-hidden="true" style="font-size:70px">
                🌾
              </span>
            </div>
          )}
        </div>
        {images.length > 1 && (
          <div class="pd-dots">
            {images.map((_, i) => (
              <button type="button" class={`pd-dot${i === 0 ? ' on' : ''}`} onclick={`pdGo(${i})`}>
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ---------- Info ---------- */}
      <div class="pd-info">
        <p class="pd-meta">{product.category}</p>
        <h1>{product.name}</h1>
        <div class="pd-price">
          <b>{rupee(packPrice(product.pricePerKg, primaryVariant.sizeKg))}</b>
          {product.discountPct > 0 && (
            <>
              <s>{rupee(packPrice(product.pricePerKg, primaryVariant.sizeKg) / (1 - product.discountPct / 100))}</s>
              <span class="save">{product.discountPct}% OFF</span>
            </>
          )}
          <span class="pd-unit-price">{formatUnitPrice(product.pricePerKg, primaryVariant.sizeKg)}</span>
        </div>

        {/* ---------- Add to cart — right after name+price ---------- */}
        {hasMultipleSizes ? (
          <>
            <div class="variant-box-row">
              {product.variants.map((v) => {
                const vQtyKg = cartQuantities[v.id] ?? 0
                // Can't pick a size that has less than one full pack left —
                // unless it's already in the cart (so it can still be reduced).
                const vOutOfStock = v.inStockKg + 1e-9 < v.sizeKg && vQtyKg === 0
                return (
                  <button
                    type="button"
                    class={`variant-box${vOutOfStock ? ' variant-box--disabled' : ''}${v.id === selectedId ? ' on' : ''}`}
                    disabled={vOutOfStock}
                    onclick={`selectDetailVariant(this, ${v.id})`}
                  >
                    <span class="variant-box__size">{formatSize(v.sizeKg)}</span>
                    <span class="variant-box__price">{rupee(packPrice(v.pricePerKg, v.sizeKg))}</span>
                    {vOutOfStock && <span class="variant-box__oos">Out of stock</span>}
                    <DetailVariantBadge variant={v} qtyKg={vQtyKg} />
                  </button>
                )
              })}
            </div>
            <p id="variant-required-msg" class="variant-required-msg" style="display:none">
              Please select a size
            </p>
            <div id="variant-placeholder-addrow" class="pd-cart" style={selectedId !== undefined ? 'display:none' : undefined}>
              <button type="button" class="pd-cart__add" onclick="requireVariantSelection()">
                 <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="9" cy="20" r="1.5" />
                  <circle cx="18" cy="20" r="1.5" />
                  <path d="M2 3h3l2.6 12.5h11L21 7H6" />
                </svg>
                Add to Cart
                
              </button>
            </div>
            {product.variants.map((v) => (
              <div data-variant-wrap={v.id} style={v.id === selectedId ? undefined : 'display:none'}>
                <DetailCartControl variant={v} qtyKg={cartQuantities[v.id] ?? 0} />
              </div>
            ))}
          </>
        ) : (
          <DetailCartControl variant={primaryVariant} qtyKg={cartQuantities[primaryVariant.id] ?? 0} />
        )}

        {product.highlights.length > 0 && (
          <div class="pd-block">
            <h4>Highlights</h4>
            <ul>
              {product.highlights.map((line) => (
                <li>{line}</li>
              ))}
            </ul>
          </div>
        )}

        {ingredientList.length > 0 && (
          <div class="pd-block">
            <h4>Ingredients</h4>
            <div class="ingchips">
              {ingredientList.map((item) => (
                <span>{item}</span>
              ))}
            </div>
          </div>
        )}

        {product.description && (
          <div class="pd-block">
            <h4>Description</h4>
            <p>{product.description}</p>
          </div>
        )}

        <div class="pd-block">
          <h4>Return & Exchange</h4>
          <p>
            Since every batch is ground fresh to order, we accept return or exchange within <b>2 days of pickup</b> only
            for sealed, unopened packs with the batch slip. Opened flour cannot be restocked for hygiene reasons — but if
            there's a quality issue, bring it back and we'll regrind or replace it free.
          </p>
        </div>
      </div>

      <p class="pd-fine">
        🔒 Your data stays yours — we collect only your name and phone number to manage pickup orders. We never sell or
        share personal information. Payment details (when online payment is enabled) are processed end-to-end by
        Razorpay; we never see or store card numbers.
      </p>

      {/* ---------- Suggestions (same logic as before: same category minus
          this item, then everything outside that category) ---------- */}
      {sameCategoryProducts.length > 0 && (
        <div class="pd-suggest">
          <h4>More {product.category}</h4>
          <div class="pd-suggest-row">
            {sameCategoryProducts.map((p) => (
              <ProductCard product={p} cartQuantities={cartQuantities} />
            ))}
          </div>
        </div>
      )}

      {otherProducts.length > 0 && (
        <div class="pd-suggest">
          <h4>You might also like</h4>
          <div class="pd-suggest-row">
            {otherProducts.map((p) => (
              <ProductCard product={p} cartQuantities={cartQuantities} />
            ))}
          </div>
        </div>
      )}
    </>
  )
}

// Direct-visit fallback (no HX-Request header — see index.tsx). There's
// no grid loaded underneath to pop up over, so this is a plain page.
export const ProductDetailPage: FC<ProductDetailProps> = (props) => {
  return (
    <Layout title={props.product.name} description={props.product.description || `${props.product.name} — fresh, stone-ground.`} active="product" header="search">
      <ProductDetailContent {...props} />
    </Layout>
  )
}