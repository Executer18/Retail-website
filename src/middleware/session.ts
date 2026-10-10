 

import type { MiddlewareHandler } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'

const SESSION_COOKIE_NAME = 'session_id'
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 90 // 90 days

export const sessionMiddleware: MiddlewareHandler = async (c, next) => {
  let sessionId = getCookie(c, SESSION_COOKIE_NAME)

  if (!sessionId) {
    // crypto.randomUUID() is available natively in Workers and in Node 19+
    // (which tsx/node-server also run on) — no extra package needed.
    sessionId = crypto.randomUUID()

    setCookie(c, SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      sameSite: 'Lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
      // secure: true should be added once you're only serving over HTTPS
      // (i.e. in production/deployed). Leaving it off here so cookies still
      // work during local http:// testing with tsx watch.
    })
  }

  // c.set is Hono's per-request storage — every route handler and every
  // other middleware after this one can read it with c.get('sessionId').
  c.set('sessionId', sessionId)

  await next()
}
