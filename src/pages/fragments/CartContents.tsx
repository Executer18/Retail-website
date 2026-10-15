// src/pages/fragments/CartContents.tsx
//
// The INNER part of the cart — rebuilt to match the Annapurna Chakki UI
// (.cart-list / .cart-item / .ci-* / .bill classes from styles.css).
// Used both by the full /cart page and by the cart-modal popup in
// Layout.tsx — same fragment, same route shapes it comes back from.
//
// New vs. the old version (per your ask):
//   - real <img> in the 46x46 .ci-img box, object-fit: cover so it can
//     never overflow (needs a couple of new CSS rules — see
//     cart-ui-additions.css)
//   - bin-icon-only remove button, pinned to the top-right corner of
//     the row (new .ci-remove CSS)
//   - quantity control is now "− [editable input] +" instead of a bare
//     number you had to type blind; the + button is disabled once
//     quantityKg === inStockKg, and `warning` (set by the update route
//     when it had to clamp) renders an inline message under that row
//   - MRP / discount / total bill block, using the new mrpPerKg +
//     discountPct fields cart.tsx now computes from products.discount

import type { FC } from 'hono/jsx'
import { rupee, formatUnitPrice, toPackCount } from '../../lib/format'

export type CartRow = {
  cartItemId: number
  productId: number
  quantityKg: number
  name: string
  pricePerKg: number
  /** Pre-discount per-kg price, derived from products.discount. Equals pricePerKg when discountPct is 0. */
  mrpPerKg: number
  /** Percent off, straight from products.discount (0 when null/absent). */
  discountPct: number
  imageUrl: string | null
  inStockKg: number
  /** This product's pack size in kg — the +/- stepper below steps by this amount, not a fixed 0.5kg, so a 5kg pack moves by 5kg per tap. */
  sizeKg: number
  /** Set only on the row the update route just clamped, e.g. "Only 3kg available — adjusted." */
  warning?: string
}

export type CartContentsProps = {
  items: CartRow[]
  total: number
  totalMrp: number
  totalSavings: number
}

const BinIcon: FC = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
)

/** 0.05 → "50g", 0.5 → "500g", 2 → "2kg", 1.5 → "1.5kg" */
const formatQty = (kg: number): string => {
  if (kg < 1) return `${Math.round(kg * 1000)}g`
  return `${Math.round(kg * 1000) / 1000}kg`
}

export const CartContents: FC<CartContentsProps> = ({ items, total, totalMrp, totalSavings }) => {
  if (items.length === 0) {
    return (
      <div id="cart-contents">
        <div class="cart-empty">
          <span class="em">🛒</span>
          <b>Your cart is empty</b>
          <p style="font-size:12px;margin-top:4px">
            <a href="/products" style="color:var(--color-primary);font-weight:700">
              Browse products →
            </a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div id="cart-contents">
      <div class="cart-list">
        {items.map((item) => {
          const atMax = item.quantityKg >= item.inStockKg
          return (
            <div class="cart-item">
              <div class="ci-img">
                {item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <span aria-hidden="true">🌾</span>}
              </div>

              <div class="ci-mid">
                <b>
  {item.name}{' '} {' '}
  <small style="font-weight:500;color:var(--color-muted)">· {formatQty(item.quantityKg)}</small>
</b>
                <span>
                  {item.discountPct > 0 ? (
                    <>
                      <s style="color:var(--color-muted);margin-right:4px">{formatUnitPrice(item.mrpPerKg, item.sizeKg)}</s>
                      {formatUnitPrice(item.pricePerKg, item.sizeKg)}
                      <span class="save-tag">{item.discountPct}% OFF</span>
                    </>
                  ) : (
                    <>{formatUnitPrice(item.pricePerKg, item.sizeKg)}</>
                  )}
                </span>

                <form
                  hx-post={`/api/cart/update/${item.cartItemId}`}
                  hx-target="#cart-contents"
                  hx-swap="outerHTML"
                  class="ci-step"
                >
                  {/* The server still expects quantityKg in actual kg — this
                      hidden field is what's actually submitted, kept in sync
                      with the visible pack-count input by bumpQty()/
                      syncPackQtyHidden() in Layout.tsx. The visible input
                      itself has no `name`, so it's never submitted directly. */}
                  <input type="hidden" name="quantityKg" class="ci-step__kg-hidden" value={item.quantityKg} />
                  <button type="button" class="ci-step__btn" onclick="bumpQty(this,-1)" aria-label={`Decrease ${item.name} quantity`}>
                    −
                  </button>
                  <input
                    type="number"
                    value={toPackCount(item.quantityKg, item.sizeKg)}
                    min="0"
                    max={toPackCount(item.inStockKg, item.sizeKg)}
                    step="1"
                    data-size-kg={item.sizeKg}
                    class="ci-step__input"
                    onchange="syncPackQtyHidden(this.form, this);this.form.requestSubmit()"
                    aria-label={`${item.name} quantity`}
                  />
                  <button
                    type="button"
                    class="ci-step__btn"
                    onclick="bumpQty(this,1)"
                    disabled={atMax}
                    aria-label={`Increase ${item.name} quantity`}
                  >
                    +
                  </button>
                </form>
                {(item.warning || atMax) && (
                  <p class="ci-warn">{item.warning ?? `Only ${item.inStockKg}kg available.`}</p>
                )}
              </div>

              <div class="ci-price">{rupee(item.pricePerKg * item.quantityKg)}</div>

              <button
                type="button"
                class="ci-remove"
                hx-post={`/api/cart/remove/${item.cartItemId}`}
                hx-target="#cart-contents"
                hx-swap="outerHTML"
                aria-label={`Remove ${item.name}`}
              >
                <BinIcon />
              </button>
            </div>
          )
        })}
      </div>

      <div class="bill">
        <div class="row">
          <span>Total MRP</span>
          <b>
            <s style="color:var(--color-muted)">{rupee(totalMrp)}</s>
          </b>
        </div>
        <div class="row save">
          <span>Discount on MRP</span>
          <b>− {rupee(totalSavings)}</b> 
        </div>
        <div class="row">
          <span>Store pickup</span>
          <b style="color:var(--color-success)">FREE</b>
        </div>
        <div class="row total">
          <span>To Pay</span>
          <b>{rupee(total)}</b>
        </div>
      </div>

      <a href="/checkout" class="modal-go" style="display:block;text-align:center;text-decoration:none">
        Proceed to Checkout · {rupee(total)}
      </a>
    </div>
  )
}



