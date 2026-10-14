/** @jsxImportSource hono/jsx */
// src/pages/AccountPage.tsx
//
// Routes (see src/routes/account.tsx):
//   GET /account          — the account page
//   GET /login            — same page, Login popup open
//   GET /signup           — same page, Sign Up popup open
//   GET /forgot-password  — same page, Forgot Password popup open
//   GET /reset-password   — same page, Reset Password popup open (?token=...)
//
// The popups are centered, close with the ✕ button, the backdrop or Esc, and
// submit through public/auth.js (data-auth-* attributes), exactly like your old
// full-page forms did. `returnTo` is where login/signup send the user afterwards.

import type { FC, PropsWithChildren } from 'hono/jsx'
import { Layout } from '../components/Layout'
import { ACCOUNT_CSS, ACCOUNT_JS } from '../lib/account-ui'

export type AccountUser = {
  name: string
  email: string
  phone: string | null
}

export type AccountPopup = 'login' | 'signup' | 'forgot' | 'reset'

const Modal: FC<PropsWithChildren<{ name: string; emoji: string; title: string; sub: string }>> = ({
  name,
  emoji,
  title,
  sub,
  children,
}) => (
  <div class="ck-modal-back" id={`ck-modal-${name}`} data-modal={name}>
    <div class="ck-modal" role="dialog" aria-modal="true" aria-labelledby={`ck-title-${name}`} data-auth-card>
      <button type="button" class="ck-modal__close" data-close-modal aria-label="Close">
        &#10005;
      </button>
      <h3 id={`ck-title-${name}`}>
        <span aria-hidden="true">{emoji}</span> {title}
      </h3>
      <p class="ck-modal__sub">{sub}</p>
      <div class="ck-msg" data-auth-message role="alert"></div>
      {children}
    </div>
  </div>
)

const PasswordField: FC<{
  id: string
  name: string
  label: string
  autocomplete: string
  placeholder?: string
  minlength?: number
}> = ({ id, name, label, autocomplete, placeholder, minlength }) => (
  <div class="ck-field">
    <label for={id}>{label}</label>
    <div class="ck-pw">
      <input
        type="password"
        id={id}
        name={name}
        required
        autocomplete={autocomplete}
        placeholder={placeholder}
        minlength={minlength}
      />
      <button type="button" class="ck-eye" aria-pressed="false">
        Show
      </button>
    </div>
  </div>
)

