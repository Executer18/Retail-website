// pages/ProductsListPage.tsx
//
// Route: GET /products
// Route: GET /products?category=Atta
// Route: GET /products?q=besan
// Route: GET /products?category=Atta&q=besan   (both together)
//
// Rebuilt per feedback: real search bar (was completely missing before),
// and a denser Amazon-Now-style grid. Category filter stays a HORIZONTAL
// chip bar, not a sidebar — you explicitly said to skip the sidebar, and a
// sidebar also doesn't fit a single-column mobile layout anyway, which is
// the primary device for this store's customers.
//
// `q` is read server-side in the route handler (plain LIKE match against
// item_name) and passed back here just to keep the search input filled in
// and to drive the empty-state message — this file does no filtering
// itself.

import type { FC } from 'hono/jsx'
import { Layout } from '../components/Layout'
import { ProductCard, type ProductCardData } from '../components/ProductCard'

export const ProductsListPage: FC<{
  products: ProductCardData[]
  categories: string[]
  activeCategory: string | null
  searchQuery: string | null
}> = ({ products, categories, activeCategory, searchQuery }) => {
  return (
    <Layout title="Products" description="Browse our full range of flours, grains, and more.">
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
          value={searchQuery || ''}
          placeholder="Search for atta, besan, sooji..."
          class="search-bar__input"
          aria-label="Search products"
        />
        {activeCategory && <input type="hidden" name="category" value={activeCategory} />}
      </form>

      <div class="category-bar">
        <a
          href={searchQuery ? `/products?q=${encodeURIComponent(searchQuery)}` : '/products'}
          class={`category-chip${!activeCategory ? ' is-active' : ''}`}
        >
          All
        </a>
        {categories.map((category) => {
          const params = new URLSearchParams()
          params.set('category', category)
          if (searchQuery) params.set('q', searchQuery)
          return (
            <a href={`/products?${params.toString()}`} class={`category-chip${activeCategory === category ? ' is-active' : ''}`}>
              {category}
            </a>
          )
        })}
      </div>

      <div class="section-heading">
        <h1 style="font-size: 1.3rem; margin: 0;">
          {searchQuery ? `Results for "${searchQuery}"` : activeCategory || 'All products'}
        </h1>
        <span class="text-muted" style="font-size: 0.85rem;">
          {products.length} item{products.length === 1 ? '' : 's'}
        </span>
      </div>

      {products.length > 0 ? (
        <div class="grid-cards grid-cards--dense">
          {products.map((product) => (
            <ProductCard product={product} />
          ))}
        </div>
      ) : (
        <div class="empty-state">
          <p>
            {searchQuery
              ? `No products match "${searchQuery}".`
              : activeCategory
                ? `No products in "${activeCategory}" right now.`
                : 'No products added yet. Check back soon.'}
          </p>
        </div>
      )}
    </Layout>
  )
}
