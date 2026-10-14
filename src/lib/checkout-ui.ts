// src/lib/checkout-ui.ts
//
// Shared bits for CheckoutPage and OrderConfirmationPage: the page CSS
// (copied from the new design's styles.css, with every class prefixed `ck-`
// and every CSS variable prefixed `--ck-` so nothing clashes with Layout),
// the store details, and small formatting helpers.

import { SHOP_OPEN_HOUR, SHOP_CLOSE_HOUR } from './pickup-slots'

// Placeholder details taken from the design — edit to your real shop.
export const STORE = {
  name: 'Annapurna Chakki',
  line1: 'Shop 12, Grain Market Road,',
  line2: 'Sector 4, Pune — 411019',
  mapsUrl: 'https://maps.google.com/?q=atta+chakki+pune',
}

const hour12 = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`

// Derived from pickup-slots.ts so the shop hours only live in one place.
export const hoursLabel = () => `Mon–Sun ${hour12(SHOP_OPEN_HOUR)}–${hour12(SHOP_CLOSE_HOUR)}`

export const rupee = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 })

export const CHECKOUT_CSS = `
.ck{--ck-primary:#e81e57;--ck-primary-dark:#b8123f;--ck-primary-light:#fde3ec;--ck-gold-light:#f7ecd7;
  --ck-ink:#211b17;--ck-body:#453f3a;--ck-muted:#8a8078;--ck-border:#e5ded5;--ck-surface:#ffffff;
  --ck-success:#15803d;--ck-success-bg:#dcfce7;--ck-warning:#b45309;--ck-warning-bg:#fef3c7;--ck-danger:#dc2626;
  --ck-crisp:4px;--ck-soft:12px;--ck-round:999px;--ck-shadow-md:0 8px 24px rgba(33,27,23,.12);
  --ck-fast:120ms;--ck-base:220ms;
  /* height of the bottom nav from your Layout — the fixed "Place order" bar sits above it */
  --ck-nav-h:64px;
  color:var(--ck-body);font-family:inherit}
.ck *,.ck *::before,.ck *::after{box-sizing:border-box}
.ck--buybar{padding-bottom:calc(var(--ck-nav-h) + 84px)}
:where(.ck) h1,:where(.ck) h4{color:var(--ck-ink)}
:where(.ck) button{font-family:inherit;cursor:pointer;border:none;background:none;color:inherit}
:where(.ck) a{color:inherit;text-decoration:none}
.ck-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}

/* ---------- Sections ---------- */
.ck-sec{margin:14px;background:var(--ck-surface);border:1.5px solid var(--ck-border);
  border-radius:var(--ck-soft);padding:16px}
.ck-sec h4{font-size:13px;font-weight:800;color:var(--ck-ink);margin:0 0 12px;
  text-transform:uppercase;letter-spacing:.06em;display:flex;align-items:center;gap:7px}
.ck-sec--note{font-size:12px;line-height:1.6}
.ck-sec--note b{color:var(--ck-ink)}
.ck-sec p{margin:0}

/* ---------- Fields ---------- */
.ck-field{margin-bottom:13px}
.ck-field--last{margin-bottom:0}
.ck-field label{font-size:12px;font-weight:700;display:block;margin-bottom:5px;color:var(--ck-ink)}
.ck-field input{width:100%;padding:11px 13px;border-radius:var(--ck-crisp);border:1.5px solid var(--ck-border);
  background:var(--ck-surface);font-size:14px;font-family:inherit;outline:none;color:var(--ck-ink)}
.ck-field input:focus{border-color:var(--ck-primary)}
.ck-field.invalid input{border-color:var(--ck-danger)}
.ck-label{font-size:12px;font-weight:700;display:block;margin-bottom:7px;color:var(--ck-ink)}

/* ---------- Pickup slots ---------- */
.ck-slotgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.ck-slot{padding:9px 4px;text-align:center;font-size:11.5px;font-weight:700;border:1.5px solid var(--ck-border);
  border-radius:var(--ck-crisp);color:var(--ck-body);transition:all var(--ck-base)}
