// src/pages/fragments/SellQuoteResult.tsx

import type { FC } from 'hono/jsx'
import type { SellQuote } from '../../lib/grain-pricing'
import { SHOP_GOOGLE_MAPS_URL } from '../../lib/shop-info'

export const SellQuoteResult: FC<{ quote: SellQuote }> = ({ quote }) => {
  return (
    <div class="quote-result">
      <p class="quote-result__heading">Estimate for {quote.inputKg}kg of {quote.grainLabel}</p>

      <div class="quote-result__row quote-result__row--highlight">
        <span>You'll receive</span>
        <span class="text-price">&#8377;{quote.totalAmount.toFixed(2)}</span>
      </div>

      <p class="text-muted" style="font-size: 0.8rem; margin-top: var(--space-3);">
        Final price depends on your grain's quality — confirmed in person.
      </p>

      <a href={SHOP_GOOGLE_MAPS_URL} target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="width: 100%; text-align: center; margin-top: var(--space-4);">
        Visit now
      </a>
    </div>
  )
}
