import React, { lazy } from 'react';
import type { FC } from 'hono/jsx'
import { Layout } from '../components/Layout'
import type { PickupSlot } from '../lib/pickup-slots'
import { CHECKOUT_CSS, STORE, hoursLabel, rupee } from '../lib/checkout-ui'

export type CheckoutItem = {
  productId: number
  quantityKg: number
  name: string
  imageUrl: string | null
  pricePerKg: number
  mrpPerKg: number // pricePerKg + discount
}

export type CheckoutTotals = {
  mrp: number // total before discount
  save: number // mrp - pay
  pay: number // what the customer pays
}

// "Today, 3:00 PM" -> day "Today", time "3:00 PM". All slots share one day.
function splitLabel(label: string) {
  const i = label.indexOf(', ')
  return i === -1 ? { day: '', time: label } : { day: label.slice(0, i), time: label.slice(i + 2) }
}

const CHECKOUT_JS = `
(function () {
  var form = document.getElementById('ck-form');
  if (!form) return;
  var nameEl = document.getElementById('ck-name');
  var phoneEl = document.getElementById('ck-phone');
  var slotEl = document.getElementById('ck-slot-input');
  var grid = document.getElementById('ck-slots');
  var btn = document.getElementById('ck-place-btn');
  var toastEl = null, toastT;

  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'ck-toast';
      toastEl.setAttribute('role', 'status');
      form.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }

  function flag(el, bad) {
    var f = el.closest('.ck-field');
    if (f) f.classList.toggle('invalid', bad);
  }

  // digits only, max 10
  phoneEl.addEventListener('input', function () {
    phoneEl.value = phoneEl.value.replace(/[^0-9]/g, '').slice(0, 10);
    flag(phoneEl, false);
  });
  nameEl.addEventListener('input', function () { flag(nameEl, false); });

  if (grid) {
    grid.addEventListener('click', function (e) {
      var b = e.target.closest('.ck-slot');
      if (!b) return;
      slotEl.value = b.getAttribute('data-value');
      grid.classList.remove('invalid');
      var all = grid.querySelectorAll('.ck-slot');
      for (var i = 0; i < all.length; i++) {
        var on = all[i] === b;
        all[i].classList.toggle('on', on);
        all[i].setAttribute('aria-pressed', on ? 'true' : 'false');
      }
    });
  }

  form.addEventListener('submit', function (e) {
    var name = nameEl.value.trim();
    var phone = phoneEl.value.trim();
    var badName = name.length < 2;
    var badPhone = !/^[0-9]{10}$/.test(phone);
    var badSlot = !slotEl.value;

    flag(nameEl, badName);
    flag(phoneEl, badPhone);
    if (grid) grid.classList.toggle('invalid', badSlot);

    var msg = badName ? 'Please enter your name'
      : badPhone ? 'Enter a valid 10-digit phone number'
      : badSlot ? 'Pick a time slot'
      : '';

    if (msg) {
      e.preventDefault();
      toast(msg);
      var target = badName ? nameEl : badPhone ? phoneEl : grid;
      if (target && target.scrollIntoView) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    nameEl.value = name;
    btn.disabled = true;
    btn.textContent = 'Placing order…';
  });

  // Back button (bfcache) should not leave the button stuck on "Placing order…"
  window.addEventListener('pageshow', function () {
    btn.disabled = !grid;
    btn.textContent = 'Place Pickup Order';
  });
})();
`

export const CheckoutPage: FC<{
  items: CheckoutItem[]
  totals: CheckoutTotals
  slots: PickupSlot[]
}> = ({ items, totals, slots }) => {
  const pickupDay = slots.length > 0 ? splitLabel(slots[0].label).day : ''

  return (
    <Layout title="Checkout" description="Confirm your order and pickup time.">
      <style dangerouslySetInnerHTML={{ __html: CHECKOUT_CSS }} />

      <form id="ck-form" class="ck ck--buybar" method="post" action="/checkout" novalidate>
        <h1 class="ck-sr">Checkout · Store Pickup</h1>

        {/* Order summary */}
        <div class="ck-sec">
          <h4>🧾 Order Summary</h4>
          <div>
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
                <span class="ck-mini__q">
                  × {item.quantityKg} kg = {rupee(item.pricePerKg * item.quantityKg)}
                </span>
              </div>
            ))}
          </div>

          <div class="ck-bill">
            {totals.save > 0 && (
              <>
                <div class="row">
                  <span>Total MRP</span>
                  <b>
                    <s>{rupee(totals.mrp)}</s>
                  </b>
                </div>
                <div class="row save">
                  <span>Discount on MRP</span>
                  <b>− {rupee(totals.save)}</b>
                </div>
              </>
            )}
            <div class="row free">
              <span>Store pickup</span>
              <b>FREE</b>
            </div>
            <div class="row total">
              <span>To Pay</span>
              <b>{rupee(totals.pay)}</b>
            </div>
          </div>
        </div>

        {/* Your details */}
        <div class="ck-sec">
          <h4>👤 Your Details</h4>
          <div class="ck-field">
            <label for="ck-name">Full name</label>
            <input id="ck-name" name="customerName" type="text" placeholder="e.g. Priya Sharma" autocomplete="name" />
          </div>
          <div class="ck-field ck-field--last">
            <label for="ck-phone">Phone (for pickup confirmation)</label>
            <input
              id="ck-phone"
              name="customerPhone"
              type="tel"
              inputmode="numeric"
              maxlength={10}
              placeholder="10-digit mobile number"
              autocomplete="tel-national"
            />
          </div>
        </div>

        {/* Pickup slot */}
        <div class="ck-sec">
          <h4>🕒 Pickup Date &amp; Time</h4>
          {slots.length === 0 ? (
            <p class="ck-noslots">No pickup slots are available right now. Please try again later.</p>
          ) : (
            <>
              <div class="ck-field">
                <label for="ck-date">Pickup date</label>
                <input id="ck-date" type="text" value={pickupDay} readonly tabindex={-1} />
              </div>
              <span class="ck-label">Time slot</span>
              <div class="ck-slotgrid" id="ck-slots">
                {slots.map((slot) => (
                  <button type="button" class="ck-slot" data-value={slot.value} aria-pressed="false">
                    {splitLabel(slot.label).time}
                  </button>
                ))}
              </div>
              <input type="hidden" name="pickupSlot" id="ck-slot-input" value="" />
            </>
          )}
        </div>

        {/* Store location */}
        <div class="ck-sec">
          <h4>📍 Pickup Location</h4>
          <p style="font-size:13px;line-height:1.6;margin-bottom:10px">
            {STORE.name}, {STORE.line1}
            <br />
            {STORE.line2} · {hoursLabel()}
          </p>
          <a class="ck-map-btn" href={STORE.mapsUrl} target="_blank" rel="noopener">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            Open Store Location in Google Maps
          </a>
        </div>

        {/* Return policy */}
        <div class="ck-sec ck-sec--note">
          <h4>↩️ Return &amp; Exchange</h4>
          Sealed packs can be returned or exchanged within <b>2 days of pickup</b> with the batch slip. Quality concern on
          an opened pack? Bring it in — we'll regrind or replace it free.
        </div>

        <div class="ck-place">
          <button type="submit" id="ck-place-btn" disabled={slots.length === 0}>
            Place Pickup Order
          </button>
        </div>
      </form>

      <script dangerouslySetInnerHTML={{ __html: CHECKOUT_JS }} />
    </Layout>
  )
}