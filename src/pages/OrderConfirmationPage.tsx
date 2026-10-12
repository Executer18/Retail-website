import React, { lazy } from 'react';
import type { FC } from 'hono/jsx'
import { Layout } from '../components/Layout'
import { CHECKOUT_CSS, STORE, rupee } from '../lib/checkout-ui'

export type ConfirmationItem = {
  name: string
  quantityKg: number
  imageUrl: string | null
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// "2026-10-05 15:00" -> "Mon, 5 Oct · 3:00 PM". Plain string maths, no timezone
// conversion, in line with pickup-slots.ts. Falls back to the raw value.
function formatPickup(slot: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(slot)
  if (!m) return slot
  const [, y, mo, d, h, min] = m
  const weekday = DAYS[new Date(Date.UTC(+y, +mo - 1, +d)).getUTCDay()]
  const hour = +h
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  const ampm = hour < 12 ? 'AM' : 'PM'
  return `${weekday}, ${+d} ${MONTHS[+mo - 1]} · ${hour12}:${min} ${ampm}`
}

export const OrderConfirmationPage: FC<{
  orderId: number
  customerName: string
  customerPhone: string
  pickupSlot: string
  items: ConfirmationItem[]
  total: number
}> = ({ orderId, customerName, customerPhone, pickupSlot, items, total }) => {
  return (
    <Layout title="Order confirmed" description="Your order has been placed.">
      <style dangerouslySetInnerHTML={{ __html: CHECKOUT_CSS }} />

      <div class="ck">
        <div class="ck-conf-hero">
          <div class="ck-conf-tick">
            <svg width="38" height="38" viewBox="0 0 24 24" aria-hidden="true">
              <path d="m4 12.5 5.5 5.5L20 7" />
            </svg>
          </div>
          <h1>Order placed! 🎉</h1>
          <p>We'll have it fresh-ground and packed for your slot.</p>
        </div>

        <div class="ck-sec">
          <div class="ck-conf-top">
            <b>#{orderId}</b>
            <span class="ck-pill">Awaiting pickup</span>
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
            <b class="pickup">{formatPickup(pickupSlot)}</b>
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
            <span>Total paid</span>
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