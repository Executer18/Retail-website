/** @jsxImportSource hono/jsx */ 
// components/AuthCard.tsx
//
// A shared shell for every auth-related page (login, signup, forgot
// password, reset password). Keeps the narrow centered card, heading, and
// error/success banner consistent, so each individual page only needs to
// supply its own form.

import type { FC, PropsWithChildren } from 'hono/jsx'

type AuthCardProps = PropsWithChildren<{
  heading: string
  subtext?: string
}>

export const AuthCard: FC<AuthCardProps> = ({ heading, subtext, children }) => {
  return (
    <div style="max-width: 400px; margin: 0 auto;">
      <div class="card" style="padding: var(--space-6);">
        <h1 style="font-size: 1.5rem; margin-bottom: var(--space-2);">{heading}</h1>
        {subtext && <p class="text-muted" style="margin-bottom: var(--space-5);">{subtext}</p>}

        {/* Every auth form submits via fetch() and reports here — see the
           shared auth.js script referenced by each page below. */}
        <div id="auth-message" style="display: none; margin-bottom: var(--space-4);"></div>

        {children}
      </div>
    </div>
  )
}