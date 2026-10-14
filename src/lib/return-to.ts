// src/lib/return-to.ts
//
// Works out which URL a user should land on after logging in or signing up.
//
// Uses getContext() from hono/context-storage, so it can read the current
// request from anywhere — it relies on the `app.use('*', contextStorage())`
// line that is already at the top of index.tsx.
//
// Order of preference:
//   1. ?redirect=/some/path   (e.g. checkout sends people to /login?redirect=/checkout)
//   2. the page they came from (Referer header), only when useReferer is true
//   3. /account
//
// Only same-site paths are ever returned — never "//evil.com", never a full URL —
// and never an auth screen (that would just reopen the popup after logging in).

import { getContext } from 'hono/context-storage'
import type { Env } from '../db'

const AUTH_PATHS = new Set(['/login', '/signup', '/forgot-password', '/reset-password'])

export function safePath(target: unknown): string | null {
  const t = String(target ?? '').trim()
  if (!t.startsWith('/') || t.startsWith('//') || t.startsWith('/\\')) return null
  const pathOnly = t.split('?')[0].split('#')[0]
  if (AUTH_PATHS.has(pathOnly)) return null
  return t
}

export function getReturnTo(opts: { useReferer?: boolean } = {}): string {
  const c = getContext<{ Bindings: Env }>()

  const fromQuery = safePath(c.req.query('redirect'))
  if (fromQuery) return fromQuery

  if (opts.useReferer) {
    const referer = c.req.header('referer')
    if (referer) {
      try {
        const from = new URL(referer)
        const here = new URL(c.req.url)
        if (from.host === here.host) {
          const p = safePath(from.pathname + from.search)
          if (p) return p
        }
      } catch {
        // malformed Referer — ignore it
      }
    }
  }

  return '/account'
}