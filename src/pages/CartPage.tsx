// src/pages/CartPage.tsx
//
// Route: GET /cart
//
// Thin wrapper: Layout + heading + the CartContents fragment. Kept
// separate from CartContents.tsx so the update/remove routes can return
// JUST the fragment (faster, smaller htmx swap) while this file handles
// the full-page version for a direct page load. The cart-modal popup in
// Layout.tsx uses the same CartContents fragment via GET /api/cart/contents
// — this page and the popup are two doors into the same markup.

import type { FC } from 'hono/jsx'
import { Layout } from '../components/Layout'
import { CartContents, type CartContentsProps } from './fragments/CartContents'

export const CartPage: FC<CartContentsProps> = ({ items, total, totalMrp, totalSavings }) => {
  return (
    <Layout title="Your cart" description="Review your order before checkout." header="Your Cart">
      <h1 style="margin-bottom: var(--space-5);">Your cart</h1>
      <CartContents items={items} total={total} totalMrp={totalMrp} totalSavings={totalSavings} />
    </Layout>
  )
} 