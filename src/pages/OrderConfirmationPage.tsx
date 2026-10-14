import React, { lazy } from 'react';
import type { FC } from 'hono/jsx'
import { Layout } from '../components/Layout'
import { STORE, rupee } from '../lib/checkout-ui'
import { ORDERS_CSS, paymentInfo, pickupText } from '../lib/orders-ui'

export type ConfirmationItem = {
  name: string
  quantityKg: number
  imageUrl: string | null
}

export const OrderConfirmationPage: FC<{
  orderId: number
  customerName: string
  customerPhone: string
  pickupSlot: string
  items: ConfirmationItem[]
  total: number
  status: string
  paymentMethod: string
  paymentStatus: string
}> = ({ orderId, customerName, customerPhone, pickupSlot, items, total, status, paymentMethod, paymentStatus }) => {
  const pay = paymentInfo({ status, paymentMethod, paymentStatus })
  const paidOnline = paymentStatus === 'paid'

  return (
    <Layout title="Order confirmed" description="Your order has been placed.">
      <style dangerouslySetInnerHTML={{ __html: ORDERS_CSS }} />

      <div class="ck">
        <div class="ck-conf-hero">
          <div class="ck-conf-tick">
            <svg width="38" height="38" viewBox="0 0 24 24" aria-hidden="true">
              <path d="m4 12.5 5.5 5.5L20 7" />
            </svg>
          </div>
          <h1>{paidOnline ? 'Payment successful! 🎉' : 'Order placed! 🎉'}</h1>
          <p>
            {paidOnline
              ? "Your order is confirmed. We'll have it fresh-ground and packed for your slot."
              : `We'll have it fresh-ground and packed for your slot. Pay ${rupee(total)} at the counter when you collect.`}
          </p>
        </div>

        <div class="ck-sec">
          <div class="ck-conf-top">
            <b>#{orderId}</b>
            <span class={paidOnline ? 'ck-pill ck-pill--paid' : 'ck-pill'}>
              {paidOnline ? 'Paid' : 'Awaiting pickup'}
            </span>
          </div>
          <div class="ck-kv">
            <span>Name</span>
            <b>{customerName}</b>
          </div>
          <div class="ck-kv">
            <span>Phone</span>
            <b>+91 {customerPhone}</b>
          </div>
          <div class="ck-kv">
            <span>Pickup</span>
            <b class="pickup">{pickupText(pickupSlot)}</b>
          </div>
          <div class="ck-kv">
            <span>Payment</span>
            <b>{paymentMethod === 'online' ? 'Paid online' : 'Pay at counter'}</b>
          </div>

          <div class="ck-sep"></div>

          {items.map((item) => (
            <div class="ck-mini">
              <span class="ck-mini__img">
                {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" /> : '🌾'}
              </span>
              <span class="ck-mini__txt" style="font-size:12.5px">
                <b>{item.name}</b>
              </span>
              <span class="ck-mini__q">× {item.quantityKg} kg</span>
            </div>
          ))}

          <div class="ck-kv ck-kv--total">
            <span>{pay.totalLabel}</span>
            <b>{rupee(total)}</b>
          </div>
        </div>

        <div class="ck-actions">
          <a class="ck-go" href="/orders">
            View My Orders →
          </a>
          <a class="ck-map-btn" href={STORE.mapsUrl} target="_blank" rel="noopener">
            📍 Get Directions to Store
          </a>
        </div>
      </div>
    </Layout>
  )
}