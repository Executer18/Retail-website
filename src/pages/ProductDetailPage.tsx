import React, { use } from 'react';
import type { FC } from 'hono/jsx'
import { Layout } from '../components/Layout'
import { ProductCard, type ProductCardData } from '../components/ProductCard'

export type ProductDetail = {
  id: number
  name: string
  category: string
  pricePerKg: number
  inStockKg: number
  images: string[]
  description?: string | null
  ingredients?: string | null
}

const LOW_STOCK_THRESHOLD_KG = 5

export const ProductDetailPage: FC<{
  product: ProductDetail
  sameCategoryProducts: ProductCardData[]
  otherProducts: ProductCardData[]
}> = ({ product, sameCategoryProducts, otherProducts }) => {
  const isOutOfStock = product.inStockKg <= 0
  const isLowStock = !isOutOfStock && product.inStockKg <= LOW_STOCK_THRESHOLD_KG
  const images = product.images.length > 0 ? product.images : [null]

  const highlights = product.description
    ? product.description
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
    : []

  const ingredientList = product.ingredients
    ? product.ingredients
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : []

  return (
    <Layout title={product.name} description={product.description || `${product.name} — fresh from Atta Chakki.`}>
      <div class="product-detail-page">
        {/* ---------- Top bar: back control ---------- */}
        <div class="detail-topbar">
          <a href="/products" class="detail-topbar__back" aria-label="Back to products">
            &#8592;
          </a>
          <a href="/" class="detail-topbar__home" aria-label="Back to home">
            Home
          </a>
        </div>

        <div class="product-detail">
          {/* ---------- Gallery ---------- */}
          <div class="gallery">
            <div class="gallery__scroller" id="gallery-scroller">
              {images.map((src, i) => (
                <div class="gallery__slide" data-open-viewer data-index={i}>
                  {src ? (
                    <img src={src} alt={`${product.name} photo ${i + 1}`} />
                  ) : (
                    <div class="product-card__image-placeholder" style="height: 100%;">
                      No image
                    </div>
                  )}
                </div>
              ))}
            </div>

            {images.length > 1 && (
              <div class="gallery__dots" id="gallery-dots">
                {images.map((_, i) => (
                  <span class={`gallery__dot${i === 0 ? ' is-active' : ''}`}></span>
                ))}
              </div>
            )}
          </div>

          {/* ---------- Info panel ---------- */}
          <div>
            <p class="product-detail__category">{product.category}</p>
            <h1 class="product-detail__name">{product.name}</h1>
            <p class="product-detail__price text-price">
              &#8377;{product.pricePerKg.toFixed(2)}{' '}
              <span class="text-muted" style="font-size: 0.95rem; font-weight: 400;">
                /kg
              </span>
            </p>

            {isOutOfStock && <p class="stock-note stock-note--out">Out of stock right now</p>}
            {isLowStock && <p class="stock-note stock-note--low">Only {product.inStockKg}kg left</p>}
            {!isOutOfStock && !isLowStock && <p class="stock-note stock-note--ok">In stock</p>}

            {/* ---------- Highlights ---------- */}
            {highlights.length > 0 && (
              <div class="product-detail__section">
                <h3>Highlights</h3>
                <ul class="highlight-list">
                  {highlights.map((line) => (
                    <li>{line}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* ---------- Ingredients ---------- */}
            {ingredientList.length > 0 && (
              <div class="product-detail__section">
                <h3>Ingredients</h3>
                <ul class="pill-list">
                  {ingredientList.map((item) => (
                    <li>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* ---------- Full description ---------- */}
            {product.description && (
              <div class="product-detail__section">
                <h3>Product description</h3>
                <p class="text-muted" style="line-height: 1.6;">
                  {product.description}
                </p>
              </div>
            )}

            {/* ---------- Static policy sections (fixed copy, edit directly) ---------- */}
            <div class="product-detail__section">
              <h3>Return policy</h3>
              <p class="text-muted" style="line-height: 1.6;">
                Pickup orders can be exchanged at the counter within 24 hours if the packet is unopened. Ground-to-order
                atta cannot be returned once collected.
              </p>
            </div>

            <div class="product-detail__section">
              <h3>Legal information</h3>
              <p class="text-muted" style="line-height: 1.6;">
                Packed and sold in accordance with local food safety regulations. Store in a cool, dry place away from
                direct sunlight.
              </p>
            </div>

            <div class="product-detail__section">
              <h3>Seller information</h3>
              <p class="text-muted" style="line-height: 1.6;">
                Sold by Atta Chakki. For questions about this product, visit the store or use the contact page.
              </p>
            </div>
          </div>
        </div>

        {/* ---------- Suggestions ---------- */}
        {sameCategoryProducts.length > 0 && (
          <div class="suggestions">
            <div class="section-heading">
              <h2>More {product.category}</h2>
            </div>
            <div class="suggestions__scroller">
              {sameCategoryProducts.map((p) => (
                <ProductCard product={p} />
              ))}
            </div>
          </div>
        )}

        {otherProducts.length > 0 && (
          <div class="suggestions">
            <div class="section-heading">
              <h2>You might also like</h2>
            </div>
            <div class="suggestions__scroller">
              {otherProducts.map((p) => (
                <ProductCard product={p} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ---------- Fixed bottom bar: price + qty + add to cart ---------- */}
      {!isOutOfStock && (
        <div class="sticky-cart-bar">
          <div class="qty-stepper" data-qty-stepper data-max={product.inStockKg} data-price-per-kg={product.pricePerKg}>
            <button type="button" data-qty-decrease disabled>
              −
            </button>
            <span class="qty-stepper__value" data-qty-value>
              1
            </span>
            <button type="button" data-qty-increase>
              +
            </button>
          </div>

          <div class="sticky-cart-bar__price">
            <span class="sticky-cart-bar__total text-price" data-cart-line-total>
              &#8377;{product.pricePerKg.toFixed(2)}
            </span>
            <span class="text-muted" style="font-size: 0.75rem;">
              &#8377;{product.pricePerKg.toFixed(2)}/kg
            </span>
          </div>

          <button
            type="button"
            class="btn "
            hx-post={`/api/cart/add/${product.id}`}
            hx-vals="js:{quantityKg: document.querySelector('[data-qty-value]').textContent}"
            hx-target="#cart-count"
            hx-swap="innerHTML"
          >
            Add to cart
          </button>
        </div>
      )}

      {isOutOfStock && (
        <div class="sticky-cart-bar sticky-cart-bar--disabled">
          <span class="text-muted">Currently out of stock</span>
        </div>
      )}

      {/* ---------- Fullscreen image viewer ---------- */}
      <div class="image-viewer" id="image-viewer">
        <button type="button" class="image-viewer__close" id="image-viewer-close" aria-label="Close">
          &#10005;
        </button>
        <div class="image-viewer__scroller" id="image-viewer-scroller">
          {images.map((src, i) =>
            src ? (
              <div class="image-viewer__slide">
                <img src={src} alt={`${product.name} photo ${i + 1}, full view`} />
              </div>
            ) : null
          )}
        </div>
      </div>

      <script src="/product-detail.js"></script>
    </Layout>
  )
}
