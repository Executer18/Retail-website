import React, { lazy } from 'react';
import type { FC } from 'hono/jsx'

export type ProductCardData = {
  id: number
  name: string
  category: string
  pricePerKg: number
  inStockKg: number
  imageUrl: string | null
}

// Tune this one number to change what counts as "almost out" sitewide.
const LOW_STOCK_THRESHOLD_KG = 5

export const ProductCard: FC<{ product: ProductCardData }> = ({ product }) => {
  const isOutOfStock = product.inStockKg <= 0
  const isLowStock = !isOutOfStock && product.inStockKg <= LOW_STOCK_THRESHOLD_KG

  return (
    <a
      href={`/products/${product.id}`}
      class={`card product-card${isOutOfStock ? ' product-card--out-of-stock' : ''}`}
      style="display: block; text-decoration: none; color: inherit; position: relative;"
    >
      <div class="product-card__image-wrap">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} loading="lazy" />
        ) : (
          <div class="product-card__image-placeholder" aria-hidden="true">
            No image
          </div>
        )}

        {isOutOfStock && <span class="badge badge-collected product-card__stock-tag">Out of stock</span>}
        {isLowStock && (
          <span class="badge product-card__stock-tag product-card__stock-tag--low">
            Only {product.inStockKg}kg left
          </span>
        )}
      </div>

      <div class="card-body">
        <p class="text-muted" style="font-size: 0.8rem; margin-bottom: var(--space-1);">
          {product.category}
        </p>
        <h3 style="font-size: 0.95rem; margin-bottom: var(--space-2);">{product.name}</h3>
        <p class="text-price" style="margin: 0;">
          &#8377;{product.pricePerKg.toFixed(2)}
          <span class="text-muted" style="font-weight: 400; font-size: 0.85rem;">
            {' '}
            /kg
          </span>
        </p>
      </div>
    </a>
  )
}
