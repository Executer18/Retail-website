// src/pages/HomePage.tsx
//
// Route: GET /  (see index.tsx — featuredProducts now comes from
// lib/product-variants.ts's groupBySizeVariants, not a flat row list;
// see the note at the bottom of this file for the route-side change)
//
// Rebuilt to match the Annapurna Chakki mockup's index.html, against
// real data:
//   - search bar dropped — Layout's topbar already has one (header="search")
//   - category strip + grid: same D1 group-by-category query as before,
//     just restyled; icons come from lib/category-icons.ts since
//     products.category is plain text with no icon column
//   - hero carousel: 3 real photos from /public (ASSUMPTION — drop your
//     own files at public/hero/1.jpg, 2.jpg, 3.jpg; nothing is stored in
//     D1 for this, per your ask), dot timeline unchanged
//   - "Order your way" is now 3 cards in a horizontally-scrollable row
//     (was a 2-up grid): Browse Products, Grinding Charges (ported
//     as-is), and the new Sell to Store calculator — self-contained
//     client logic, no D1, easy to re-tune later (SELL_RATES below)
//   - Featured products: top 10 by available stock, using the new
//     ProductCard (handles size variants + real images)
//   - Milling process: un-pinned — same step markup/icons, now a plain
//     scrolling section instead of the scroll-jacked sticky panel
//   - "Why trust us" / quality-transparency section: removed entirely

import type { FC } from 'hono/jsx'
import { raw } from 'hono/html'
import { Layout } from '../components/Layout'
import { ProductCard, type ProductCardData } from '../components/ProductCard'
import { categoryIcon } from '../lib/category-icons'

export type HomeCategory = {
  name: string
  productCount: number
}





const qcCards = [
  {
    href: '/products',
    icon: '🛍️',
    title: 'Browse Products',
    subtitle: 'Atta, millets, besan & more',
    bg: '#ff8a3d',
    color: '#4a2200',
  },
  {
    onClick: 'calcModal',
    icon: '⚙️',
    title: 'Grinding Charges',
    subtitle: 'Get an instant quote',
    bg: '#3d8bff',
    color: '#00224a',
  },
  {
    onClick: 'sellModal',
    icon: '💰',
    title: 'Sell to Store',
    subtitle: 'Get a payout quote',
    bg: '#3dbf5c',
    color: '#003d12',
  },
]

const cardBaseStyle = `
  flex: 0 0 auto;
  width: 150px;
  min-height: 110px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 2px;
  padding: 16px;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  text-decoration: none;
  position: relative;
  overflow: hidden;
  font-family: inherit;
`

const iconStyle = `
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 56px;
  line-height: 1;
  opacity: 0.42;
  pointer-events: none;
  z-index: 0;
`

const textWrapStyle = `
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
`

const titleStyle = `display: block; font-size: 15px; font-weight: 800;`
const subtitleStyle = `font-size: 12px; opacity: 0.85;`



 



const MILLING_STEPS = [
  { title: 'Grain selection & cleaning', body: 'Every lot is sorted, de-stoned and winnowed before it touches the mill.' },
  { title: 'Sun conditioning', body: 'Grains rest at natural moisture — never over-dried, never chemically treated.' },
  { title: 'Slow stone grinding', body: 'Low-RPM chakki keeps the flour cool, preserving fibre, aroma and nutrients.' },
  { title: 'Sieving to your texture', body: 'Choose fine, medium or coarse — sieved fresh, exactly how your kitchen likes it.' },
  { title: 'Weighed & packed in front of you', body: 'Your grain, your flour, your eyes on the scale. Nothing in, nothing out.' },
]

// ASSUMPTION: three photos dropped straight into /public/hero — nothing
// fetched from D1 for the hero. Swap the src/alt/caption trio below for
// your real files. No .deco emoji here (unlike the mockup) — that's
// meant to float over a flat color block, not a photo.
const HERO_SLIDES = [
  { src: '/hero-1.webp', kicker: 'Fresh every morning', title: 'Stone-Ground Sharbati Atta', sub: 'Milled in front of you' },
  { src: '/hero-2.webp', kicker: 'Winter special', title: 'Millet Flours are Back', sub: 'Jowar · Bajra · Ragi — ground to order' },
  { src: '/hero-3.webp', kicker: 'Full transparency', title: 'Watch Your Grain Get Ground', sub: 'Live counter view · zero mixing guarantee' },
]


