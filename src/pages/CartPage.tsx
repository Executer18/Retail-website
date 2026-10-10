// src/pages/CartPage.tsx
//
// Route: GET /cart
//
// Thin wrapper: Layout + heading + the CartContents fragment. Kept
// separate from CartContents.tsx so the update/remove routes can return
// JUST the fragment (faster, smaller htmx swap) while this file handles
// the full-page version for a direct page load.

import type { FC } from 'hono/jsx'
import { Layout } from '../components/Layout'
import { CartContents, type CartRow } from './fragments/CartContents'

export const CartPage: FC<{ items: CartRow[]; total: number }> = ({ items, total }) => {
  return (
    <Layout title="Your cart" description="Review your order before checkout.">
      <h1 style="margin-bottom: var(--space-5);">Your cart</h1>
      <CartContents items={items} total={total} />
    </Layout>
  )
}
