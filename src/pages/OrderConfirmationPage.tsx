// src/pages/OrderConfirmationPage.tsx
//
// Route: shown directly from POST /checkout's response (not its own GET
// route) — this is the page the customer lands on right after placing an
// order. It shows the order number and pickup time so they have both
// before they navigate away.

import type { FC } from 'hono/jsx'
import { Layout } from '../components/Layout'

export const OrderConfirmationPage: FC<{ orderId: number; pickupTime: string }> = ({ orderId, pickupTime }) => {
  return (
    <Layout title="Order confirmed" description="Your order has been placed.">
      <div class="order-confirmation">
        <span class="order-confirmation__check" aria-hidden="true">
          &#10003;
        </span>
        <h1>Order placed</h1>
        <p class="text-muted">Show your order number at the counter when you come to collect.</p>

        <div class="order-confirmation__details">
          <div class="order-confirmation__row">
            <span class="text-muted">Order number</span>
            <span class="order-confirmation__value">#{orderId}</span>
          </div>
          <div class="order-confirmation__row">
            <span class="text-muted">Pickup time</span>
            <span class="order-confirmation__value">{pickupTime}</span>
          </div>
        </div>

        <div style="margin-top: var(--space-6); display: flex; gap: var(--space-3); justify-content: center;">
          <a href="/orders" class="btn btn-secondary">
            View order history
          </a>
          <a href="/products" class="btn btn-primary">
            Continue shopping
          </a>
        </div>
      </div>
    </Layout>
  )
}
