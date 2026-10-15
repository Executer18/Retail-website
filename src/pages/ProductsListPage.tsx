// src/pages/ProductsListPage.tsx
//
// Route: GET /products
// Route: GET /products?category=Atta
// Route: GET /products?q=besan
// Route: GET /products?category=Atta&q=besan
//
// Rebuilt to match the mockup's products.html: a horizontal filter chip
// bar (styles.css's .filterbar/.fchip — not the old .category-bar/
// .category-chip), the same result-note copy, and the real prodgrid with
// a "clear filter" button when a filter is active. Search bar markup is
// unchanged (was already real, just restyled to match).
//
// Cards now come pre-grouped into size families and pre-sorted
// out-of-stock-last — see the index.tsx note at the bottom of this file.
// cartQuantities is the same productId -> quantityKg map HomePage uses,
// so a card here shows the exact same ADD/stepper state as everywhere
// else, no separate logic.

import type { FC } from 'hono/jsx'
import { Layout } from '../components/Layout'
import { ProductCard, type ProductCardData } from '../components/ProductCard'
import { categoryIcon } from '../lib/category-icons'

export const ProductsListPage: FC<{
  products: ProductCardData[]
  categories: string[]
  activeCategory: string | null
  searchQuery: string | null
  cartQuantities: Record<number, number>
}> = ({ products, categories, activeCategory, searchQuery, cartQuantities }) => {
  const isFiltered = Boolean(activeCategory || searchQuery)

  return (
    <Layout title="Products" description="Browse our full range of flours, grains, and more." active="product" header="search">
      <div class="filterbar">
        <a
          href={searchQuery ? `/products?q=${encodeURIComponent(searchQuery)}` : '/products'}
          class={`fchip${!activeCategory ? ' on' : ''}`}
        >
          ✨ All
        </a>
        {categories.map((category) => {
          const params = new URLSearchParams()
          params.set('category', category)
          if (searchQuery) params.set('q', searchQuery)
          return (
            <a href={`/products?${params.toString()}`} class={`fchip${activeCategory === category ? ' on' : ''}`}>
              {categoryIcon(category)} {category}
            </a>
          )
        })}
      </div>

      <p class="result-note">
        {searchQuery ? (
          <>
            Showing <b>{products.length}</b> result{products.length !== 1 ? 's' : ''}
            {activeCategory ? (
              <>
                {' '}
                in <b>{activeCategory}</b>
              </>
            ) : null}{' '}
            for "<b>{searchQuery}</b>"
          </>
        ) : activeCategory ? (
          <>
            Showing <b>{products.length}</b> result{products.length !== 1 ? 's' : ''} in <b>{activeCategory}</b>
          </>
        ) : (
          <>
            Showing all <b>{products.length}</b> products — stone-ground fresh
          </>
        )}
      </p>

      {products.length > 0 ? (
        <div class="prodgrid">
          {products.map((product) => (
            <ProductCard product={product} cartQuantities={cartQuantities} />
          ))}
          {isFiltered && (
            <div class="clear-wrap">
              <a href="/products" class="clear-big">
                ✕ Clear filter · Show all products
              </a>
            </div>
          )}
        </div>
      ) : (
        <>
          <div class="empty">
            <div class="em">🔍</div>
            <b>No matches found</b>
            <p style="font-size:12px;margin-top:4px">Try a different search or clear the filter.</p>
          </div>
          <div class="clear-wrap">
            <a href="/products" class="clear-big">
              ✕ Clear filter
            </a>
          </div>
        </>
      )}
    </Layout>
  )
}