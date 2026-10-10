// src/pages/OrderLandingPage.tsx
//
// Route: GET /order
//
// "What would you like to do?" — step 1 of Phase 6's HOW TO BUILD list.
// Reuses the exact .order-type-grid/.order-type-card classes already
// built in Phase 5 for the homepage's "Order your way" section — same
// four destinations, just as their own dedicated full-page entry point
// instead of a homepage teaser. If you'd rather not have a separate
// /order page at all (since the homepage already links to all four),
// this file is optional — but having one canonical landing page is
// useful as a direct link for WhatsApp/social bio, etc.
//
// UPDATED per your business decision: "swap wheat for ready atta" no
// longer links to /checkout. That online flow was cut entirely — price
// and weight can't be known until the wheat physically arrives, so it's
// walk-in-only now, same as grind-your-wheat and sell-your-grain. This
// card now points at the Google Maps link instead, same pattern as the
// other two walk-in cards' "Visit now" buttons. If you'd rather this
// card not exist at all until there's a real page behind it, delete the
// whole <a> block below instead of pointing it at Maps — either is
// reasonable, I picked "point at Maps" so the card still tells the
// customer the service exists and where to go for it.

import type { FC } from 'hono/jsx'
import { Layout } from '../components/Layout'
import { SHOP_GOOGLE_MAPS_URL } from '../lib/shop-info'

export const OrderLandingPage: FC = () => {
  return (
    <Layout title="Place an order" description="Choose how you'd like to order.">
      <h1 style="margin-bottom: var(--space-6);">What would you like to do?</h1>

      <div class="order-type-grid">
        <a href="/products" class="order-type-card">
          <span class="order-type-card__icon" aria-hidden="true">
            🛍️
          </span>
          <h3>Buy ready-made</h3>
          <p>Order atta, besan, or sooji straight from stock for pickup.</p>
        </a>
        <a href="/grind-your-wheat" class="order-type-card">
          <span class="order-type-card__icon" aria-hidden="true">
            🌾
          </span>
          <h3>Bring your wheat to grind</h3>
          <p>Drop off your own wheat and collect fresh atta, ground your way.</p>
        </a>
        <a href={SHOP_GOOGLE_MAPS_URL} target="_blank" rel="noopener noreferrer" class="order-type-card">
          <span class="order-type-card__icon" aria-hidden="true">
            🔄
          </span>
          <h3>Swap wheat for ready atta</h3>
          <p>Walk in with your wheat and take our ready-made atta instead — handled at the counter.</p>
        </a>
        <a href="/sell-your-grain" class="order-type-card">
          <span class="order-type-card__icon" aria-hidden="true">
            💰
          </span>
          <h3>Sell your grain to us</h3>
          <p>Bring your wheat or rice in and get a quote on the spot.</p>
        </a>
      </div>
    </Layout>
  )
}
