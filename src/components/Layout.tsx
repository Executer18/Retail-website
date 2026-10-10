// src/components/Layout.tsx
//
// UPDATED per the gap your changelog identified: the nav had no
// #cart-count element at all, so every hx-target="#cart-count" swap
// (from cart.tsx's add-to-cart route, and ProductDetailPage.tsx) was
// silently finding nothing and doing nothing — no error anywhere, it
// just never updated.
//
// Fix: a Cart link with <span id="cart-count"> inside it, which self-
// loads its value on every page via hx-get="/api/cart/count" with
// hx-trigger="load". That route is added to cart.tsx below. This means
// the count is always correct on page load (reflecting whatever's
// really in that session's cart), not just after an add-to-cart click
// during the current page view.

import type { FC, PropsWithChildren } from 'hono/jsx'

type LayoutProps = PropsWithChildren<{
  title: string
  description?: string
}>

export const Layout: FC<LayoutProps> = ({ title, description, children }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title} · Atta Chakki</title>
        {description && <meta name="description" content={description} />}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/styles.css" />
        <script src="https://unpkg.com/htmx.org@1.9.12"></script>
      </head>
      <body>
        <header class="site-header">
          <a href="/" class="site-header__logo">
            Atta Chakki
          </a>
          <nav class="site-header__nav">
            <a href="/products">Products</a>
            <a href="/cart" class="site-header__cart-link">
              Cart
              <span id="cart-count" hx-get="/api/cart/count" hx-trigger="load" hx-swap="innerHTML">
                0
              </span>
            </a>
            <a href="/contact">Contact</a>
            <a href="/login">Log in</a>
          </nav>
        </header>

        <main class="container">{children}</main>

        {/* Out-of-band target for the stock-clamp warning your changelog
            flagged for ProductDetailPage.tsx — see note in that file.
            No inline style here: cart.tsx's response always replaces
            this whole element via hx-swap-oob, including its class
            (.cart-add-feedback or .cart-add-feedback--visible from
            styles-phase6-additions.css), so the hidden-by-default state
            lives in that CSS class, not here. */}
        <span id="cart-add-feedback" class="cart-add-feedback"></span>

        <footer class="site-footer">
          <p>Fresh flour, ground daily. Pickup only — no delivery.</p>
          <nav>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/refund-policy">Refund policy</a>
          </nav>
        </footer>
      </body>
    </html>
  )
}
