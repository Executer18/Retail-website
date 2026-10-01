/** @jsxImportSource hono/jsx */ 

// pages/ForgotPasswordPage.tsx
//
// Route: GET /forgot-password
// Calls Better Auth's requestPasswordReset endpoint. Better Auth always
// responds success-shaped here even if the email doesn't exist — that's
// intentional on their end (stops someone from using this form to check
// which emails are registered), so the confirmation message below is
// deliberately generic ("if that email exists...") rather than claiming
// the email was actually sent.
//
// IMPORTANT — depends on Phase 9: the actual email only goes out once your
// auth.ts config has a real sendResetPassword function wired to Resend.
// Until then, this page and the request will work, but no email arrives.
// See the note at the bottom of this file for the exact config shape.

import type { FC } from 'hono/jsx'
import { Layout } from '../components/Layout'
import { AuthCard } from '../components/AuthCard'

export const ForgotPasswordPage: FC = () => {
  return (
    <Layout title="Forgot password" description="Reset your Atta Chakki account password.">
      <AuthCard
        heading="Forgot your password?"
        subtext="Enter your email and we'll send you a link to reset it."
      >
        <form
          data-auth-form
          data-auth-endpoint="/api/auth/request-password-reset"
          data-auth-success-message="If that email is registered, a reset link is on its way. Check your inbox."
        >
          <div class="field">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required autocomplete="email" />
          </div>

          {/* Better Auth needs to know where to send the person once they
             click the emailed link — this becomes part of the reset URL. */}
          <input type="hidden" name="redirectTo" value="/reset-password" />

          <button
            type="submit"
            class="btn btn-primary"
            style="width: 100%;"
            data-default-text="Send reset link"
            data-loading-text="Sending..."
          >
            Send reset link
          </button>
        </form>

        <p style="margin-top: var(--space-5); margin-bottom: 0; text-align: center; font-size: 0.9rem;">
          <a href="/login">Back to log in</a>
        </p>
      </AuthCard>

      <script src="/auth.js"></script>
    </Layout>
  )
}

/*
Phase 9 dependency — the auth.ts config this page relies on:

import { betterAuth } from 'better-auth'

export const auth = betterAuth({
  // ...your existing config
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url, token }) => {
      // Call Resend here once Phase 9 is built, e.g.:
      // await resend.emails.send({
      //   from: 'Atta Chakki <no-reply@yourdomain.com>',
      //   to: user.email,
      //   subject: 'Reset your password',
      //   html: `Click here to reset your password: <a href="${url}">${url}</a>`,
      // })
    },
  },
})

Until sendResetPassword actually calls Resend, this form will still return a
success response (Better Auth's endpoint behaves the same either way), but
no email is delivered — so testing this end-to-end only becomes possible
after Phase 9.
*/