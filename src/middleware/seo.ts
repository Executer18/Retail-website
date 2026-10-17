// src/middleware/seo.ts
//
// Adds "X-Robots-Tag: noindex" to the pages that must never appear in search results
// (cart, checkout, account, orders, login pages, admin, search results). The rules live in
// robotsForRequest() in lib/seo.ts; Layout's <meta name="robots"> uses the same function.

import type { MiddlewareHandler } from 'hono'
import { robotsForRequest } from '../lib/seo'

export const seoHeaders: MiddlewareHandler = async (c, next) => {
  await next()
  const value = robotsForRequest(c.req.path, new URL(c.req.url).searchParams)
  if (value) c.header('X-Robots-Tag', value)
}