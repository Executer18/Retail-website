// src/lib/orders-ui.ts
//
// Shared bits for OrderHistoryPage and OrderDetailPage. Builds on the CSS and
// helpers already in checkout-ui.ts (same `ck-` prefix, same `--ck-` variables),
// so the two order pages look identical to checkout / confirmation.

import { CHECKOUT_CSS } from './checkout-ui'

// Where "Back to account" goes — change this if your account page lives elsewhere.
export const ACCOUNT_URL = '/account'

// Text shown in the status pill for each orders.status value.
export const STATUS_LABEL: Record<string, string> = {
  Reserved: 'Reserved',
  Confirmed: 'Confirmed',
  Preparing: 'Preparing',
  Ready: 'Ready for pickup',
  Collected: 'Collected',
  Cancelled: 'Cancelled',
}

// ---------- Payment display (used by the orders list, details and confirmation pages) ----------

export type PaymentFields = { status: string; paymentMethod: string; paymentStatus: string }
export type PayTone = 'paid' | 'due' | 'pending' | 'cancelled' | 'refunded'

export type PaymentInfo = {
  label: string // "Paid", "Pay at pickup", "Payment pending", "Order cancelled", "Refunded"
  suffix?: string // text shown after the amount, e.g. "to original payment method"
  totalLabel: string // label for the total row: "Total paid", "To pay at pickup", ...
  tone: PayTone
  showAmount: boolean
}

export function paymentInfo(o: PaymentFields): PaymentInfo {
  // Online payment given back (the admin's Refund button): "Refunded ₹X to original payment method"
  if (o.paymentStatus === 'refunded') {
    return {
      label: 'Refunded',
      suffix: o.paymentMethod === 'online' ? 'to original payment method' : 'at the store',
      totalLabel: 'Amount refunded',
      tone: 'refunded',
      showAmount: true,
    }
  }
  if (o.paymentStatus === 'paid') {
    return o.status === 'Cancelled'
      ? { label: 'Paid · refund pending', totalLabel: 'Total paid', tone: 'cancelled', showAmount: true }
      : { label: 'Paid', totalLabel: 'Total paid', tone: 'paid', showAmount: true }
  }
  if (o.status === 'Cancelled') {
    return { label: 'Order cancelled', totalLabel: 'Order total', tone: 'cancelled', showAmount: false }
  }
  if (o.paymentMethod === 'online') {
    return { label: 'Payment pending', totalLabel: 'To pay now', tone: 'pending', showAmount: true }
  }
  // Counter orders: until the shop marks cash as received, a Collected order is treated as paid.
  if (o.status === 'Collected') {
    return { label: 'Paid at counter', totalLabel: 'Total paid', tone: 'paid', showAmount: true }
  }
  return { label: 'Pay at pickup', totalLabel: 'To pay at pickup', tone: 'due', showAmount: true }
}

// Pill text/colour for the order. An online order still waiting for money shows
// "Payment pending" instead of "Reserved".
export function statusPill(o: PaymentFields): { label: string; cls: string } {
  if (o.status === 'Reserved' && o.paymentMethod === 'online' && o.paymentStatus !== 'paid') {
    return { label: 'Payment pending', cls: 'pending' }
  }
  return { label: STATUS_LABEL[o.status] ?? o.status, cls: o.status.toLowerCase() }
}

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const time12 = (h: number, min: number | string) =>
  `${h % 12 === 0 ? 12 : h % 12}:${String(min).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`

// orders.pickupSlot is "YYYY-MM-DD HH:mm" in IST wall-clock (see pickup-slots.ts).
// Plain string maths — no timezone conversion. Returns null if the format is unexpected.
export function pickupParts(slot: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(slot)
  if (!m) return null
  const [, y, mo, d, h, min] = m
  const wd = new Date(Date.UTC(+y, +mo - 1, +d)).getUTCDay()
  return {
    dateShort: `${DAYS_SHORT[wd]}, ${+d} ${MONTHS_SHORT[+mo - 1]}`,
    dateLong: `${DAYS_LONG[wd]}, ${+d} ${MONTHS_LONG[+mo - 1]}`,
    time: time12(+h, min),
  }
}

// "Mon, 5 Oct · 3:00 PM" (falls back to the raw stored value).
export function pickupText(slot: string): string {
  const p = pickupParts(slot)
  return p ? `${p.dateShort} · ${p.time}` : slot
}

// orders.orderDate is CURRENT_TIMESTAMP (UTC, "YYYY-MM-DD HH:MM:SS").
// Shown in IST as "5 Oct, 3:42 PM". Returns null when missing/unparseable.
export function placedOnText(orderDate: string | null): string | null {
  if (!orderDate) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(orderDate)
  if (!m) return null
  const [, y, mo, d, h, min] = m
  const ist = new Date(Date.UTC(+y, +mo - 1, +d, +h, +min) + 5.5 * 60 * 60 * 1000)
  return `${ist.getUTCDate()} ${MONTHS_SHORT[ist.getUTCMonth()]}, ${time12(ist.getUTCHours(), ist.getUTCMinutes())}`
}