.ck-slot.on{background:var(--ck-primary);border-color:var(--ck-primary);color:#fff}
.ck-slotgrid.invalid .ck-slot:not(.on){border-color:var(--ck-danger)}
.ck-noslots{font-size:12.5px;color:var(--ck-muted)}

/* ---------- Order summary ---------- */
.ck-mini{display:flex;align-items:center;gap:10px;padding:7px 0;font-size:13px}
.ck-mini__img{width:36px;height:36px;flex:none;border-radius:8px;display:grid;place-items:center;font-size:19px;
  background:#f7e8d2;overflow:hidden}
.ck-mini__img img{width:100%;height:100%;object-fit:cover;display:block}
.ck-mini__txt{min-width:0}
.ck-mini__txt b{color:var(--ck-ink)}
.ck-mini__txt small{color:var(--ck-muted)}
.ck-mini__q{margin-left:auto;font-weight:700;color:var(--ck-muted);font-size:12px;text-align:right}
.ck-bill{padding:10px 0 0}
.ck-bill .row{display:flex;justify-content:space-between;font-size:13px;padding:4px 0}
.ck-bill .row s{color:var(--ck-muted)}
.ck-bill .row.save b{color:var(--ck-success)}
.ck-bill .row.free b{color:var(--ck-success)}
.ck-bill .row.total{border-top:1.5px dashed var(--ck-border);margin-top:6px;padding-top:10px;
  font-weight:800;font-size:16px;color:var(--ck-ink)}
.ck-bill .row.total b{color:var(--ck-primary)}

/* ---------- Location / buttons ---------- */
.ck-map-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:12px;
  border:1.5px solid var(--ck-border);border-radius:var(--ck-crisp);font-weight:700;font-size:13px;
  color:var(--ck-ink);background:var(--ck-gold-light);transition:transform var(--ck-fast)}
.ck-map-btn:active{transform:scale(.97)}
.ck-place{position:fixed;left:0;right:0;bottom:var(--ck-nav-h);z-index:54;background:var(--ck-surface);
  border-top:1.5px solid var(--ck-border);padding:10px 14px}
.ck-place button{width:100%;background:var(--ck-primary);color:#fff;padding:14px;border-radius:var(--ck-crisp);
  font-weight:800;font-size:14px;letter-spacing:.04em}
.ck-place button:disabled{opacity:.6;cursor:default}
.ck-go{display:block;width:100%;text-align:center;background:var(--ck-primary);color:#fff;padding:14px;
  border-radius:var(--ck-crisp);font-weight:800;font-size:14px;letter-spacing:.05em;transition:transform var(--ck-fast)}
.ck-go:active{transform:scale(.97)}

/* ---------- Confirmation ---------- */
.ck-conf-hero{text-align:center;padding:40px 20px 18px}
.ck-conf-tick{width:78px;height:78px;margin:0 auto 14px;border-radius:50%;background:var(--ck-success-bg);
  display:grid;place-items:center;animation:ckTickIn .6s cubic-bezier(.34,1.6,.5,1)}
@keyframes ckTickIn{from{transform:scale(0) rotate(-30deg)}}
.ck-conf-tick svg{stroke:var(--ck-success);stroke-width:3;fill:none;stroke-linecap:round;stroke-linejoin:round;
  stroke-dasharray:40;stroke-dashoffset:40;animation:ckDraw .5s .3s forwards}
@keyframes ckDraw{to{stroke-dashoffset:0}}
.ck-conf-hero h1{font-size:22px;font-weight:800;color:var(--ck-ink);margin:0}
.ck-conf-hero p{font-size:13px;color:var(--ck-muted);margin:5px 0 0}
.ck-conf-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.ck-conf-top b{color:var(--ck-ink)}
.ck-pill{font-size:10px;font-weight:800;padding:3px 10px;border-radius:var(--ck-round);
  background:var(--ck-warning-bg);color:var(--ck-warning);text-transform:uppercase;letter-spacing:.05em}
.ck-kv{display:flex;justify-content:space-between;gap:12px;font-size:13px;padding:3px 0}
.ck-kv b{color:var(--ck-ink);text-align:right}
.ck-kv b.pickup{color:var(--ck-primary)}
.ck-sep{border-top:1px dashed var(--ck-border);margin:10px 0 6px}
.ck-kv--total{border-top:1.5px dashed var(--ck-border);margin-top:8px;padding-top:10px;
  font-weight:800;font-size:16px;color:var(--ck-ink)}
.ck-kv--total b{color:var(--ck-primary)}
.ck-actions{margin:0 14px 14px;display:grid;gap:10px}

/* ---------- Payment method options (checkout) ---------- */
.ck-payopt{display:block;position:relative;margin-bottom:10px;cursor:pointer}
.ck-payopt:last-child{margin-bottom:0}
.ck-payopt input{position:absolute;opacity:0;pointer-events:none}
.ck-payopt__box{display:flex;align-items:center;gap:12px;padding:13px 14px;border:1.5px solid var(--ck-border);
  border-radius:var(--ck-soft);background:var(--ck-surface);transition:border-color var(--ck-base),background var(--ck-base)}
.ck-payopt__dot{width:18px;height:18px;flex:none;border-radius:50%;border:2px solid var(--ck-border);
  display:grid;place-items:center;transition:border-color var(--ck-base)}
.ck-payopt__dot::after{content:'';width:8px;height:8px;border-radius:50%;background:var(--ck-primary);
  transform:scale(0);transition:transform .18s}
.ck-payopt__txt{min-width:0}
.ck-payopt__txt b{display:block;font-size:13.5px;color:var(--ck-ink)}
.ck-payopt__txt small{font-size:11.5px;color:var(--ck-muted)}
.ck-payopt__tag{margin-left:auto;flex:none;font-size:9.5px;font-weight:800;letter-spacing:.06em;padding:3px 8px;
  border-radius:var(--ck-round);background:var(--ck-warning-bg);color:var(--ck-warning);text-transform:uppercase}
.ck-payopt input:checked + .ck-payopt__box{border-color:var(--ck-primary);background:var(--ck-primary-light)}
.ck-payopt input:checked + .ck-payopt__box .ck-payopt__dot{border-color:var(--ck-primary)}
.ck-payopt input:checked + .ck-payopt__box .ck-payopt__dot::after{transform:scale(1)}
.ck-payopt input:focus-visible + .ck-payopt__box{outline:2px solid var(--ck-primary);outline-offset:2px}

/* ---------- Pay page ---------- */
.ck-amount{margin:14px;background:var(--ck-surface);border:1.5px solid var(--ck-border);border-radius:var(--ck-soft);
  padding:20px;text-align:center}
.ck-amount small{font-size:12px;color:var(--ck-muted);display:block}
.ck-amount b{display:block;font-size:32px;font-weight:800;color:var(--ck-primary);margin-top:4px}
.ck-amount p{font-size:12px;color:var(--ck-muted);margin:8px 0 0}
.ck-testbox{margin:0 14px 14px;background:var(--ck-warning-bg);color:var(--ck-warning);border-radius:var(--ck-soft);
  padding:12px 14px;font-size:12px;line-height:1.6}
.ck-testbox b{color:var(--ck-warning)}
.ck-textbtn{display:block;width:100%;text-align:center;font-size:13px;font-weight:700;color:var(--ck-muted);padding:10px;
  text-decoration:underline;text-underline-offset:3px}
.ck-textbtn:disabled{opacity:.6;cursor:default}

/* ---------- Toast ---------- */
.ck-toast{position:fixed;left:50%;bottom:calc(var(--ck-nav-h,64px) + 76px);transform:translate(-50%,20px);
  background:var(--ck-ink);color:#fff;padding:11px 18px;border-radius:var(--ck-round);font-size:13px;font-weight:600;
  z-index:120;opacity:0;pointer-events:none;transition:all .3s cubic-bezier(.34,1.4,.5,1);white-space:nowrap;
  box-shadow:var(--ck-shadow-md)}
.ck-toast.show{opacity:1;transform:translate(-50%,0)}

@media (prefers-reduced-motion:reduce){
  .ck-conf-tick,.ck-conf-tick svg{animation:none;stroke-dashoffset:0}
}
`