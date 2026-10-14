// src/pages/OrderHistoryPage.tsx
//
// Route: GET /orders
//
// Each card: pickup date + time as the main text, status pill top-right,
// a fixed-size image mosaic of the products in the order, item count,
// the payment line (Paid / Pay at pickup / Payment pending / Order cancelled)
// and a "View details" button (the whole card is clickable).

import type { FC } from 'hono/jsx'
import { Layout } from '../components/Layout'
import { rupee } from '../lib/checkout-ui'
import { ACCOUNT_URL, ORDERS_CSS, paymentInfo, pickupText, statusPill } from '../lib/orders-ui'

export type OrderCardItem = {
  name: string
  imageUrl: string | null
}

export type OrderCard = {
  orderId: number
  status: string
  pickupSlot: string
  totalAmount: number
  paymentMethod: string // "counter" | "online"
  paymentStatus: string // "unpaid" | "paid"
  itemCount: number // number of lines in the order
  items: OrderCardItem[] // first few lines, only used for the thumbnail box
}

// Up to 4 cells. With more than 4 products: first 3 images + a "+N" cell.
const Mosaic: FC<{ items: OrderCardItem[]; itemCount: number }> = ({ items, itemCount }) => {
  const overflow = itemCount > 4
  const shown = overflow ? items.slice(0, 3) : items.slice(0, 4)
  const cells = shown.length + (overflow ? 1 : 0)

  return (
    <div class={`ck-mosaic ck-mosaic--${Math.min(Math.max(cells, 1), 4)}`} aria-hidden="true">
      {shown.length === 0 && <span>🌾</span>}
      {shown.map((item) => (
        <span>{item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" /> : '🌾'}</span>
      ))}
      {overflow && <span class="ck-mosaic__more">+{itemCount - 3}</span>}
    </div>
  )
}

export const OrderHistoryPage: FC<{ orders: OrderCard[] }> = ({ orders }) => {
  return (
    <Layout title="Your orders" description="Your order history.">
      <style dangerouslySetInnerHTML={{ __html: ORDERS_CSS }} />

      <div class="ck">
        <div class="ck-pagehead">
          <a class="ck-back" href={ACCOUNT_URL}>
            &#8592; Back to account
          </a>
        </div>
        <h1 class="ck-title">My Orders</h1>

        {orders.length > 0 ? (
          <div class="ck-orders">
            {orders.map((order, i) => {
              const pill = statusPill(order)
              const pay = paymentInfo(order)
              return (
              <article class="ck-ocard" style={`animation-delay:${i * 60}ms`}>
                <Mosaic items={order.items} itemCount={order.itemCount} />

                <div class="ck-ocard__body">
                  <div class="ck-ocard__top">
                    <span class="ck-ocard__when">{pickupText(order.pickupSlot)}</span>
                    <span class={`ck-pill ck-pill--${pill.cls}`}>{pill.label}</span>
                  </div>

                  <div class="ck-ocard__meta">
                    {order.itemCount} item{order.itemCount === 1 ? '' : 's'}
                  </div>

                  <div class="ck-ocard__bot">
                    <span class={`ck-pay ck-pay--${pay.tone}`}>
                      {pay.label}
                      {pay.showAmount && <b>{rupee(order.totalAmount)}</b>}
                    </span>
                    <a class="ck-ocard__btn" href={`/orders/${order.orderId}`}>
                      View details &#8594;
                    </a>
                  </div>
                </div>
              </article>
              )
            })}
          </div>
        ) : (
          <div class="ck-empty">
            <div class="ck-empty__em">📦</div>
            <b>No orders yet</b>
            <p style="font-size:12px;margin-top:4px">Your pickup orders will appear here.</p>
            <p style="margin-top:12px">
              <a href="/products">Start shopping &#8594;</a>
            </p>
          </div>
        )}
      </div>
    </Layout>
  )
}