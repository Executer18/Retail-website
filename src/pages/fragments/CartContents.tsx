// src/pages/fragments/CartContents.tsx
//
// The INNER part of the cart page — the line-item list plus the running
// total. Split out from CartPage.tsx so update/remove routes can return
// just this fragment for htmx to swap into #cart-contents, without
// re-rendering the whole page (header, footer, etc.) on every quantity
// tap.

import type { FC } from 'hono/jsx'

export type CartRow = {
  cartItemId: number
  productId: number
  quantityKg: number
  name: string
  pricePerKg: number
  imageUrl: string | null
  inStockKg: number
}

export const CartContents: FC<{ items: CartRow[]; total: number }> = ({ items, total }) => {
  if (items.length === 0) {
    return (
      <div id="cart-contents">
        <div class="empty-state">
          <p>Your cart is empty.</p>
          <a href="/products" class="btn btn-primary" style="margin-top: var(--space-4);">
            Browse products
          </a>
        </div>
      </div>
    )
  }

  return (
    <div id="cart-contents">
      <div class="cart-list">
        {items.map((item) => (
          <div class="cart-line">
            <div class="cart-line__image">
              {item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <div class="product-card__image-placeholder">No image</div>}
            </div>

            <div class="cart-line__info">
              <p class="cart-line__name">{item.name}</p>
              <p class="text-muted" style="font-size: 0.85rem;">
                &#8377;{item.pricePerKg.toFixed(2)}/kg
              </p>

              <form
                hx-post={`/api/cart/update/${item.cartItemId}`}
                hx-target="#cart-contents"
                hx-swap="outerHTML"
                class="cart-line__qty-form"
              >
                <input
                  type="number"
                  name="quantityKg"
                  value={item.quantityKg}
                  min="0"
                  max={item.inStockKg}
                  step="0.5"
                  class="cart-line__qty-input"
                  onchange="this.form.requestSubmit()"
                />
                <span class="text-muted" style="font-size: 0.8rem;">
                  kg
                </span>
              </form>
            </div>

            <div class="cart-line__right">
              <p class="text-price" style="font-size: 0.95rem;">
                &#8377;{(item.pricePerKg * item.quantityKg).toFixed(2)}
              </p>
              <button
                type="button"
                class="cart-line__remove"
                hx-post={`/api/cart/remove/${item.cartItemId}`}
                hx-target="#cart-contents"
                hx-swap="outerHTML"
                aria-label={`Remove ${item.name}`}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div class="cart-summary">
        <div class="cart-summary__row">
          <span>Total</span>
          <span class="text-price">&#8377;{total.toFixed(2)}</span>
        </div>
        <a href="/checkout" class="btn btn-primary" style="width: 100%; text-align: center; margin-top: var(--space-4);">
          Proceed to checkout
        </a>
      </div>
    </div>
  )
}
