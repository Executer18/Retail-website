// src/pages/SearchPage.tsx
//
// Route: GET /search
//
// Matches the mockup's search.html: a sticky category sidebar + results
// grid, instead of products.html's top filter-chip bar. Typing in
// Layout's header search box (header="live-search") or tapping a
// sidebar category both hx-get this same route and swap #search-results
// — no separate client-side filtering logic, no separate card markup:
// it's the exact same groupBySizeVariants/sortOutOfStockLast/
// getCartQuantities pipeline and the exact same ProductCard every other
// page uses, just a different arrangement of chrome around them.
//
// Two exports, same split as ProductDetailPage:
//   - SearchResults: the #search-results fragment (result count + grid),
//     what every htmx request swaps in
//   - SearchPage: SearchResults wrapped in Layout + the sidebar, for the
//     first full-page load
//
// See the note at the bottom of this file for the index.tsx route.

import type { FC } from 'hono/jsx'
import { Layout } from '../components/Layout'
import { ProductCard, type ProductCardData } from '../components/ProductCard'
import { categoryIcon } from '../lib/category-icons'

export type SearchProps = {
  products: ProductCardData[]
  categories: string[]
  /** 'all' or one of `categories` — never null, unlike ProductsListPage's activeCategory, since the sidebar always has something selected. */
  activeCategory: string
  searchQuery: string
  cartQuantities: Record<number, number>
}

export const SearchResults: FC<SearchProps> = ({ products, searchQuery, cartQuantities }) => {
  return (
    <div id="search-results">
      <p class="result-note">
        <b>{products.length}</b> product{products.length !== 1 ? 's' : ''}
        {searchQuery ? (
          <>
            {' '}
            for "<b>{searchQuery}</b>"
          </>
        ) : null}
      </p>
      {products.length > 0 ? (
        <div class="prodgrid">
          {products.map((product) => (
            <ProductCard product={product} cartQuantities={cartQuantities} />
          ))}
        </div>
      ) : (
        <div class="empty" style="grid-column:1/-1">
          <div class="em">🔍</div>
          <b>No matches</b>
        </div>
      )}
    </div>
  )
}

export const SearchPage: FC<SearchProps> = (props) => {
  const { categories, activeCategory } = props

  // Every category button shares the same hx-* wiring: refetch /search
  // with whatever's currently typed (#search-input) plus whichever
  // category this button represents (set into the hidden field just
  // before the request fires). Built once here instead of repeating the
  // six attributes per button.
  const categoryBtnAttrs = {
    'hx-get': '/search',
    'hx-include': '#search-input,#search-active-category',
    'hx-target': '#search-results',
    'hx-swap': 'outerHTML',
    'hx-push-url': 'true',
  } as const

  const selectCategory = (id: string) =>
    `document.getElementById('search-active-category').value='${id}';` +
    `document.querySelectorAll('.side-cat').forEach(b=>b.classList.remove('on'));` +
    `this.classList.add('on')`

  return (
    <Layout
      title="Search"
      description="Search our full range of flours, grains, and more."
      active="search"
      header="live-search"
      searchValue={props.searchQuery}
    >
      <div class="search-layout">
        <aside class="search-side" id="sideCats">
          <input type="hidden" id="search-active-category" name="category" value={activeCategory} />

          <button
            type="button"
            class={`side-cat${activeCategory === 'all' ? ' on' : ''}`}
            {...categoryBtnAttrs}
            onclick={selectCategory('all')}
          >
            <span class="em">✨</span>All
          </button>

          {categories.map((cat) => (
            <button type="button" class={`side-cat${activeCategory === cat ? ' on' : ''}`} {...categoryBtnAttrs} onclick={selectCategory(cat)}>
              <span class="em">{categoryIcon(cat)}</span>
              {cat}
            </button>
          ))}
        </aside>

        <main class="search-main">
          <SearchResults {...props} />
        </main>
      </div>
    </Layout>
  )
}

