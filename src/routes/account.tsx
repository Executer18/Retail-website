import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { getDB } from '../db'
import { customers } from '../db/schema'
import type { Env, Variables } from '../db'
import { createAuth } from '../auth'
import { AccountPage, type AccountPopup, type AccountUser } from '../pages/AccountPage'
import { getReturnTo } from '../lib/return-to'
import { json, redirect } from 'react-router-dom';

export const accountRoutes = new Hono<{ Bindings: Env; Variables: Variables }>()

async function getSession(c: any) {
  return createAuth(c.env).api.getSession({ headers: c.req.raw.headers })
}

// Logged-in user for the account page, or null for a guest. The name/phone come
// from the customers row when there is one (that's what Edit Profile updates).
async function getAccountUser(c: any): Promise<AccountUser | null> {
  const session = await getSession(c)
  if (!session?.user) return null

  const db = getDB(c.env)
  const [customer] = await db.select().from(customers).where(eq(customers.authUserId, session.user.id))

  return {
    name: customer?.fullName || session.user.name || '',
    email: session.user.email,
    phone: customer?.phoneNumber ?? null,
  }
}

accountRoutes.get('/account', async (c) => {
  const user = await getAccountUser(c)
  // On the account page itself, logging in just comes back here — unless a
  // ?redirect= was given.
  return c.html(<AccountPage user={user} popup={null} returnTo={getReturnTo()} />)
})

// The four auth URLs all show the account page with the matching popup open.
const POPUP_ROUTES: [string, AccountPopup][] = [
  ['/login', 'login'],
  ['/signup', 'signup'],
  ['/forgot-password', 'forgot'],
  ['/reset-password', 'reset'],
]

for (const [path, popup] of POPUP_ROUTES) {
  accountRoutes.get(path, async (c) => {
    const user = await getAccountUser(c)
    // Come back to ?redirect=..., or else the page they clicked "Login" from.
    const returnTo = getReturnTo({ useReferer: true })

    // Already logged in and opening login/signup: nothing to do, send them on.
    if (user && (popup === 'login' || popup === 'signup')) {
      return c.redirect(returnTo)
    }

    return c.html(<AccountPage user={user} popup={popup} returnTo={returnTo} />)
  })
}

accountRoutes.post('/account/profile', async (c) => {
  // Same-site requests only (cheap CSRF guard for a cookie-authenticated POST).
  const origin = c.req.header('origin')
  if (origin) {
    try {
      if (new URL(origin).host !== new URL(c.req.url).host) {
        return c.json({ message: 'Request blocked.' }, 403)
      }
    } catch {
      return c.json({ message: 'Request blocked.' }, 403)
    }
  }

  const session = await getSession(c)
  if (!session?.user) {
    return c.json({ message: 'Please log in again.' }, 401)
  }

  let body: any
  try {
    body = await c.req.json()
  } catch {
    return c.json({ message: 'Invalid request.' }, 400)
  }

  const name = String(body?.name ?? '').trim()
  const phone = String(body?.phone ?? '').trim()

  if (name.length < 2 || name.length > 80) {
    return c.json({ message: 'Please enter your name.' }, 400)
  }
  if (phone && !/^[0-9]{10}$/.test(phone)) {
    return c.json({ message: 'Enter a valid 10-digit phone number.' }, 400)
  }

  const db = getDB(c.env)
  const [existing] = await db.select().from(customers).where(eq(customers.authUserId, session.user.id))

  if (existing) {
    await db
      .update(customers)
      .set({ fullName: name, phoneNumber: phone || null })
      .where(eq(customers.customerId, existing.customerId))
  } else {
    // Same find-or-create idea as checkout: the row is created the first time it's needed.
    await db.insert(customers).values({
      authUserId: session.user.id,
      fullName: name,
      phoneNumber: phone || null,
    })
  }

  return c.json({ ok: true, name, phone: phone || null })
})