export const ORDERS_CSS =
  CHECKOUT_CSS +
  `
/* ---------- Orders: page head ---------- */
.ck-pagehead{margin:14px 14px 0}
.ck-back{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border:1.5px solid var(--ck-border);
  border-radius:var(--ck-round);background:var(--ck-surface);font-size:12.5px;font-weight:700;color:var(--ck-ink);
  transition:transform var(--ck-fast)}
.ck-back:active{transform:scale(.97)}
.ck-title{font-size:20px;font-weight:800;color:var(--ck-ink);margin:12px 14px 0}
.ck-sec__head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px}
.ck-sec__head h4{margin:0}

/* ---------- Orders: status pills ---------- */
.ck-pill{white-space:nowrap;flex:none}
.ck-pill--preparing{background:var(--ck-primary-light);color:var(--ck-primary-dark)}
.ck-pill--ready{background:var(--ck-success-bg);color:var(--ck-success)}
.ck-pill--collected{background:#ece7e0;color:var(--ck-muted)}
.ck-pill--cancelled{background:#fee2e2;color:var(--ck-danger)}

/* ---------- Orders: list cards ---------- */
.ck-orders{padding-top:14px}
.ck-ocard{position:relative;display:flex;gap:12px;align-items:stretch;background:var(--ck-surface);
  border:1.5px solid var(--ck-border);border-radius:var(--ck-soft);padding:14px;margin:0 14px 10px;
  box-shadow:0 1px 3px rgba(33,27,23,.08);transition:transform var(--ck-base);animation:ckRise .4s backwards}
.ck-ocard:active{transform:scale(.98)}
.ck-ocard:focus-within{outline:2px solid var(--ck-primary);outline-offset:2px}
@keyframes ckRise{from{opacity:0;transform:translateY(10px)}}

/* Fixed 64x64 box: 1 image fills it, 2 split it, 3 = one tall + two small,
   4+ = 2x2 grid whose last cell becomes "+N". The card never grows taller. */
.ck-mosaic{width:64px;height:64px;flex:none;border-radius:10px;overflow:hidden;background:var(--ck-border);
  display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:2px}
.ck-mosaic > *{min-width:0;min-height:0;overflow:hidden;background:#f7e8d2;display:grid;place-items:center;font-size:14px}
.ck-mosaic img{width:100%;height:100%;object-fit:cover;display:block}
.ck-mosaic--1 > *{grid-column:span 2;grid-row:span 2;font-size:26px}
.ck-mosaic--2 > *{grid-row:span 2}
.ck-mosaic--3 > :first-child{grid-row:span 2}
.ck-mosaic > .ck-mosaic__more{background:var(--ck-ink);color:#fff;font-size:11px;font-weight:800}

.ck-ocard__body{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:space-between;gap:4px}
.ck-ocard__top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
.ck-ocard__when{font-size:14px;font-weight:800;color:var(--ck-ink);line-height:1.3;min-width:0}
.ck-ocard__meta{font-size:12px;color:var(--ck-muted)}
.ck-ocard__bot{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12.5px}
.ck-ocard__bot span{color:var(--ck-muted)}
.ck-ocard__bot b{color:var(--ck-ink);margin-left:4px}
.ck-ocard__btn{flex:none;background:var(--ck-primary);color:#fff;padding:6px 12px;border-radius:var(--ck-crisp);
  font-size:11.5px;font-weight:800;letter-spacing:.03em}
/* stretched link: the whole card is clickable without nesting links */
.ck-ocard__btn::after{content:"";position:absolute;inset:0;border-radius:var(--ck-soft)}

.ck-empty{text-align:center;padding:50px 20px;color:var(--ck-muted)}
.ck-empty__em{font-size:52px;margin-bottom:8px}
.ck-empty b{color:var(--ck-ink)}
.ck-empty a{color:var(--ck-primary);font-weight:800}

/* ---------- Payment state ---------- */
.ck-pill--paid{background:var(--ck-success-bg);color:var(--ck-success)}
.ck-pill--refunded{background:#e2d9f3;color:#432874}
.ck-ocard__bot .ck-pay--refunded{color:#432874;font-weight:700;font-size:11.5px;line-height:1.3}
.ck-notice--ok{background:var(--ck-success-bg);color:var(--ck-success)}
.ck-ocard__bot .ck-pay--paid{color:var(--ck-success);font-weight:700}
.ck-ocard__bot .ck-pay--due{color:var(--ck-warning);font-weight:700}
.ck-ocard__bot .ck-pay--pending{color:var(--ck-warning);font-weight:700}
.ck-ocard__bot .ck-pay--cancelled{color:var(--ck-danger);font-weight:700}
.ck-ocard__bot .ck-pay b{font-weight:800}
.ck-notice{margin:14px;padding:12px 14px;border-radius:var(--ck-soft);font-size:12.5px;line-height:1.6;
  background:var(--ck-warning-bg);color:var(--ck-warning)}
.ck-notice--danger{background:#fee2e2;color:var(--ck-danger)}
.ck-notice a{font-weight:800;text-decoration:underline;text-underline-offset:2px;color:inherit}
.ck-bill .row .ck-pill{font-size:10px}
.ck-payid{font-size:11px;color:var(--ck-muted);word-break:break-all;text-align:right}

/* ---------- Order details ---------- */
.ck-mini__q--ink{color:var(--ck-ink)}
.ck-mini__q--hi{color:var(--ck-primary)}
a.ck-mini__img{text-decoration:none}

@media (prefers-reduced-motion:reduce){
  .ck-ocard{animation:none}
}
`