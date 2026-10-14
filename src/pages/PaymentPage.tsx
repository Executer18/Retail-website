import React, { lazy } from 'react';
import type { FC } from 'hono/jsx'
import { Layout } from '../components/Layout'
import { CHECKOUT_CSS, STORE, rupee } from '../lib/checkout-ui'
import { json, redirect } from 'react-router-dom';

export type PaymentItem = {
  name: string
  quantityKg: number
  pricePerKg: number
  imageUrl: string | null
}

export type PaymentOrder = {
  orderId: number
  totalAmount: number
  customerName: string
  customerPhone: string
  email: string
}

export type PaymentRazorpay = {
  keyId: string
  razorpayOrderId: string
  amountPaise: number
}

const PAY_JS = `
(function () {
  var btn = document.getElementById('ck-pay-btn');
  var cancelBtn = document.getElementById('ck-cancel-btn');
  var msg = document.getElementById('ck-pay-msg');
  if (!btn) return;

  var orderId = btn.getAttribute('data-order-id');
  var busy = false, confirming = false, checkMode = false;

  function show(text, kind) {
    msg.textContent = text;
    msg.className = 'ck-msg ck-msg--' + kind;
    msg.style.display = 'block';
  }

  function post(path, payload) {
    return fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { ok: res.ok, data: data };
      });
    });
  }

  function leaveToOrder() { window.location.href = '/orders/' + orderId; }

  function cancelAndLeave() {
    if (busy) return;
    busy = true;
    post('/checkout/pay/' + orderId + '/cancel').then(leaveToOrder, leaveToOrder);
  }

  function verify(resp) {
    confirming = true;
    btn.disabled = true;
    btn.textContent = 'Confirming payment...';
    if (cancelBtn) cancelBtn.disabled = true;

    post('/checkout/pay/' + orderId + '/verify', {
      razorpay_payment_id: resp.razorpay_payment_id,
      razorpay_order_id: resp.razorpay_order_id,
      razorpay_signature: resp.razorpay_signature
    }).then(function (r) {
      if (r.ok && r.data && r.data.redirect) { window.location.href = r.data.redirect; return; }
      throw new Error('verify failed');
    }).catch(function () {
      // The webhook can still confirm the payment, so don't cancel anything here.
      show('We received your payment but could not confirm it yet. Check My Orders in a minute - it will show as Paid once confirmed.', 'error');
      checkMode = true;
      btn.disabled = false;
      btn.textContent = 'Check my orders';
    });
  }

  btn.addEventListener('click', function () {
    if (checkMode) { leaveToOrder(); return; }
    if (busy || confirming) return;
    if (typeof Razorpay === 'undefined') {
      show('Could not load the payment window. Check your connection and try again.', 'error');
      return;
    }
    msg.style.display = 'none';

    var rzp = new Razorpay({
      key: btn.getAttribute('data-key'),
      amount: Number(btn.getAttribute('data-amount')),
      currency: 'INR',
      name: btn.getAttribute('data-store'),
      description: 'Order #' + orderId,
      order_id: btn.getAttribute('data-rzp-order'),
      prefill: {
        name: btn.getAttribute('data-name'),
        contact: btn.getAttribute('data-phone'),
        email: btn.getAttribute('data-email')
      },
      theme: { color: '#e81e57' },
      handler: function (resp) { verify(resp); },
      modal: {
        ondismiss: function () { if (!confirming) cancelAndLeave(); }
      }
    });

    rzp.on('payment.failed', function (r) {
      show((r && r.error && r.error.description) || 'Payment failed. You can try again.', 'error');
    });
    rzp.open();
  });

  if (cancelBtn) cancelBtn.addEventListener('click', cancelAndLeave);
})();
`

export const PaymentPage: FC<{
  order: PaymentOrder
  items: PaymentItem[]
  razorpay: PaymentRazorpay | null
  error: string | null
  testMode: boolean
  windowMinutes: number
}> = ({ order, items, razorpay, error, testMode, windowMinutes }) => {
  return (
    <Layout title="Pay for your order" description="Complete your payment.">
      <style dangerouslySetInnerHTML={{ __html: CHECKOUT_CSS }} />

      <div class="ck ck--buybar">
        <h1 class="ck-sr">Pay for order #{order.orderId}</h1>

        <div class="ck-amount">
          <small>Amount to pay</small>
          <b>{rupee(order.totalAmount)}</b>
          <p>
            Order #{order.orderId} is held for {windowMinutes} minutes. If you close the payment window it is cancelled
            and your cart stays as it is.
          </p>
        </div>

        {testMode && (
          <div class="ck-testbox">
            <b>TEST MODE</b> — no real money is charged. Card <b>4111 1111 1111 1111</b> with any future expiry and any
            CVV, or UPI <b>success@razorpay</b> to succeed (<b>failure@razorpay</b> to fail).
          </div>
        )}

        <div class="ck-sec">
          <h4>🧾 Order Summary</h4>
          {items.map((item) => (
            <div class="ck-mini">
              <span class="ck-mini__img">
                {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" /> : '🌾'}
              </span>
              <span class="ck-mini__txt">
                <b>{item.name}</b>
                <br />
                <small>
                  {item.quantityKg} kg · {rupee(item.pricePerKg)}/kg
                </small>
              </span>
              <span class="ck-mini__q">{rupee(item.pricePerKg * item.quantityKg)}</span>
            </div>
          ))}
          <div class="ck-bill">
            <div class="row total">
              <span>To Pay</span>
              <b>{rupee(order.totalAmount)}</b>
            </div>
          </div>
        </div>

        <div
          id="ck-pay-msg"
          class={error ? 'ck-msg ck-msg--error' : 'ck-msg'}
          style={error ? 'margin:0 14px 14px;display:block' : 'margin:0 14px 14px'}
          role="alert"
        >
          {error ?? ''}
        </div>

        <div style="margin:0 14px">
          <button type="button" id="ck-cancel-btn" class="ck-textbtn">
            Cancel and go back
          </button>
        </div>

        <div class="ck-place">
          <button
            type="button"
            id="ck-pay-btn"
            disabled={!razorpay}
            data-order-id={String(order.orderId)}
            data-key={razorpay?.keyId ?? ''}
            data-rzp-order={razorpay?.razorpayOrderId ?? ''}
            data-amount={String(razorpay?.amountPaise ?? 0)}
            data-store={STORE.name}
            data-name={order.customerName}
            data-phone={order.customerPhone}
            data-email={order.email}
          >
            Pay {rupee(order.totalAmount)} Securely
          </button>
        </div>
      </div>

      <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      <script dangerouslySetInnerHTML={{ __html: PAY_JS }} />
    </Layout>
  )
}