// src/components/Layout.tsx
//
// Rebuilt to match the new UI mockup (Annapurna Chakki design), wired for
// this project's real stack: Hono JSX (SSR) + htmx + plain CSS vars.
// Markup/classes are copied as-is from the mockup's HTML/CSS — nothing
// visual was changed.
//
// NOT built here (left to you, per your instructions):
//   - Search backend wiring (the input below is markup-only)
//
// Cart modal (#cart-body) now self-loads the real CartContents fragment
// from GET /api/cart/contents (see src/routes/cart.tsx) — same fragment
// the full /cart page uses, so the header cart-btn and the floating
// "View Cart" button both open to the exact same popup.

import type { FC, PropsWithChildren } from 'hono/jsx'
import { raw } from 'hono/html'

type NavKey = 'home' | 'product' | 'search' | 'account' | 'contact'

type LayoutProps = PropsWithChildren<{
  title: string
  description?: string
  /** Which bottom-nav item is highlighted on this page. */
  active?: NavKey
  /**
   * What shows in the header's center "searchwrap" slot.
   * - 'search' (default): live search input (mockup default on home/products/product pages)
   * - a string: static page title text instead of a search box
   *   (mockup behavior on account/checkout/contact/orders/order-detail/order-confirm pages)
   */
  header?: 'search' | string
  /**
   * Optional server-known cart count for the very first paint, so the
   * badge doesn't flash in late. If omitted, the badge starts hidden and
   * fills in once the htmx self-load below resolves.
   */
  initialCartCount?: number
}>

const NAV_ITEMS: Array<{ key: NavKey; label: string; href: string }> = [
  { key: 'home', label: 'Home', href: '/' },
  { key: 'product', label: 'Products', href: '/products' },
  { key: 'search', label: 'Search', href: '/search' },
  { key: 'account', label: 'Account', href: '/account' },
  { key: 'contact', label: 'Contact', href: '/contact' },
]

const NAV_ICONS: Record<NavKey, string> = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/>',
  product: '<path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  account: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 5-5.5 8-5.5s6.5 1.5 8 5.5"/>',
  contact: '<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>',
}

