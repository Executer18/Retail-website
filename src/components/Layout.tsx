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
import { getContext } from 'hono/context-storage'


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
    // Cart line "− [input] +" stepper (CartContents.tsx). Defined once here
  // (not inside the htmx-swapped fragment) since htmx doesn't re-run
  // <script> tags reliably in swapped-in content.
  // The visible input is a PACK COUNT (1, 2, 3…), step=1 always,
  // regardless of whether one pack is 0.05kg or 5kg — it carries
  // data-size-kg so we can convert back to the actual kg the server
  // expects. The visible input itself has no "name" (never submitted
  // directly); syncPackQtyHidden() writes the real kg amount into the
  // sibling hidden field (.ci-step__kg-hidden, name="quantityKg") right
  // before every submit.
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
    syncPackQtyHidden(form, input);
    form.requestSubmit();
  }
  function syncPackQtyHidden(form, input){
    var sizeKg = parseFloat(input.getAttribute('data-size-kg')) || 1;
    var hidden = form.querySelector('.ci-step__kg-hidden');
    if (hidden) hidden.value = Math.round((parseFloat(input.value || '0') * sizeKg) * 1000) / 1000;
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


    // ProductDetailPage's size picker: boxed variants, pick one to reveal
  // its own AddToCartControl (pre-rendered per variant, just hidden —
  // see ProductDetailPage.tsx for why), hide the others and the
  // placeholder. Clicking "Add to Cart" before picking shows the red
  // message instead of doing anything — pure frontend check, no request.
  function selectDetailVariant(boxEl, variantId){
    if (boxEl.disabled) return;
    document.querySelectorAll('.variant-box').forEach(function(b){ b.classList.remove('on'); });
    boxEl.classList.add('on');
    var msg = document.getElementById('variant-required-msg');
    if (msg) msg.style.display = 'none';
    var placeholder = document.getElementById('variant-placeholder-addrow');
    if (placeholder) placeholder.style.display = 'none';
    document.querySelectorAll('[data-variant-wrap]').forEach(function(w){
      w.style.display = (w.getAttribute('data-variant-wrap') === String(variantId)) ? '' : 'none';
    });
  }
  function requireVariantSelection(){
    var msg = document.getElementById('variant-required-msg');
    if (msg) msg.style.display = 'block';
  }

    // Swipe for the fullscreen viewer — was ‹›-button-only before.
  var viewerSwipeStartX = null;
  document.getElementById('viewer') && document.getElementById('viewer').addEventListener('touchstart', function(e){
    viewerSwipeStartX = e.touches[0].clientX;
  }, { passive: true });
  document.getElementById('viewer') && document.getElementById('viewer').addEventListener('touchend', function(e){
    if (viewerSwipeStartX === null) return;
    var dx = e.changedTouches[0].clientX - viewerSwipeStartX;
    viewerSwipeStartX = null;
    if (Math.abs(dx) > 40) viewerGo(dx < 0 ? 1 : -1);
  }, { passive: true });

  // Clones imgEl (falls back to a 🌾 emoji span if there's no real image)
  // and animates it from originEl's position to the cart icon. Called
  // directly via onclick on ProductCard's ADD/+ buttons and the
  // variant-picker's per-size rows — fires immediately on click rather
  // than waiting on the htmx round-trip.
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

  // Product-detail gallery: numbered dots + swipe. Delegated (not bound
  // directly to #pdTrack) since the gallery is usually injected later via
  // htmx into #detail-modal-body, not present when this script first runs.
  function pdGo(i){
    var track = document.getElementById('pdTrack');
    if (!track) return;
    var dots = track.parentElement.querySelectorAll('.pd-dot');
    track.style.transform = 'translateX(-' + (i * 100) + '%)';
    dots.forEach(function(d, j){ d.classList.toggle('on', j === i); });
  }
  var pdSwipeStartX = null;
  document.body.addEventListener('touchstart', function(e){
    if (e.target.closest('.pd-track')) pdSwipeStartX = e.touches[0].clientX;
  }, { passive: true });
  document.body.addEventListener('touchend', function(e){
    if (pdSwipeStartX === null) return;
    var track = e.target.closest('.pd-track');
    if (!track) { pdSwipeStartX = null; return; }
    var dx = e.changedTouches[0].clientX - pdSwipeStartX;
    pdSwipeStartX = null;
    if (Math.abs(dx) < 40) return;
    var dots = track.parentElement.querySelectorAll('.pd-dot');
    var slideCount = track.querySelectorAll('.pd-slide').length;
    var activeIdx = 0;
    dots.forEach(function(d, j){ if (d.classList.contains('on')) activeIdx = j; });
    pdGo(Math.max(0, Math.min(slideCount - 1, activeIdx + (dx < 0 ? 1 : -1))));
  }, { passive: true });

  // Fullscreen image viewer (ProductDetailPage's gallery). Ported from
  // the mockup's app.js — only real change is renderViewer() injecting a
  // real <img> instead of setting an emoji + background-color pair.
  var vImgs = [], vIdx = 0;
  function openViewer(imgs, i){
    vImgs = imgs; vIdx = i || 0;
    renderViewer();
    document.getElementById('viewer').classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeViewer(){
    document.getElementById('viewer').classList.remove('open');
    document.body.style.overflow = '';
  }
  function viewerGo(d){ vIdx = (vIdx + d + vImgs.length) % vImgs.length; renderViewer(); }
  function renderViewer(){
    var src = vImgs[vIdx];
    document.getElementById('vImg').innerHTML = src ? '<img src="' + src + '" alt="">' : '';
    document.getElementById('vCount').textContent = (vIdx + 1) + ' / ' + vImgs.length;
  }
  document.addEventListener('keydown', function(e){
    var v = document.getElementById('viewer');
    if (!v || !v.classList.contains('open')) return;
    if (e.key === 'Escape') closeViewer();
    if (e.key === 'ArrowLeft') viewerGo(-1);
    if (e.key === 'ArrowRight') viewerGo(1);
  });

  // After a successful add from inside the size-variant modal, close it
  // so the shopper sees the toast/fly animation land rather than
  // staring at the picker.
  document.body.addEventListener('htmx:afterRequest', function(e){
    var elt = e.detail.elt;
    var path = (e.detail.requestConfig && e.detail.requestConfig.path) || '';
    if (e.detail.successful && path.indexOf('/api/cart/adjust/') > -1 && elt.closest('#variantModal')) {
      setTimeout(function(){ closeSheet('variantModal'); }, 450);
    }
  });

  // maximum product added message
  document.body.addEventListener('cart-warning', function(e){
  toast((e.detail && e.detail.message) || 'Only a limited quantity is available.');
});

// offline no internet connection
// offline / online banner (self-contained: injects its own CSS)
var netBanner, netIcon, netText, netTimer;

(function(){
  if (document.getElementById('net-banner-style')) return;
  var s = document.createElement('style');
  s.id = 'net-banner-style';
  s.textContent = [
    '.net-banner{position:fixed;left:50%;bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:9999;display:flex;align-items:center;gap:8px;max-width:calc(100% - 24px);padding:10px 16px;border-radius:999px;font-size:13px;font-weight:600;line-height:1.2;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.25);pointer-events:none;opacity:0;visibility:hidden;transform:translate(-50%,24px);transition:transform .3s ease,opacity .3s ease,visibility 0s linear .3s}',
    '.net-banner.show{opacity:1;visibility:visible;transform:translate(-50%,0);transition-delay:0s}',
    '.net-banner.offline{background:linear-gradient(135deg,#ef4444,#b91c1c)}',
    '.net-banner.online{background:linear-gradient(135deg,#22c55e,#15803d)}',
    '.net-banner__icon{display:inline-flex;width:18px;height:18px;flex:0 0 18px}',
    '.net-banner__icon svg{width:18px;height:18px;display:block}',
    '.net-banner.offline .net-banner__icon{animation:net-pulse 1.4s ease-in-out infinite}',
    '@keyframes net-pulse{0%,100%{opacity:1}50%{opacity:.4}}',
    '@media (prefers-reduced-motion:reduce){.net-banner,.net-banner.offline .net-banner__icon{transition:none;animation:none}}'
  ].join('');
  document.head.appendChild(s);
})();

var NET_ICONS = {
  offline: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="2" x2="22" y2="22"/><path d="M8.5 16.4a5 5 0 0 1 7 0"/><path d="M5 12.9a10 10 0 0 1 5.2-2.7"/><path d="M19 12.9a10 10 0 0 0-2.1-1.6"/><path d="M2 8.8a15 15 0 0 1 4.2-2.6"/><path d="M22 8.8a15 15 0 0 0-8.3-3.7"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>',
  online: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.9a10 10 0 0 1 14 0"/><path d="M2 8.8a15 15 0 0 1 20 0"/><path d="M8.5 16.4a5 5 0 0 1 7 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>'
};

function getNetBanner(){
  if (netBanner) return netBanner;
  netBanner = document.createElement('div');
  netBanner.className = 'net-banner';
  netBanner.setAttribute('role', 'status');
  netBanner.setAttribute('aria-live', 'polite');
  netIcon = document.createElement('span');
  netIcon.className = 'net-banner__icon';
  netText = document.createElement('span');
  netBanner.appendChild(netIcon);
  netBanner.appendChild(netText);
  document.body.appendChild(netBanner);
  return netBanner;
}

function showNetBanner(state, message, autoHideMs){
  var el = getNetBanner();
  clearTimeout(netTimer);
  netIcon.innerHTML = NET_ICONS[state];
  netText.textContent = message;
  el.className = 'net-banner ' + state;
  void el.offsetWidth;
  el.classList.add('show');
  if (autoHideMs) netTimer = setTimeout(hideNetBanner, autoHideMs);
}

function hideNetBanner(){
  if (netBanner) netBanner.classList.remove('show');
}

window.addEventListener('offline', function(){
  showNetBanner('offline', 'No internet connection');
});
window.addEventListener('online', function(){
  showNetBanner('online', 'Back online', 2500);
});
if (!navigator.onLine) showNetBanner('offline', 'No internet connection');

document.body.addEventListener('htmx:sendError', function(){
  if (!navigator.onLine) return;
  showNetBanner('offline', 'Connection problem. Please try again', 3500);
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


(function () {
  // one-time CSS, injected from JS
  var st = document.createElement('style');
  st.textContent =
  '.plus.is-max{opacity:.5;cursor:not-allowed}' +
  '.addrow,.pd-cart{position:relative}' +
  '.max-msg{position:absolute;left:50%;bottom:calc(100% + 10px);transform:translateX(-50%);' +
    'display:flex;align-items:center;gap:6px;background:#1f2937;color:#fff;' +
    'font-size:12px;font-weight:600;line-height:1;padding:8px 12px;border-radius:10px;' +
    'white-space:nowrap;z-index:50;pointer-events:none;' +
    'box-shadow:0 8px 20px rgba(0,0,0,.25);animation:maxMsgIn .18s ease-out}' +
  '.max-msg::before{content:"!";display:inline-flex;align-items:center;justify-content:center;' +
    'width:16px;height:16px;border-radius:50%;background:#f59e0b;color:#1f2937;' +
    'font-size:11px;font-weight:800}' +
  '.max-msg::after{content:"";position:absolute;left:50%;top:100%;width:10px;height:10px;' +
    'margin-top:-5px;background:#1f2937;border-radius:2px;transform:translateX(-50%) rotate(45deg)}' +
  '.max-msg.out{opacity:0;transform:translateX(-50%) translateY(4px);transition:opacity .25s,transform .25s}' +
  '@keyframes maxMsgIn{from{opacity:0;transform:translateX(-50%) translateY(6px)}' +
    'to{opacity:1;transform:translateX(-50%) translateY(0)}}';

    
  document.head.appendChild(st);

  // capture phase: runs before the inline onclick (fly animation) and before htmx submits
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.plus.is-max');
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    var row = btn.closest('.addrow, .pd-cart');
    if (!row) return;

    var old = row.querySelector('.max-msg');
    if (old) { clearTimeout(old._t); old.remove(); }

    var msg = document.createElement('div');
    msg.className = 'max-msg';
    msg.textContent = 'Only ' + btn.dataset.avail + ' available';
    
    row.appendChild(msg);

    msg._t = setTimeout(function () {
  msg.classList.add('out');
  setTimeout(function () { msg.remove(); }, 250);
}, 1800);
     
  }, true);
})();



// multiple clicks for stepper

(function () {
  var DEBOUNCE = 350; // ms of no clicking before the request is sent
  var state = {};     // one entry per product, keyed by its adjust URL

  function round(n) { return Math.round(n * 1e6) / 1e6; }

  function paint(url, st) {
    document.querySelectorAll('form[hx-post="' + url + '"]').forEach(function (f) {
      var box = f.closest('.stepper, .pd-cart__stepper');
      if (!box) return;
      var b = box.querySelector('b');
      var plus = box.querySelector('.plus');
      if (b) b.textContent = st.shown;
      if (plus) plus.classList.toggle('is-max', st.shown >= parseInt(plus.dataset.avail, 10));
    });
  }

  function serverCount(url) {
    var f = document.querySelector('form[hx-post="' + url + '"]');
    var box = f && f.closest('.stepper, .pd-cart__stepper');
    var b = box && box.querySelector('b');
    return b ? (parseInt(b.textContent, 10) || 0) : 0;
  }

  function send(url) {
    var st = state[url];
    if (!st || st.busy) return;
    if (st.kg === 0) { delete state[url]; return; } // + and - cancelled out

    var kg = st.kg;
    st.kg = 0;
    st.packs = 0;
    st.busy = true;

    var done = function () {
      // wait for htmx to finish swapping the fresh stepper in
      setTimeout(function () {
        st.busy = false;
        if (st.kg !== 0) {
          // clicks arrived while in flight: server count + those clicks
          st.shown = serverCount(url) + st.packs;
          paint(url, st);
          send(url);
        } else {
          delete state[url];
        }
      }, 60);
    };

    htmx.ajax('POST', url, {
      target: '#cart-count',
      swap: 'innerHTML',
      values: { delta: kg }
    }).then(done, done);
  }

  // capture phase, so htmx never sees the individual submit clicks
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.stepper button, .pd-cart__stepper button');
    if (!btn || btn.classList.contains('is-max')) return; // max message handles that

    var form = btn.closest('form');
    var url = form && form.getAttribute('hx-post');
    if (!url || url.indexOf('/api/cart/adjust/') !== 0) return;

    var input = form.querySelector('input[name="delta"]');
    var kg = parseFloat(input.value);
    var dir = kg > 0 ? 1 : -1;

    e.preventDefault();
    e.stopPropagation();

    var box = btn.closest('.stepper, .pd-cart__stepper');
    var st = state[url];
    if (!st) {
      st = state[url] = {
        shown: parseInt(box.querySelector('b').textContent, 10) || 0,
        kg: 0, packs: 0, timer: null, busy: false
      };
    }
    if (dir < 0 && st.shown <= 0) return;

    st.shown += dir;
    st.kg = round(st.kg + kg);
    st.packs += dir;

    if (dir > 0 && btn.onclick) btn.onclick.call(btn, e); // keep the fly-to-cart animation
    paint(url, st);

    clearTimeout(st.timer);
    st.timer = setTimeout(function () { send(url); }, DEBOUNCE);
  }, true);
})();

