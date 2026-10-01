/** @jsxImportSource hono/jsx */ 
// pages/ResetPasswordPage.tsx
//
// Route: GET /reset-password?token=...
// The link inside the password-reset email points here. Better Auth
// appends the token as a query parameter automatically — this page reads
// it with plain JS (no htmx needed for that part) and submits it alongside
// the new password to Better Auth's resetPassword endpoint.

import type { FC } from 'hono/jsx'
import { Layout } from '../components/Layout'
import { AuthCard } from '../components/AuthCard'

export const ResetPasswordPage: FC = () => {
  return (
    <Layout title="Reset password" description="Choose a new password for your Atta Chakki account.">
      <AuthCard heading="Choose a new password" subtext="Make it at least 8 characters.">
        <form
          data-auth-form
          data-auth-endpoint="/api/auth/reset-password"
          data-auth-success="/login"
        >
          {/* Filled in by the inline script below, from the URL's ?token= */}
          <input type="hidden" id="token" name="token" />

          <div class="field">
            <label for="newPassword">New password</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              required
              minlength={8}
              autocomplete="new-password"
            />
          </div>

          <button
            type="submit"
            class="btn btn-primary"
            style="width: 100%;"
            data-default-text="Reset password"
            data-loading-text="Resetting..."
          >
            Reset password
          </button>
        </form>

        <p id="token-missing-warning" style="display: none; margin-top: var(--space-4); color: var(--color-danger); font-size: 0.9rem;">
          This reset link looks incomplete or expired. Go back and{' '}
          <a href="/forgot-password">request a new one</a>.
        </p>
      </AuthCard>

      {/* Read the token out of the URL before auth.js's submit handler runs */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            const params = new URLSearchParams(window.location.search);
            const token = params.get('token');
            if (token) {
              document.getElementById('token').value = token;
            } else {
              document.querySelector('[data-auth-form]').style.display = 'none';
              document.getElementById('token-missing-warning').style.display = 'block';
            }
          `,
        }}
      ></script>
      <script src="/auth.js"></script>
    </Layout>
  )
}