// Modal open/close + cart-badge show/hide. Kept as a plain string and
// inserted via raw() (not dangerouslySetInnerHTML) so it isn't HTML-escaped.
const LAYOUT_SCRIPT = `
  function openSheet(id){ document.getElementById(id).classList.add('open'); document.body.style.overflow='hidden'; }
  function closeSheet(id){ document.getElementById(id).classList.remove('open'); document.body.style.overflow=''; }

  // Cart line "− [input] +" stepper (CartContents.tsx). Defined once here
  // (not inside the htmx-swapped fragment) since htmx doesn't re-run
  // <script> tags reliably in swapped-in content.
  function bumpQty(btn, delta){
    var form = btn.closest('form');
    var input = form.querySelector('.ci-step__input');
    if (!input) return;
    var min = parseFloat(input.getAttribute('min')) || 0;
    var maxAttr = input.getAttribute('max');
    var max = maxAttr !== null ? parseFloat(maxAttr) : Infinity;
    var step = parseFloat(input.getAttribute('step')) || 1;
    var next = Math.round(((parseFloat(input.value) || 0) + delta * step) * 100) / 100;
    next = Math.max(min, Math.min(max, next));
    input.value = next;
    form.requestSubmit();
  }

  // Keep #cart-count's visual show/hide (CSS scale via .show) in sync
  // with whatever number the server swaps in, on load or via an
  // out-of-band swap from any cart-mutating route.
  document.body.addEventListener('htmx:afterSwap', function(e){
    if (e.target && e.target.id === 'cart-count') {
      var n = parseInt((e.target.textContent || '0').trim(), 10) || 0;
      e.target.classList.toggle('show', n > 0);
      if (n > 0) {
        e.target.classList.remove('pop');
        void e.target.offsetWidth;
        e.target.classList.add('pop');
      }
    }
  });

  // Fly-to-cart, for ANY "/api/cart/adjust/:productId" form — ProductCard's
  // ADD button, its +/- stepper, and the size-variant popup's per-size ADD
  // all post to that same route, so one listener covers all three.
  function flyToCart(imgEl, originEl){
    var target = document.querySelector('.topbar .cart-btn') || document.getElementById('floatcart');
    if (!target || !originEl) return;
    var r = originEl.getBoundingClientRect();
    var t = target.getBoundingClientRect();
    var ghost = imgEl ? imgEl.cloneNode(true) : document.createElement('span');
    if (!imgEl) { ghost.textContent = '🌾'; ghost.style.fontSize = '32px'; ghost.style.lineHeight = '40px'; }
    ghost.style.objectFit = 'cover';
    ghost.style.borderRadius = '8px';
    Object.assign(ghost.style, {
      position: 'fixed', left: (r.left + r.width / 2 - 20) + 'px', top: (r.top + 20) + 'px',
      width: '40px', height: '40px', zIndex: 200, pointerEvents: 'none',
      transition: 'all .7s cubic-bezier(.5,-0.2,.3,1.2)'
    });
    document.body.appendChild(ghost);
    requestAnimationFrame(function(){
      Object.assign(ghost.style, {
        left: (t.left + t.width / 2 - 10) + 'px', top: t.top + 'px',
        width: '14px', height: '14px', opacity: .3, transform: 'rotate(40deg)'
      });
    });
    setTimeout(function(){ ghost.remove(); }, 720);
  }

  document.body.addEventListener('htmx:afterRequest', function(e){
    var elt = e.detail.elt;
    var path = (e.detail.requestConfig && e.detail.requestConfig.path) || '';
    if (!e.detail.successful || path.indexOf('/api/cart/adjust/') === -1) return;
    var deltaInput = elt.querySelector && elt.querySelector('input[name="delta"]');
    var isIncrease = deltaInput && parseFloat(deltaInput.value) > 0;
    if (isIncrease) {
      var origin = elt.closest('.pcard, .variant-row');
      var img = origin ? origin.querySelector('img') : null;
      flyToCart(img, origin);
    }
    if (elt.closest('#variantModal')) {
      setTimeout(function(){ closeSheet('variantModal'); }, 450);
    }
  });

  // Shared toast (used by the grinding/sell-to-store calculators on the
  // home page, and anywhere else that wants a quick confirmation).
  var toastTimer;
  function toast(msg){
    var el = document.getElementById('toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ el.classList.remove('show'); }, 1800);
  }

  // Fade ".reveal" sections in as they scroll into view (HomePage's
  // category/featured/milling sections). Runs once per full page load —
  // this script tag isn't re-executed by htmx fragment swaps, which is
  // fine since .reveal is only ever used on full-page content.
  if ('IntersectionObserver' in window) {
    var revealIo = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting) {
          entry.target.classList.add('vis');
          revealIo.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    document.querySelectorAll('.reveal').forEach(function(el){ revealIo.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function(el){ el.classList.add('vis'); });
  }
`

