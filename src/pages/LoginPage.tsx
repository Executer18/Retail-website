/** @jsxImportSource hono/jsx */ 
// pages/LoginPage.tsx
//
// Route: GET /login
// Submits to Better Auth's built-in sign-in endpoint directly — no custom
// backend code needed for the auth logic itself, only this page.

import type { FC } from 'hono/jsx'
import { Layout } from '../components/Layout'
import { AuthCard } from '../components/AuthCard'

export const LoginPage: FC = () => {
  return (
    <Layout title="Log in" description="Log in to your Atta Chakki account.">
      <AuthCard heading="Log in" subtext="Welcome back.">
        <form
          data-auth-form
          data-auth-endpoint="/api/auth/sign-in/email"
          data-auth-success="/"
        >
          <div class="field">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required autocomplete="email" />
          </div>

          <div class="field">
            <label for="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              required
              autocomplete="current-password"
            />
          </div>

          <button
            type="submit"
            class="btn btn-primary"
            style="width: 100%;"
            data-default-text="Log in"
            data-loading-text="Logging in..."
          >
            Log in
          </button>
        </form>

        <p style="margin-top: var(--space-5); margin-bottom: 0; text-align: center; font-size: 0.9rem;">
          <a href="/forgot-password">Forgot your password?</a>
        </p>
        <p style="margin-top: var(--space-2); margin-bottom: 0; text-align: center; font-size: 0.9rem;">
          New here? <a href="/signup">Create an account</a>
        </p>
      </AuthCard>

      <script src="/auth.js"></script>
    </Layout>
  )
}