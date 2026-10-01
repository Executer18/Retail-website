/** @jsxImportSource hono/jsx */ 
// pages/SignupPage.tsx
//
// Route: GET /signup
// Submits to Better Auth's built-in sign-up endpoint. "name" is required by
// Better Auth's default user schema — this is the display name, not the
// login credential.

import type { FC } from 'hono/jsx'
import { Layout } from '../components/Layout'
import { AuthCard } from '../components/AuthCard'

export const SignupPage: FC = () => {
  return (
    <Layout title="Sign up" description="Create your Atta Chakki account.">
      <AuthCard heading="Create an account" subtext="Order online, track pickups, and more.">
        <form
          data-auth-form
          data-auth-endpoint="/api/auth/sign-up/email"
          data-auth-success="/"
        >
          <div class="field">
            <label for="name">Full name</label>
            <input type="text" id="name" name="name" required autocomplete="name" />
          </div>

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
              minlength={8}
              autocomplete="new-password"
            />
          </div>

          <button
            type="submit"
            class="btn btn-primary"
            style="width: 100%;"
            data-default-text="Create account"
            data-loading-text="Creating account..."
          >
            Create account
          </button>
        </form>

        <p style="margin-top: var(--space-5); margin-bottom: 0; text-align: center; font-size: 0.9rem;">
          Already have an account? <a href="/login">Log in</a>
        </p>
      </AuthCard>

      <script src="/auth.js"></script>
    </Layout>
  )
}