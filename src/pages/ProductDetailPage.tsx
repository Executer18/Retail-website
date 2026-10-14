// src/pages/ProductDetailPage.tsx
//
// Route: GET /products/:id
//
// Rebuilt as a bottom-sheet popup instead of a standalone page, per your
// ask. Two exports:
//   - ProductDetailContent: the actual content, no Layout wrapper. This
//     is what index.tsx returns for an htmx request (ProductCard's click
//     hx-gets this route and swaps the result into Layout's
//     #detail-modal-body — see Layout.tsx's #detailModal).
//   - ProductDetailPage: ProductDetailContent wrapped in Layout, for a
//     DIRECT visit to /products/:id (shared link, new tab, no htmx
//     header on the request) — there's no grid underneath to show a
//     popup "over", so this degrades to a plain full page rather than
//     an empty/broken sheet. index.tsx picks between the two based on
//     the HX-Request header — see the note at the bottom of this file.
//
// Changes from the old version, per your ask:
//   - gallery box uses the OLD stylesheet's containment technique
//     (fixed aspect-ratio + object-fit:cover) instead of the mockup's
//     fixed height:300px, so it can't distort regardless of the source
//     photo's own aspect ratio
//   - numbered dots (mockup's own .pd-dot is already "1,2,3…" style —
//     no change needed there, just stopped using the old plain-dot CSS)
//   - fullscreen viewer ported from the mockup's openViewer/viewerGo,
//     adapted for real photos (object-fit:contain, not an emoji glyph)
//   - "Highlights" now reads product.highlights (a real column) instead
//     of being derived by splitting the description into lines — ADD A
//     highlights COLUMN TO products IN schema.ts, this won't compile
//     against your current schema otherwise. Assumed newline-separated
//     text, same convention the old description-splitting code used.
//   - Add to Cart moved inline, right after name+price — no more fixed
//     bottom buy-bar. It's the exact same AddToCartControl ProductCard
//     uses (imported, not reimplemented), so the stepper, out-of-stock
//     state, size-variant picker, max-quantity warning, and fly-to-cart
//     animation are automatically identical to the grid — cart.tsx's
//     renderCardOob() already keeps both in sync after any change.
//   - mockup's exact return/exchange and data-privacy copy from
//     product.html, swapped in for the old page's generic placeholder text

import type { FC } from 'hono/jsx'
import { Layout } from '../components/Layout'
import { ProductCard, AddToCartControl, type ProductCardData, type ProductVariant } from '../components/ProductCard'
import { rupee } from '../lib/format'

export type ProductDetail = {
  id: number
  name: string
  category: string
  pricePerKg: number
  inStockKg: number
  discountPct: number
  images: string[]
  description?: string | null
  /** From the new products.highlights column — pre-split into lines by the route, NOT derived from description. */
  highlights: string[]
  ingredients?: string | null
  /** This product's own pack-size siblings, for the inline add-to-cart control (SELECT SIZE when length > 1). Always includes this product itself. */
  variants: ProductVariant[]
}

type ProductDetailProps = {
  product: ProductDetail
  sameCategoryProducts: ProductCardData[]
  otherProducts: ProductCardData[]
  /** productId -> quantityKg in the session's cart — same map HomePage/ProductsListPage use, needed here for both the main product and the suggestion cards. */
  cartQuantities: Record<number, number>
}

export const ProductDetailContent: FC<ProductDetailProps> = ({ product, sameCategoryProducts, otherProducts, cartQuantities }) => {
  const images = product.images
  const ingredientList = product.ingredients
    ? product.ingredients
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : []

  const cardData: ProductCardData = {
    id: product.id,
    name: product.name,
    category: product.category,
    pricePerKg: product.pricePerKg,
    inStockKg: product.inStockKg,
    discountPct: product.discountPct,
    imageUrl: images[0] ?? null,
    variants: product.variants,
  }
  const currentQtyKg = cartQuantities[product.id] ?? 0

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
          <b>{rupee(product.pricePerKg)}</b>
          {product.discountPct > 0 && (
            <>
              <s>{rupee(product.pricePerKg / (1 - product.discountPct / 100))}</s>
              <span class="save">{product.discountPct}% OFF</span>
            </>
          )}
        </div>

        {/* Add to cart — right after name+price, not a fixed buy-bar.
            Same control the grid card uses; flyOriginExpr points at the
            gallery above instead of a .pcard ancestor since there isn't
            one here. */}
        <AddToCartControl product={cardData} currentQtyKg={currentQtyKg} flyOriginExpr="document.getElementById('pd-main-img-wrap')" />

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

      {/* ---------- Suggestions ---------- */}
      {sameCategoryProducts.length > 0 && (
        <div class="pd-suggest">
          <h4>More {product.category}</h4>
          <div class="pd-suggest-row">
            {sameCategoryProducts.map((p) => (
              <ProductCard product={p} currentQtyKg={cartQuantities[p.id] ?? 0} />
            ))}
          </div>
        </div>
      )}

      {otherProducts.length > 0 && (
        <div class="pd-suggest">
          <h4>You might also like</h4>
          <div class="pd-suggest-row">
            {otherProducts.map((p) => (
              <ProductCard product={p} currentQtyKg={cartQuantities[p.id] ?? 0} />
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