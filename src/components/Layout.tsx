/** @jsxImportSource hono/jsx */ 
//
// The one shared page shell. Every page — public, auth, admin — calls this
// instead of writing its own <html>/<head>/<body>. Change the header/footer
// or add a new global <meta> tag here, once, and every page picks it up.

import type { FC, PropsWithChildren } from 'hono/jsx'

type LayoutProps = PropsWithChildren<{
  title: string
  description?: string
}>

export const Layout: FC<LayoutProps> = ({
  title,
  description = 'Fresh atta, besan, and sooji, ground daily. Order online for pickup.',
  children,
}) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title} · Atta Chakki</title>
        <meta name="description" content={description} />

        {/* Font: preconnect first so the actual font request starts sooner */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />

        {/* Design system — the one stylesheet every page shares */}
        <link rel="stylesheet" href="/styles.css" />

        {/* htmx — loaded once, here, so any page can use hx-* attributes */}
        <script src="https://unpkg.com/htmx.org@1.9.12" defer></script>
      </head>
      <body>
        <header class="site-header">
          <a href="/" class="logo">
            Atta Chakki
          </a>
          <nav>
            <a href="/products">Products</a>
            <a href="/contact">Contact</a>
            <a href="/login">Log in</a>
          </nav>
        </header>

        <main class="container" style="padding-top: var(--space-7); padding-bottom: var(--space-8);">
          {children}
        </main>

        <footer class="site-footer">
          <div class="container">
            <p style="margin-bottom: var(--space-2);">Atta Chakki &middot; Fresh flour, ground daily.</p>
            <p style="margin: 0;">
              <a href="/privacy-policy">Privacy Policy</a>
              {' · '}
              <a href="/terms">Terms &amp; Conditions</a>
              {' · '}
              <a href="/refund-policy">Refund Policy</a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  )
}