export const AccountPage: FC<{
  user: AccountUser | null
  popup: AccountPopup | null
  returnTo: string
}> = ({ user, popup, returnTo }) => {
  const displayName = user?.name || 'Guest User'
  const initial = displayName.charAt(0).toUpperCase()
  const sub = user ? (user.phone ? `+91 ${user.phone}` : user.email) : 'Login to sync your orders'

  return (
    <Layout title="My Account" description="Your account, orders and profile.">
      <style dangerouslySetInnerHTML={{ __html: ACCOUNT_CSS }} />

      <div
        class="ck ck-account"
        id="ck-account"
        data-return-to={returnTo}
        data-initial-popup={popup ?? ''}
      >
        <h1 class="ck-sr">My Account</h1>

        <div class="ck-acct-head">
          <div class="ck-acct-avatar" id="ck-av-init">
            {initial}
          </div>
          <div class="ck-acct-head__txt">
            <b id="ck-av-name">{displayName}</b>
            <span id="ck-av-sub" data-email={user?.email ?? ''}>
              {sub}
            </span>
          </div>
          {user && (
            <button type="button" class="ck-acct-edit" data-open-modal="edit">
              Edit
            </button>
          )}
        </div>

        {!user && (
          <div class="ck-authbtns">
            <button type="button" class="login" data-open-modal="login">
              Login
            </button>
            <button type="button" class="signup" data-open-modal="signup">
              Sign Up
            </button>
          </div>
        )}

        <div class="ck-menu">
          <a class="ck-menu__item" href="/orders">
            <span class="em">📦</span> My Orders <span class="arr">&#8250;</span>
          </a>
          <button type="button" class="ck-menu__item" data-open-modal={user ? 'edit' : 'login'}>
            <span class="em">✏️</span> Edit Profile <span class="arr">&#8250;</span>
          </button>
          <a class="ck-menu__item" href="/contact">
            <span class="em">💬</span> Help &amp; Contact <span class="arr">&#8250;</span>
          </a>
          <button type="button" class="ck-menu__item" data-toast="Policy page coming soon">
            <span class="em">↩️</span> Return &amp; Exchange Policy <span class="arr">&#8250;</span>
          </button>
          {user && (
            <button type="button" class="ck-menu__item" data-logout>
              <span class="em">🚪</span> Logout <span class="arr">&#8250;</span>
            </button>
          )}
        </div>

        {/* ---------- Login ---------- */}
        <Modal name="login" emoji="👋" title="Welcome back" sub="Log in to manage your orders & pickups">
          <form data-auth-form data-auth-endpoint="/api/auth/sign-in/email" data-auth-success={returnTo}>
            <div class="ck-field">
              <label for="ck-login-email">Email</label>
              <input type="email" id="ck-login-email" name="email" required autocomplete="email" placeholder="you@example.com" />
            </div>
            <PasswordField
              id="ck-login-password"
              name="password"
              label="Password"
              autocomplete="current-password"
              placeholder="••••••••"
            />
            <button
              type="submit"
              class="ck-modal-go"
              data-default-text="Log in"
              data-loading-text="Logging in..."
            >
              Log in
            </button>
          </form>
          <p class="ck-auth-alt">
            Forgot your password?{' '}
            <button type="button" class="ck-link" data-open-modal="forgot">
              Reset it
            </button>
          </p>
          <p class="ck-auth-alt">
            New here?{' '}
            <button type="button" class="ck-link" data-open-modal="signup">
              Create an account
            </button>
          </p>
        </Modal>

        {/* ---------- Sign up ---------- */}
        <Modal name="signup" emoji="✨" title="Create account" sub="Faster checkout & order history">
          <form data-auth-form data-auth-endpoint="/api/auth/sign-up/email" data-auth-success={returnTo}>
            <div class="ck-field">
              <label for="ck-signup-name">Full name</label>
              <input type="text" id="ck-signup-name" name="name" required autocomplete="name" placeholder="Your name" />
            </div>
            <div class="ck-field">
              <label for="ck-signup-email">Email</label>
              <input type="email" id="ck-signup-email" name="email" required autocomplete="email" placeholder="you@example.com" />
            </div>
            <PasswordField
              id="ck-signup-password"
              name="password"
              label="Password"
              autocomplete="new-password"
              placeholder="Min 8 characters"
              minlength={8}
            />
            <button
              type="submit"
              class="ck-modal-go"
              data-default-text="Create account"
              data-loading-text="Creating account..."
            >
              Create account
            </button>
          </form>
          <p class="ck-auth-alt">
            Already have an account?{' '}
            <button type="button" class="ck-link" data-open-modal="login">
              Log in
            </button>
          </p>
        </Modal>

        {/* ---------- Forgot password ---------- */}
        <Modal name="forgot" emoji="🔑" title="Forgot your password?" sub="Enter your email and we'll send you a link to reset it.">
          <form
            data-auth-form
            data-auth-endpoint="/api/auth/request-password-reset"
            data-auth-success-message="If that email is registered, a reset link is on its way. Check your inbox."
          >
            <div class="ck-field">
              <label for="ck-forgot-email">Email</label>
              <input type="email" id="ck-forgot-email" name="email" required autocomplete="email" placeholder="you@example.com" />
            </div>
            {/* Where Better Auth sends the person after they click the emailed link */}
            <input type="hidden" name="redirectTo" value="/reset-password" />
            <button
              type="submit"
              class="ck-modal-go"
              data-default-text="Send reset link"
              data-loading-text="Sending..."
            >
              Send reset link
            </button>
          </form>
          <p class="ck-auth-alt">
            Remembered it?{' '}
            <button type="button" class="ck-link" data-open-modal="login">
              Back to login
            </button>
          </p>
        </Modal>

        {/* ---------- Reset password (opened from the emailed link) ---------- */}
        <Modal name="reset" emoji="🔒" title="Choose a new password" sub="Make it at least 8 characters.">
          <form id="ck-reset-form" data-auth-form data-auth-endpoint="/api/auth/reset-password" data-auth-success="/login">
            {/* Filled from the URL's ?token= by the page script */}
            <input type="hidden" id="ck-reset-token" name="token" />
            <PasswordField
              id="ck-reset-password"
              name="newPassword"
              label="New password"
              autocomplete="new-password"
              placeholder="Min 8 characters"
              minlength={8}
            />
            <button
              type="submit"
              class="ck-modal-go"
              data-default-text="Reset password"
              data-loading-text="Resetting..."
            >
              Reset password
            </button>
          </form>
          <p
            id="ck-reset-warning"
            class="ck-msg ck-msg--error"
            style="display:none;margin:0"
          >
            This reset link looks incomplete or expired.{' '}
            <button type="button" class="ck-link" data-open-modal="forgot">
              Request a new one
            </button>
          </p>
        </Modal>

        {/* ---------- Edit profile (logged-in users only) ---------- */}
        {user && (
          <div class="ck-modal-back" id="ck-modal-edit" data-modal="edit">
            <div class="ck-modal" role="dialog" aria-modal="true" aria-labelledby="ck-title-edit">
              <button type="button" class="ck-modal__close" data-close-modal aria-label="Close">
                &#10005;
              </button>
              <h3 id="ck-title-edit">
                <span aria-hidden="true">✏️</span> Edit Profile
              </h3>
              <p class="ck-modal__sub">This info is used for pickup orders</p>
              <div class="ck-msg" id="ck-edit-msg" role="alert"></div>
              <form id="ck-edit-form">
                <div class="ck-field">
                  <label for="ck-edit-name">Full name</label>
                  <input type="text" id="ck-edit-name" required autocomplete="name" placeholder="Your name" value={user.name} />
                </div>
                <div class="ck-field">
                  <label for="ck-edit-phone">Phone</label>
                  <input
                    type="tel"
                    id="ck-edit-phone"
                    inputmode="numeric"
                    maxlength={10}
                    autocomplete="tel-national"
                    placeholder="10-digit mobile"
                    value={user.phone ?? ''}
                  />
                </div>
                <button type="submit" class="ck-modal-go">
                  Save Profile
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      <script dangerouslySetInnerHTML={{ __html: ACCOUNT_JS }} />
      <script src="/auth.js"></script>
    </Layout>
  )
}