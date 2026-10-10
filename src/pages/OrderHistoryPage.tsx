// src/pages/OrderHistoryPage.tsx
//
// Route: GET /orders
//
// Uses the same badge-per-status classes from your design system
// (badge-reserved/confirmed/preparing/ready/collected/cancelled) so an
// order's status reads consistently with wherever else statuses show up
// (admin, if that also lists orders).

import type { FC } from 'hono/jsx'
import { Layout } from '../components/Layout'

type OrderRow = {
  orderId: number
  status: string
  pickupTime: string
  isWheatSwap: boolean
}

export const OrderHistoryPage: FC<{ orders: OrderRow[] }> = ({ orders }) => {
  return (
    <Layout title="Your orders" description="Your order history.">
      <h1 style="margin-bottom: var(--space-5);">Your orders</h1>

      {orders.length > 0 ? (
        <div class="order-history-list">
          {orders.map((order) => (
            <a href={`/orders/${order.orderId}`} class="order-history-row">
              <div>
                <p class="order-history-row__id">Order #{order.orderId}</p>
                <p class="text-muted" style="font-size: 0.85rem;">
                  Pickup: {order.pickupTime}
                  {order.isWheatSwap && ' · Wheat swap'}
                </p>
              </div>
              <span class={`badge badge-${order.status}`}>{order.status}</span>
            </a>
          ))}
        </div>
      ) : (
        <div class="empty-state">
          <p>No orders yet.</p>
          <a href="/products" class="btn btn-primary" style="margin-top: var(--space-4);">
            Browse products
          </a>
        </div>
      )}
    </Layout>
  )
}
