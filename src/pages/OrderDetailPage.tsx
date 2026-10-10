// src/pages/OrderDetailPage.tsx
//
// Route: GET /orders/:id

import type { FC } from 'hono/jsx'
import { Layout } from '../components/Layout'

type OrderDetailItem = {
  productId: number
  quantityKg: number
  pricePerKgAtPurchase: number
  name: string
}

type OrderDetail = {
  orderId: number
  status: string
  pickupTime: string
  customerName: string
  customerPhone: string
  isWheatSwap: boolean
  wheatSwapNote: string | null
}

export const OrderDetailPage: FC<{ order: OrderDetail; items: OrderDetailItem[] }> = ({ order, items }) => {
  const total = items.reduce((sum, item) => sum + item.pricePerKgAtPurchase * item.quantityKg, 0)

  return (
    <Layout title={`Order #${order.orderId}`} description="Order details.">
      <a href="/orders" class="detail-topbar__home" style="display: inline-block; margin-bottom: var(--space-4);">
        &#8592; Back to orders
      </a>

      <div class="section-heading">
        <h1 style="margin: 0;">Order #{order.orderId}</h1>
        <span class={`badge badge-${order.status}`}>{order.status}</span>
      </div>

      <div class="order-confirmation__details" style="margin-bottom: var(--space-6);">
        <div class="order-confirmation__row">
          <span class="text-muted">Pickup time</span>
          <span class="order-confirmation__value">{order.pickupTime}</span>
        </div>
        <div class="order-confirmation__row">
          <span class="text-muted">Name</span>
          <span class="order-confirmation__value">{order.customerName}</span>
        </div>
        <div class="order-confirmation__row">
          <span class="text-muted">Phone</span>
          <span class="order-confirmation__value">{order.customerPhone}</span>
        </div>
        {order.isWheatSwap && (
          <div class="order-confirmation__row">
            <span class="text-muted">Wheat swap note</span>
            <span class="order-confirmation__value">{order.wheatSwapNote || '—'}</span>
          </div>
        )}
      </div>

      <div class="checkout-summary">
        {items.map((item) => (
          <div class="checkout-summary__row">
            <span>
              {item.name} &times; {item.quantityKg}kg
            </span>
            <span>&#8377;{(item.pricePerKgAtPurchase * item.quantityKg).toFixed(2)}</span>
          </div>
        ))}
        <div class="checkout-summary__row checkout-summary__total">
          <span>Total</span>
          <span class="text-price">&#8377;{total.toFixed(2)}</span>
        </div>
      </div>
    </Layout>
  )
}