export const Layout: FC<LayoutProps> = ({
  title,
  description,
  active,
  header = 'search',
  initialCartCount,
  children,
}) => {
  const hasInitialCount = typeof initialCartCount === 'number' && initialCartCount > 0

  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title} · Annapurna Chakki</title>
        {description && <meta name="description" content={description} />}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/utility.css" />
        <script src="https://unpkg.com/htmx.org@1.9.12"></script>
      </head>
      <body class={active ? `page-${active}` : undefined}>
        {/* ---------- Top bar ---------- */}
        <header class="topbar">
          <a href="/" class="brand-chip">
            <svg class="mill" viewBox="0 0 30 30">
              <circle cx="15" cy="15" r="13" fill="#e81e57" />
              <g class="mill-spin" stroke="#fff" stroke-width="2" stroke-linecap="round">
                <path d="M15 5v20M5 15h20M8 8l14 14M22 8 8 22" />
              </g>
              <circle cx="15" cy="15" r="3.5" fill="#fff" />
            </svg>
            Annapurna
          </a>

          {header === 'search' ? (
            <div class="searchwrap">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              {/* Search wiring (submit route, live results, etc.) left to you. */}
              <input type="search" name="q" placeholder="Search atta, besan, millets…" />
            </div>
          ) : (
            <div class="searchwrap">
              <b style="font-size:14px;color:var(--color-ink)">{header}</b>
            </div>
          )}

          <a href="#" class="cart-btn" aria-label="Cart" onclick="openSheet('cartModal');return false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="20" r="1.5" />
              <circle cx="18" cy="20" r="1.5" />
              <path d="M2 3h3l2.6 12.5h11L21 7H6" />
            </svg>
            <span
              id="cart-count"
              class={`cart-count${hasInitialCount ? ' show' : ''}`}
              hx-get="/api/cart/count"
              hx-trigger="load, cart-updated from:body"
              hx-swap="innerHTML"
            >
              {initialCartCount ?? 0}
            </span>
          </a>
        </header>

        <main class="container">{children}</main>

        {/* Existing stock-clamp OOB target (ProductDetailPage.tsx / cart.tsx).
            Kept for backward compatibility — the new stylesheet doesn't
            define .cart-add-feedback, see integration notes below. */}
        <span id="cart-add-feedback" class="cart-add-feedback"></span>

        {/* ---------- Floating "View Cart" button ---------- */}
        {/* Self-loads on every page from GET /api/cart/summary (cart.tsx),
            which returns the button with/without the .show class. */}
        <div
          id="floatcart-slot"
          hx-get="/api/cart/summary"
          hx-trigger="load, cart-updated from:body"
          hx-swap="innerHTML"
        ></div>

        {/* ---------- Cart modal (bottom sheet) ---------- */}
        <div class="modal-back" id="cartModal" onclick="if(event.target===this)closeSheet('cartModal')">
          <div class="modal tall">
            <div class="grab"></div>
            <button class="modal-close" onclick="closeSheet('cartModal')">✕</button>
            <h3>🛒 Your Cart</h3>
            <p class="sub">Freshly ground, packed after you order · Store pickup only</p>
            <div id="cart-body" hx-get="/api/cart/contents" hx-trigger="load"></div>
          </div>
        </div>

        {/* ---------- Size-variant picker (ProductCard's "SELECT SIZE") ---------- */}
        <div class="modal-back" id="variantModal" onclick="if(event.target===this)closeSheet('variantModal')">
          <div class="modal">
            <div class="grab"></div>
            <button class="modal-close" onclick="closeSheet('variantModal')">✕</button>
            {/* Filled by GET /api/products/:id/variants (src/routes/products.ts) */}
            <div id="variant-modal-body"></div>
          </div>
        </div>

        {/* ---------- Footer ---------- */}
        <footer class="footer" id="footer">
          <div class="fgrid">
            <div>
              <div class="store-name">
                <svg width="18" height="18" viewBox="0 0 30 30">
                  <circle cx="15" cy="15" r="13" fill="#e81e57" />
                  <g stroke="#fff" stroke-width="2" stroke-linecap="round">
                    <path d="M15 5v20M5 15h20M8 8l14 14M22 8 8 22" />
                  </g>
                  <circle cx="15" cy="15" r="3.5" fill="#fff" />
                </svg>
                Annapurna Chakki
              </div>
              <p>
                Shop 12, Grain Market Rd,
                <br />
                Sector 4, Pune — 411019
              </p>
              <p>
                Mon–Sun · 7 AM – 9 PM
                <br />
                📞 +91 98765 43210
              </p>
              <a class="maplink" href="https://maps.google.com/?q=atta+chakki+pune" target="_blank" rel="noopener">
                📍 Google Maps →
              </a>
            </div>
            <div>
              <h5>Secure payments</h5>
              <span class="rzp">
                <svg class="shield" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <path d="M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5Z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>{' '}
                Razorpay Secured
              </span>
              <p style="margin-top:7px">UPI · Cards · NetBanking · COD</p>
            </div>
            <div>
              <h5>Policies</h5>
              <a href="/refund-policy">Refund & Replacement</a>
              <a href="/privacy">Privacy Policy</a>
            </div>
            <div>
              <h5>More</h5>
              <a href="/terms">Terms of Service</a>
              <a href="/shipping">Shipping & Delivery</a>
            </div>
          </div>
          <p class="copy">© 2026 Annapurna Chakki · Freshly ground with ❤️</p>
        </footer>

        {/* ---------- Bottom nav ---------- */}
        <nav class="bottomnav" id="bottomnav">
          {NAV_ITEMS.map((item) => (
            <a class={`navitem${active === item.key ? ' active' : ''}`} href={item.href}>
              <svg
                width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              >
                {raw(NAV_ICONS[item.key])}
              </svg>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        {/* ---------- Minimal shared JS (modal open/close + cart badge show/hide) ---------- */}
        <script>{raw(LAYOUT_SCRIPT)}</script>
      </body>
    </html>
  )
}