import React, { lazy } from 'react';
import type { FC } from 'hono/jsx'
import { Layout } from '../components/Layout'
import { STORE, rupee } from '../lib/checkout-ui'
import { ORDERS_CSS, paymentInfo, pickupParts, placedOnText, statusPill } from '../lib/orders-ui'

export type OrderDetail = {
  orderId: number
  status: string
  pickupSlot: string
  orderDate: string | null
  customerName: string
  customerPhone: string
  totalAmount: number // orders.totalAmount (what the customer pays)
  paymentMethod: string // "counter" | "online"
  paymentStatus: string // "unpaid" | "paid" | "refunded"
  razorpayPaymentId: string | null
}

export type OrderDetailItem = {
  productId: number
  quantityKg: number
  pricePerKgAtPurchase: number
  name: string
  imageUrl: string | null
}

export type OrderPayment = {
  mrp: number // total before discount
  save: number // mrp - what was paid for the items
}

export const OrderDetailPage: FC<{
  order: OrderDetail
  items: OrderDetailItem[]
  payment: OrderPayment
  windowMinutes: number
}> = ({ order, items, payment, windowMinutes }) => {
  const pickup = pickupParts(order.pickupSlot)
  const placed = placedOnText(order.orderDate)
  const pill = statusPill(order)
  const pay = paymentInfo(order)

  const cancelled = order.status === 'Cancelled'
  const awaitingOnlinePayment =
    order.paymentMethod === 'online' && order.paymentStatus !== 'paid' && !cancelled

  return (
    <Layout title={`Order #${order.orderId}`} description="Order details.">
      <style dangerouslySetInnerHTML={{ __html: ORDERS_CSS }} />

      <div class="ck">
        <div class="ck-pagehead">
          <a class="ck-back" href="/orders">
            &#8592; Back to orders
          </a>
        </div>
        <h1 class="ck-title">Order #{order.orderId}</h1>

        {/* Notices that depend on the payment state */}
        {awaitingOnlinePayment && (
          <div class="ck-notice">
            Payment is pending. Pay within {windowMinutes} minutes of placing the order, or it will be cancelled.{' '}
            <a href={`/checkout/pay/${order.orderId}`}>Pay now</a>
          </div>
        )}
        {cancelled && order.paymentMethod === 'online' && order.paymentStatus !== 'paid' && (
          <div class="ck-notice ck-notice--danger">
            The payment wasn't completed, so this order was cancelled. Your cart items are still saved —{' '}
            <a href="/cart">go to your cart</a> to order again.
          </div>
        )}
        {order.paymentStatus === 'refunded' && (
          <div class="ck-notice ck-notice--ok">
            {rupee(order.totalAmount)} was refunded to your original payment method.
          </div>
        )}
        {cancelled && order.paymentStatus === 'paid' && (
          <div class="ck-notice ck-notice--danger">
            This order was cancelled after payment. Please <a href="/contact">contact the store</a> about your refund.
          </div>
        )}
        {cancelled && order.paymentMethod === 'counter' && order.paymentStatus !== 'paid' && (
          <div class="ck-notice ck-notice--danger">This order was cancelled.</div>
        )}

        {/* Items */}
        <div class="ck-sec">
          <div class="ck-sec__head">
            <h4>🧾 Items</h4>
            <span class={`ck-pill ck-pill--${pill.cls}`}>{pill.label}</span>
          </div>
          {items.map((item) => (
            <div class="ck-mini">
              <a class="ck-mini__img" href={`/products/${item.productId}`} aria-label={item.name}>
                {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" /> : '🌾'}
              </a>
              <span class="ck-mini__txt">
                <b>{item.name}</b>
                <br />
                <small>
                  {item.quantityKg} kg · {rupee(item.pricePerKgAtPurchase)}/kg
                </small>
              </span>
              <span class="ck-mini__q">
                × {item.quantityKg} kg = {rupee(item.pricePerKgAtPurchase * item.quantityKg)}
              </span>
            </div>
          ))}
        </div>

        {/* Pickup details */}
        <div class="ck-sec">
          <h4>🕒 Pickup Details</h4>
          <div class="ck-mini">
            <span>📅</span>
            <span>Date</span>
            <b class="ck-mini__q ck-mini__q--hi">{pickup ? pickup.dateLong : order.pickupSlot}</b>
          </div>
          {pickup && (
            <div class="ck-mini">
              <span>⏰</span>
              <span>Time slot</span>
              <b class="ck-mini__q ck-mini__q--hi">{pickup.time}</b>
            </div>
          )}
          <div class="ck-mini">
            <span>👤</span>
            <span>Name</span>
            <b class="ck-mini__q ck-mini__q--ink">{order.customerName}</b>
          </div>
          <div class="ck-mini">
            <span>📞</span>
            <span>Phone</span>
            <b class="ck-mini__q ck-mini__q--ink">+91 {order.customerPhone}</b>
          </div>
          {placed && (
            <div class="ck-mini">
              <span>🛍️</span>
              <span>Placed on</span>
              <b class="ck-mini__q ck-mini__q--ink">{placed}</b>
            </div>
          )}
        </div>

        {/* Payment */}
        <div class="ck-sec">
          <h4>💰 Payment</h4>
          <div class="ck-bill" style="padding:0">
            {payment.save > 0 && (
              <>
                <div class="row">
                  <span>Total MRP</span>
                  <b>
                    <s>{rupee(payment.mrp)}</s>
                  </b>
                </div>
                <div class="row save">
                  <span>You saved</span>
                  <b>− {rupee(payment.save)}</b>
                </div>
              </>
            )}
            <div class="row free">
              <span>Store pickup</span>
              <b>FREE</b>
            </div>
            <div class="row">
              <span>Payment method</span>
              <b>{order.paymentMethod === 'online' ? 'Online (Razorpay)' : 'Pay at counter'}</b>
            </div>
            <div class="row">
              <span>Payment status</span>
              <span
                class={`ck-pill ck-pill--${
                  pay.tone === 'paid'
                    ? 'paid'
                    : pay.tone === 'cancelled'
                      ? 'cancelled'
                      : pay.tone === 'refunded'
                        ? 'refunded'
                        : 'pending'
                }`}
              >
                {pay.label}
              </span>
            </div>
            {order.razorpayPaymentId && (order.paymentStatus === 'paid' || order.paymentStatus === 'refunded') && (
              <div class="row">
                <span>Payment ID</span>
                <span class="ck-payid">{order.razorpayPaymentId}</span>
              </div>
            )}
            <div class="row total">
              <span>{pay.totalLabel}</span>
              <b>{rupee(order.totalAmount)}</b>
            </div>
          </div>
        </div>

        {/* Return policy */}
        <div class="ck-sec ck-sec--note">
          <h4>↩️ Return &amp; Exchange</h4>
          Sealed packs accepted within 2 days of pickup with the batch slip. Quality issues on opened packs — we'll
          regrind or replace free.
        </div>

        <div class="ck-actions">
          {awaitingOnlinePayment && (
            <a class="ck-go" href={`/checkout/pay/${order.orderId}`}>
              Pay {rupee(order.totalAmount)} now
            </a>
          )}
          <a class="ck-map-btn" href={STORE.mapsUrl} target="_blank" rel="noopener">
            📍 Open Store Location in Google Maps
          </a>
          <a class={awaitingOnlinePayment ? 'ck-map-btn' : 'ck-go'} href="/orders">
            &#8592; Back to orders
          </a>
        </div>
      </div>
    </Layout>
  )
}