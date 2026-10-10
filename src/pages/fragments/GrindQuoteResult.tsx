// src/pages/fragments/GrindQuoteResult.tsx
//
// The htmx-swapped result for the grind calculator. Includes the "Visit
// now" button per your decision — a plain outbound link to Google Maps,
// not a form submission, since nothing here gets saved.

import type { FC } from 'hono/jsx'
import type { GrindQuote } from '../../lib/grain-pricing'
import { SHOP_GOOGLE_MAPS_URL } from '../../lib/shop-info'

export const GrindQuoteResult: FC<{ quote: GrindQuote }> = ({ quote }) => {
  return (
    <div class="quote-result">
      <p class="quote-result__heading">Estimate for {quote.inputKg}kg of {quote.grainLabel}</p>

      <div class="quote-result__row">
        <span class="text-muted">Grinding fee</span>
        <span class="order-confirmation__value">&#8377;{quote.feeAmount.toFixed(2)}</span>
      </div>
      <div class="quote-result__row">
        <span class="text-muted">Grain kept as cut</span>
        <span class="order-confirmation__value">{quote.cutKg.toFixed(2)}kg</span>
      </div>
      <div class="quote-result__row quote-result__row--highlight">
        <span>You take home</span>
        <span class="text-price">{quote.outputKg.toFixed(2)}kg atta</span>
      </div>

      <p class="text-muted" style="font-size: 0.8rem; margin-top: var(--space-3);">
        Final amount depends on your grain's quality — confirmed in person.
      </p>

      <a href={SHOP_GOOGLE_MAPS_URL} target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="width: 100%; text-align: center; margin-top: var(--space-4);">
        Visit now
      </a>
    </div>
  )
}
