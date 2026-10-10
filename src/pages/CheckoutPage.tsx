// src/pages/CheckoutPage.tsx
//
// Route: GET /checkout (only reachable once logged in — see checkout.ts)
//
// Includes the bring-wheat-buy-atta toggle directly in this same form
// (Task 8) — per your plan, it's "the retail flow plus a toggle/note
// field," not a separate page. Checking the toggle reveals a note
// textarea via plain CSS (:checked ~ .wheat-swap-note), no JS needed.

import type { FC } from 'hono/jsx'
import { Layout } from '../components/Layout'
import type { PickupSlot } from '../lib/pickup-slots'

type CheckoutItem = {
  productId: number
  quantityKg: number
  name: string
  pricePerKg: number
}

export const CheckoutPage: FC<{ items: CheckoutItem[]; total: number; slots: PickupSlot[] }> = ({
  items,
  total,
  slots,
}) => {
  return (
    <Layout title="Checkout" description="Confirm your order and pickup time.">
      <h1 style="margin-bottom: var(--space-5);">Checkout</h1>

      <div class="checkout-summary">
        {items.map((item) => (
          <div class="checkout-summary__row">
            <span>
              {item.name} &times; {item.quantityKg}kg
            </span>
            <span>&#8377;{(item.pricePerKg * item.quantityKg).toFixed(2)}</span>
          </div>
        ))}
        <div class="checkout-summary__row checkout-summary__total">
          <span>Total</span>
          <span class="text-price">&#8377;{total.toFixed(2)}</span>
        </div>
      </div>

      <form method="post" action="/checkout" class="checkout-form">
        <label class="form-field">
          <span>Name</span>
          <input type="text" name="customerName" required />
        </label>

        <label class="form-field">
          <span>Phone number</span>
          <input type="tel" name="customerPhone" required pattern="[0-9]{10}" placeholder="10-digit mobile number" />
        </label>

        <label class="form-field">
          <span>Pickup time</span>
          <select name="pickupSlot" required>
            {slots.map((slot) => (
              <option value={slot.value}>{slot.label}</option>
            ))}
          </select>
        </label>

        {/* ---------- Bring-wheat-buy-atta toggle (Task 8) ---------- */}
        <div class="wheat-swap-toggle">
          <label class="form-field form-field--checkbox">
            <input type="checkbox" name="isWheatSwap" class="wheat-swap-checkbox" />
            <span>I'm bringing my own wheat and taking ready-made atta instead</span>
          </label>

          <div class="wheat-swap-note">
            <label class="form-field">
              <span>Note for the shop (how much wheat, any preference)</span>
              <textarea name="wheatSwapNote" rows={3} placeholder="e.g. Bringing ~10kg wheat, prefer coarse atta"></textarea>
            </label>
          </div>
        </div>

        <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: var(--space-5);">
          Place order
        </button>
      </form>
    </Layout>
  )
}