// multiple click variant chips and cart row
(function () {
  var DEBOUNCE = 350;
  function round(n) { return Math.round(n * 1e6) / 1e6; }

  /* ---------- CART ROW STEPPER (.ci-step) ---------- */
  var rows = {}; // keyed by the form's update URL

  function rowForm(url) { return document.querySelector('form.ci-step[hx-post="' + url + '"]'); }

  function paintRow(url, st) {
    var f = rowForm(url);
    if (!f) return;
    var input = f.querySelector('.ci-step__input');
    var hidden = f.querySelector('.ci-step__kg-hidden');
    var plus = f.querySelectorAll('.ci-step__btn')[1];
    input.value = st.target;
    hidden.value = round(st.target * st.size);
    if (plus) plus.disabled = st.target >= st.max;
  }

  function sendRow(url) {
    var st = rows[url];
    if (!st || st.busy) return;
    var sent = st.target;
    st.busy = true;

    var done = function () {
      setTimeout(function () {
        st.busy = false;
        if (st.target !== sent) {
          paintRow(url, st); // clicks arrived in flight: re-apply on the fresh DOM
          sendRow(url);
        } else {
          delete rows[url];
        }
      }, 60);
    };

    htmx.ajax('POST', url, {
      target: '#cart-contents',
      swap: 'outerHTML',
      values: { quantityKg: round(sent * st.size) }
    }).then(done, done);
  }

  // capture phase: also stops the inline bumpQty() from running
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.ci-step__btn');
    if (!btn) return;
    var form = btn.closest('form.ci-step');
    var url = form && form.getAttribute('hx-post');
    if (!url) return;

    e.preventDefault();
    e.stopPropagation();

    var input = form.querySelector('.ci-step__input');
    var dir = btn.textContent.trim() === '+' ? 1 : -1;
    var st = rows[url];
    if (!st) {
      st = rows[url] = {
        target: parseInt(input.value, 10) || 0,
        size: parseFloat(input.dataset.sizeKg) || 1,
        max: parseInt(input.max, 10) || 0,
        timer: null,
        busy: false
      };
    }
    var next = st.target + dir;
    if (next < 0 || next > st.max) return;
    st.target = next;
    paintRow(url, st);

    clearTimeout(st.timer);
    st.timer = setTimeout(function () { sendRow(url); }, DEBOUNCE);
  }, true);

  // typing a number submits immediately via the inline handler, so drop any pending batch
  document.addEventListener('change', function (e) {
    var input = e.target.closest && e.target.closest('.ci-step__input');
    var form = input && input.form;
    var url = form && form.getAttribute('hx-post');
    if (url && rows[url]) { clearTimeout(rows[url].timer); delete rows[url]; }
  });

  /* ---------- VARIANT CHIPS (.variant-chip) ---------- */
  var chips = {}; // keyed by the adjust URL

  function chipFor(url) {
    var f = document.querySelector('.variant-chip-row form[hx-post="' + url + '"]');
    return f && f.querySelector('.variant-chip');
  }

  function paintChip(url, st) {
    var chip = chipFor(url);
    if (!chip) return;
    var badge = chip.querySelector('.variant-chip__badge');
    if (st.shown > 0 && !badge) {
      badge = document.createElement('span');
      badge.className = 'variant-chip__badge';
      chip.appendChild(badge);
    }
    if (badge) {
      if (st.shown > 0) badge.textContent = st.shown;
      else badge.remove();
    }
    chip.classList.toggle('has-qty', st.shown > 0);
  }

  function chipServerCount(url) {
    var chip = chipFor(url);
    var b = chip && chip.querySelector('.variant-chip__badge');
    return b ? (parseInt(b.textContent, 10) || 0) : 0;
  }

  function sendChip(url) {
    var st = chips[url];
    if (!st || st.busy) return;
    if (st.packs === 0) { delete chips[url]; return; }

    var kg = round(st.packs * st.size);
    st.packs = 0;
    st.busy = true;

    var done = function () {
      setTimeout(function () {
        st.busy = false;
        if (st.packs !== 0) {
          st.shown = chipServerCount(url) + st.packs;
          paintChip(url, st);
          sendChip(url);
        } else {
          delete chips[url];
        }
      }, 60);
    };

    htmx.ajax('POST', url, {
      target: '#cart-count',
      swap: 'innerHTML',
      values: { delta: kg }
    }).then(done, done);
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.variant-chip');
    if (!btn || btn.disabled) return;
    var form = btn.closest('form');
    var url = form && form.getAttribute('hx-post');
    if (!url) return;

    e.preventDefault();
    e.stopPropagation();

    var avail = parseInt(btn.dataset.avail, 10) || 0;
    var st = chips[url];
    if (!st) {
      var b = btn.querySelector('.variant-chip__badge');
      st = chips[url] = {
        shown: b ? (parseInt(b.textContent, 10) || 0) : 0,
        size: parseFloat(form.querySelector('input[name="delta"]').value) || 1,
        packs: 0, timer: null, busy: false
      };
    }
    if (st.shown >= avail) return; // nothing left to add

    st.shown += 1;
    st.packs += 1;

    if (btn.onclick) btn.onclick.call(btn, e); // keep fly-to-cart + toast
    paintChip(url, st);

    clearTimeout(st.timer);
    st.timer = setTimeout(function () { sendChip(url); }, DEBOUNCE);
  }, true);
})();


  
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


   
// 1. Fetch the Hono context automatically out of thin air
  const c = getContext()
  
  // 2. Check if the user is on the checkout page (fallback safely if c is undefined)
  const isCheckout = c?.req?.path?.startsWith('/checkout');



  
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

        <style>{`
          .hide-cart {
            display: none !important;
          
          }
        `}</style> 
        
      </head>
      <body class={active ? `page-${active}` : undefined}>
        {/* Was accidentally left after </body> in a hand-edit — fixed,
            belongs here so it's a real part of the render tree. */}
        

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
          class={isCheckout ? 'hide-cart' : undefined}
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
            <div id="cart-body" hx-get="/api/cart/contents" hx-trigger="load, cart-updated from:body"></div>
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
        {/* ---------- Product detail popup (bottom sheet, ~80% height) ---------- */}
        {/* ProductCard's onclick opens this + hx-gets the product into
            #detail-modal-body (see products.ts's GET /products/:id/panel).
            A direct visit to /products/:id (no HX-Request header) skips
            this entirely and gets the plain full-page version instead —
            see ProductDetailPage.tsx. */}
        <div class="modal-back" id="detailModal" onclick="if(event.target===this)closeSheet('detailModal')">
          <div class="modal sheet-80">
            <div class="grab"></div>
            <button class="modal-close" onclick="closeSheet('detailModal')">✕</button>
            <div id="detail-modal-body"></div>
          </div>
        </div>

        {/* ---------- Fullscreen image viewer ---------- */}
        {/* Opened by the gallery's own onclick (openViewer(imageUrls, i)) —
            ported from the mockup's app.js, adapted to swap a real <img>
            into #vImg instead of an emoji+background-color pair. */}
        <div class="viewer" id="viewer">
          <button class="v-close" onclick="closeViewer()">
            ✕
          </button>
          <button class="v-nav v-prev" onclick="viewerGo(-1)">
            ‹
          </button>
          <div class="v-stage">
            <div class="v-img" id="vImg"></div>
            <div class="v-count" id="vCount"></div>
          </div>
          <button class="v-nav v-next" onclick="viewerGo(1)">
            ›
          </button>
        </div>

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
            