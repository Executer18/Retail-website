// src/routes/seo.tsx
//
// GET /sitemap.xml  — built from the database on request, so new and edited products appear on
//                     their own. Cached for an hour (browsers and Cloudflare's edge).
// GET /robots.txt   — a route (not a static file) so the Sitemap line uses your real domain.
//
// Don't also put a robots.txt or sitemap.xml file in public/ — static files are served first
// and would hide these routes.

import { Hono } from 'hono'
import { asc } from 'drizzle-orm'
import { getDB } from '../db'
import type { Env } from '../db'
import { products } from '../db/schema'
import { siteUrl } from '../lib/seo'
import { buildSitemapXml } from '../lib/sitemap'

export const seoRoutes = new Hono<{ Bindings: Env }>()

seoRoutes.get('/sitemap.xml', async (c) => {
  const base = siteUrl(c.env, c.req.url)
  const db = getDB(c.env)

  const rows = await db
    .select({
      id: products.productId,
      name: products.itemName,
      category: products.category,
      updatedAt: products.updatedAt,
      createdAt: products.createdAt,
    })
    .from(products)
    .orderBy(asc(products.productId)) // the first row of each family is its original variant

  return c.body(buildSitemapXml(base, rows), 200, {
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'public, max-age=3600',
  })
})

seoRoutes.get('/robots.txt', (c) => {
  const base = siteUrl(c.env, c.req.url)

  // Cart, checkout, account, orders and login are NOT listed here: they carry a "noindex" header
  // instead (middleware/seo.ts), which Google can only read if it's allowed to open the page.
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /api/',
    'Disallow: /webhooks/',
    '',
    `Sitemap: ${base}/sitemap.xml`,
    '',
  ].join('\n')

  return c.text(body, 200, { 'Cache-Control': 'public, max-age=3600' })
})