// Home-page-only client logic: the grinding calculator (ported straight
// from the mockup, same GRIND_RATES) and the new sell-to-store
// calculator. Neither touches D1 — SELL_RATES below is an illustrative
// starting point, edit freely.
const HOME_SCRIPT = `
  function rupee(n){ return '₹' + Math.round(n).toLocaleString('en-IN'); }

  var GRIND_RATES = { wheat:4, multigrain:5, millet:6, besan:5, rice:4, spice:8 }; // ₹/kg
  var GRIND_LABELS = { wheat:'Wheat', multigrain:'Multigrain mix', millet:'Millets', besan:'Chana dal → besan', rice:'Rice', spice:'Spices' };

  function toggleChip(el){ el.classList.toggle('on'); }

  function calcQuote(e){
    e.preventDefault();
    var grain = document.getElementById('c-grain').value;
    var kg = Math.max(1, parseFloat(document.getElementById('c-kg').value) || 0);
    var fine = document.getElementById('c-fine').classList.contains('on');
    var rate = GRIND_RATES[grain] + (fine ? 1 : 0);
    var total = rate * kg;
    var out = document.getElementById('calcOut');
    out.innerHTML =
      '<div class="row"><span>Grain</span><b>' + GRIND_LABELS[grain] + '</b></div>' +
      '<div class="row"><span>Quantity</span><b>' + kg + ' kg</b></div>' +
      '<div class="row"><span>Grinding @ ₹' + rate + '/kg</span><b>' + rupee(total) + '</b></div>' +
      '<div class="row total"><span>Total</span><b>' + rupee(total) + '</b></div>' +
      '<p style="font-size:11px;color:var(--color-muted);margin-top:8px">💡 Drop your grain at the store and collect fresh flour — final quote confirmed at the counter.</p>';
    out.classList.add('show');
    toast('Quote ready ✨');
  }

  // --- Sell to store — illustrative rates, tune freely ---
  var SELL_RATES = { wheat:22, mustard:52, soybean:45, chana:68, bajra:24, jowar:26, maize:20 }; // ₹/kg, Grade A
  var SELL_LABELS = { wheat:'Wheat', mustard:'Mustard', soybean:'Soybean', chana:'Chana (Gram)', bajra:'Bajra', jowar:'Jowar', maize:'Maize' };
  var GRADE_MULTIPLIER = { a:1, b:0.92, c:0.8 };
  var GRADE_LABEL = { a:'A · Clean & dry', b:'B · Average', c:'C · Needs cleaning' };

  function selectGrade(el){
    var row = document.getElementById('s-grade-row');
    row.querySelectorAll('.chip').forEach(function(c){ c.classList.remove('on'); });
    el.classList.add('on');
  }

  function sellQuote(e){
    e.preventDefault();
    var grain = document.getElementById('s-grain').value;
    var kg = Math.max(1, parseFloat(document.getElementById('s-kg').value) || 0);
    var gradeBtn = document.querySelector('#s-grade-row .chip.on');
    var grade = gradeBtn ? gradeBtn.dataset.grade : 'a';
    var baseRate = SELL_RATES[grain] || 0;
    var perKg = baseRate * (GRADE_MULTIPLIER[grade] || 1);
    var total = perKg * kg;
    var out = document.getElementById('sellOut');
    out.innerHTML =
      '<div class="row"><span>Grain</span><b>' + SELL_LABELS[grain] + '</b></div>' +
      '<div class="row"><span>Quantity</span><b>' + kg + ' kg</b></div>' +
      '<div class="row"><span>Quality grade</span><b>' + GRADE_LABEL[grade] + '</b></div>' +
      '<div class="row"><span>Rate @ ₹' + perKg.toFixed(2) + '/kg</span><b>' + rupee(total) + '</b></div>' +
      '<div class="row total"><span>Estimated payout</span><b>' + rupee(total) + '</b></div>' +
      '<p style="font-size:11px;color:var(--color-muted);margin-top:8px">💡 Bring a sample to the counter — the final rate is confirmed after a quick quality check.</p>';
    out.classList.add('show');
    toast('Quote ready ✨');
  }

  // --- Hero carousel (same dot-timeline logic as the mockup) ---
  (function initHero(){
    var track = document.getElementById('heroTrack');
    if (!track) return;
    var dots = Array.prototype.slice.call(document.querySelectorAll('.hero-dot'));
    var n = dots.length, i = 0, timer;
    function go(k){
      i = (k + n) % n;
      track.style.transform = 'translateX(-' + (i * 100) + '%)';
      dots.forEach(function(d, j){
        d.classList.remove('on');
        void d.offsetWidth;
        if (j === i) d.classList.add('on');
      });
    }
    function auto(){ clearInterval(timer); timer = setInterval(function(){ go(i + 1); }, 4500); }
    dots.forEach(function(d, j){ d.addEventListener('click', function(){ go(j); auto(); }); });
    var sx = null;
    track.addEventListener('touchstart', function(e){ sx = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', function(e){
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
      sx = null; auto();
    }, { passive: true });
    go(0); auto();
  })();
`




