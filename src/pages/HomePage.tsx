// pages/HomePage.tsx
//
// Route: GET /
//
// Rebuilt after feedback that the first pass was just a hero + one grid.
// A real grocery/Instamart-style homepage is a stack of distinct sections,
// each answering a different question for the shopper. This version has:
//
//   1. Sticky search bar (same visual search bar as the listing page —
//      submitting it on the homepage just navigates to /products?q=...,
//      the listing page owns the actual filtering)
//   2. Category grid — tappable tiles, one per category, image-free text
//      tiles for now (see ASSUMPTIONS: no category-image column exists)
//   3. Hero banner — moved below search+categories, because on a real
//      grocery app the "what do you need" tools come first, the banner is
//      secondary
//   4. "Order your way" — the three non-retail order types (grind your own
//      wheat, bring wheat + take atta instead, sell wheat to us) as cards
//      linking to dedicated pages. These flows exist per your Phase 1
//      brainstorm but their pages are built in a later phase — see
//      ASSUMPTIONS, the links point at routes that return 404 until then.
//   5. Featured products — same ProductCard grid as before, now using
//      "in stock" product rows
//   6. Shop by category repeated as a browsable row of same-style product
//      cards IS deliberately NOT duplicated — one category entry point
//      (the grid in #2) is enough; a second one would just be noise.
//
// "Featured" is still: highest in_stock_kg, capped at 8 — see ASSUMPTIONS.

import type { FC } from 'hono/jsx'
import { Layout } from '../components/Layout'
import { ProductCard, type ProductCardData } from '../components/ProductCard'

export type HomeCategory = {
  name: string
  productCount: number
}

export const HomePage: FC<{
  featuredProducts: ProductCardData[]
  categories: HomeCategory[]
}> = ({ featuredProducts, categories }) => {
  return (
    <Layout title="Home" description="Fresh atta, besan, and sooji, ground daily. Order online for pickup.">
      {/* ---------- Search ---------- */}
      <form action="/products" method="get" class="search-bar">
        <svg class="search-bar__icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            fill="currentColor"
            d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z"
          />
        </svg>
        <input
          type="text"
          name="q"
          placeholder="Search for atta, besan, sooji..."
          class="search-bar__input"
          aria-label="Search products"
        />
      </form>

      {/* ---------- Category grid ---------- */}
      <section class="home-section">
        <div class="section-heading">
          <h2>Shop by category</h2>
        </div>
        <div class="category-grid">
          {categories.map((cat) => (
            <a href={`/products?category=${encodeURIComponent(cat.name)}`} class="category-tile">
              <span class="category-tile__initial">{cat.name.charAt(0)}</span>
              <span class="category-tile__name">{cat.name}</span>
              <span class="category-tile__count">{cat.productCount} items</span>
            </a>
          ))}
        </div>
      </section>

      {/* ---------- Hero ---------- */}
      <section class="hero">
        <h1>Fresh flour, ground daily at your neighbourhood chakki</h1>
        <p class="text-muted">
          Order ready-made atta, besan, and sooji for pickup, or bring your own wheat in for grinding.
        </p>
        <div style="margin-top: var(--space-3);">
          <a href="/products" class="btn btn-primary">
            Order now
          </a>
        </div>
      </section>

      {/* ---------- Order your way (the 4 order-flow types) ---------- */}
      <section class="home-section">
        <div class="section-heading">
          <h2>Order your way</h2>
        </div>
        <div class="order-type-grid">
          <a href="/products" class="order-type-card">
            <span class="order-type-card__icon" aria-hidden="true">
              🛍️
            </span>
            <h3>Buy ready-made</h3>
            <p>Order atta, besan, or sooji straight from stock for pickup.</p>
          </a>
          <a href="/grind-your-wheat" class="order-type-card">
            <span class="order-type-card__icon" aria-hidden="true">
              🌾
            </span>
            <h3>Bring your wheat to grind</h3>
            <p>Drop off your own wheat and collect fresh atta, ground your way.</p>
          </a>
          <a href="/swap-wheat-for-atta" class="order-type-card">
            <span class="order-type-card__icon" aria-hidden="true">
              🔄
            </span>
            <h3>Swap wheat for ready atta</h3>
            <p>Bring your wheat, skip the wait, and take our ready-made atta instead.</p>
          </a>
          <a href="/sell-your-grain" class="order-type-card">
            <span class="order-type-card__icon" aria-hidden="true">
              💰
            </span>
            <h3>Sell your grain to us</h3>
            <p>Bring your wheat or rice in and get a quote on the spot.</p>
          </a>
        </div>
      </section>

      {/* ---------- Featured products ---------- */}
      <section class="home-section">
        <div class="section-heading">
          <h2>Featured products</h2>
          <a href="/products" class="text-muted" style="font-size: 0.9rem;">
            View all
          </a>
        </div>

        {featuredProducts.length > 0 ? (
          <div class="grid-cards">
            {featuredProducts.map((product) => (
              <ProductCard product={product} />
            ))}
          </div>
        ) : (
          <div class="empty-state">
            <p>No products added yet. Check back soon.</p>
          </div>
        )}
      </section>
    </Layout>
  )
}