export const HomePage: FC<{
  featuredProducts: ProductCardData[]
  categories: HomeCategory[]
  cartQuantities: Record<number, number>   
}> = ({ featuredProducts, categories, cartQuantities }) => {
  return (
    <Layout title="Home" description="Fresh atta, besan, and sooji, ground daily. Order online for pickup." active="home" header="search">
      {/* ---------- Category strip ---------- */}
      <nav class="catstrip">
        <a href="/products" class="catpill">
          <span class="ic">✨</span>
          <span>All</span>
        </a>
        {categories.map((cat) => (
          <a href={`/products?category=${encodeURIComponent(cat.name)}`} class="catpill">
            <span class="ic">{categoryIcon(cat.name)}</span>
            <span>{cat.name}</span>
          </a>
        ))}
      </nav>

      {/* ---------- Hero carousel ---------- */}
      <section class="hero">
        <div class="hero-track" id="heroTrack">
          {HERO_SLIDES.map((slide) => (
            <div class="slide">
              <div class="bg">
                <img src={slide.src} alt={slide.title} />
              </div>
              <div class="txt">
                <div class="kicker">{slide.kicker}</div>
                <h2>{slide.title}</h2>
                <p>{slide.sub}</p>
              </div>
            </div>
          ))}
        </div>
        <div class="hero-dots">
          {HERO_SLIDES.map(() => (
            <span class="hero-dot">
              <i></i>
            </span>
          ))}
        </div>
      </section>

      {/* ---------- Shop by category ---------- */}
      <section class="sec reveal">
        <div class="sec-head">
          <h3>Shop by category</h3>
          <a class="more" href="/products">
            View all →
          </a>
        </div>
        <div class="catgrid">
          {categories.map((cat, i) => (
            <a class="catcard" style={`animation-delay:${i * 60}ms`} href={`/products?category=${encodeURIComponent(cat.name)}`}>
              {i === 0 && <span class="tag">POPULAR</span>}
              <span class="big">{categoryIcon(cat.name)}</span>
              <b>{cat.name}</b>
              <small>{cat.productCount} items</small>
            </a>
          ))}
        </div>
      </section>

      {/* ---------- Order your way (now 3 cards, horizontally scrollable) ---------- */}
      <section class="sec reveal">
  <h3 style="font-size:17px;font-weight:800;margin-bottom:12px">
    What would you like to do?
  </h3>
  <div style="display:flex;flex-wrap:nowrap;gap:12px;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;scroll-snap-type:x proximity;padding-bottom:4px;scrollbar-width: none;">
    {qcCards.map((card) =>
      card.href ? (
        <a
          href={card.href}
          style={`${cardBaseStyle} background:${card.bg}; color:${card.color};`}
        >
          <span style={iconStyle} aria-hidden="true">{card.icon}</span>
          <span style={textWrapStyle}>
            <b style={titleStyle}>{card.title}</b>
            <span style={subtitleStyle}>{card.subtitle}</span>
          </span>
        </a>
      ) : (
        <button
          type="button"
          onclick={`openSheet('${card.onClick}')`}
          style={`${cardBaseStyle} background:${card.bg}; color:${card.color};`}
        >
          <span style={iconStyle} aria-hidden="true">{card.icon}</span>
          <span style={textWrapStyle}>
            <b style={titleStyle}>{card.title}</b>
            <span style={subtitleStyle}>{card.subtitle}</span>
          </span>
        </button>
      )
    )}
  </div>
</section>

      {/* ---------- Featured products ---------- */}
      <section class="sec reveal">
        <div class="sec-head">
          <h3>Featured products</h3>
          <a class="more" href="/products">
            See all →
          </a>
        </div>
        {featuredProducts.length > 0 ? (
          <div class="prodgrid">
            {featuredProducts.map((product) => (
              <ProductCard product={product} cartQuantities={cartQuantities} />
            ))}
          </div>
        ) : (
          <div class="empty">
            <div class="em">🌾</div>
            <b>No products yet</b>
          </div>
        )}
      </section>

      {/* ---------- Milling process — plain scroll now, no pin/sticky ---------- */}
      <section class="sec reveal">
        <div class="pin-eyebrow">How your atta is made</div>
        <h4>🌾 Our Milling Process</h4>
        <p class="pin-sub">From grain to your bag</p>
        <div class="pin-body">
          <div class="pin-line">
            <i style="height:100%"></i>
          </div>
          <div class="pin-steps">
            {MILLING_STEPS.map((step, i) => (
              <div class="pin-step on">
                <span class="n">{i + 1}</span>
                <div>
                  <b>{step.title}</b>
                  <p>{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Grinding charge calculator (ported as-is) ---------- */}
      <div class="modal-back" id="calcModal" onclick="if(event.target===this)closeSheet('calcModal')">
        <div class="modal">
          <div class="grab"></div>
          <button class="modal-close" onclick="closeSheet('calcModal')">
            ✕
          </button>
          <h3>⚙️ Grinding Charge Calculator</h3>
          <p class="sub">Get an instant estimate for milling your own grain</p>
          <form onsubmit="calcQuote(event)">
            <div class="field">
              <label>What are we grinding?</label>
              <select id="c-grain">
                <option value="wheat">Wheat (₹4/kg)</option>
                <option value="multigrain">Multigrain mix (₹5/kg)</option>
                <option value="millet">Millets — jowar/bajra/ragi (₹6/kg)</option>
                <option value="besan">Chana dal → besan (₹5/kg)</option>
                <option value="rice">Rice (₹4/kg)</option>
                <option value="spice">Spices (₹8/kg)</option>
              </select>
            </div>
            <div class="field">
              <label>Quantity (kg)</label>
              <input id="c-kg" type="number" min="1" max="100" value="10" required />
            </div>
            <div class="field">
              <label>Options</label>
              <div class="chiprow">
                <button type="button" class="chip" id="c-fine" onclick="toggleChip(this)">
                  Extra-fine sieve (+₹1/kg)
                </button>
              </div>
            </div>
            <div class="calc-out" id="calcOut"></div>
            <button class="modal-go" type="submit">
              Get Estimate
            </button>
          </form>
        </div>
      </div>

      {/* ---------- Sell to Store (new) ---------- */}
      <div class="modal-back" id="sellModal" onclick="if(event.target===this)closeSheet('sellModal')">
        <div class="modal">
          <div class="grab"></div>
          <button class="modal-close" onclick="closeSheet('sellModal')">
            ✕
          </button>
          <h3>💰 Sell to Store</h3>
          <p class="sub">Get an instant payout estimate for your grain</p>
          <form onsubmit="sellQuote(event)">
            <div class="field">
              <label>What are you selling?</label>
              <select id="s-grain">
                <option value="wheat">Wheat</option>
                <option value="mustard">Mustard</option>
                <option value="soybean">Soybean</option>
                <option value="chana">Chana (Gram)</option>
                <option value="bajra">Bajra</option>
                <option value="jowar">Jowar</option>
                <option value="maize">Maize</option>
              </select>
            </div>
            <div class="field">
              <label>Quantity (kg)</label>
              <input id="s-kg" type="number" min="1" max="1000" value="50" required />
            </div>
            <div class="field">
              <label>Quality grade</label>
              <div class="chiprow" id="s-grade-row">
                <button type="button" class="chip on" data-grade="a" onclick="selectGrade(this)">
                  A · Clean &amp; dry
                </button>
                <button type="button" class="chip" data-grade="b" onclick="selectGrade(this)">
                  B · Average
                </button>
                <button type="button" class="chip" data-grade="c" onclick="selectGrade(this)">
                  C · Needs cleaning
                </button>
              </div>
            </div>
            <div class="calc-out" id="sellOut"></div>
            <button class="modal-go" type="submit">
              Get Payout Estimate
            </button>
          </form>
        </div>
      </div>

      <script>{raw(HOME_SCRIPT)}</script>
    </Layout>
  )
}

