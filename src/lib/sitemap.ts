// src/lib/sitemap.ts
//
// Builds the sitemap XML from the product rows — no database or framework in here, so it's
// easy to test. The /sitemap.xml route (routes/seo.tsx) feeds it the rows.
//
// What goes in:
//   - the public static pages (home, products, contact, + SITE.extraSitemapPages)
//   - one page per category:  /products?category=...
//   - ONE page per product family (rows sharing an itemName = pack sizes of one product):
//     the original variant, i.e. the lowest productId — the same URL its canonical tag names.
// <lastmod> comes from the product's updatedAt (newest edit in the family / category).
// <priority> and <changefreq> are left out on purpose: Google ignores them.
// One sitemap file may hold 50,000 URLs / 50 MB; if the catalogue ever gets near that, split it
// into a sitemap index.

import { SITE, absoluteUrl } from './seo'

export type SitemapProduct = {
  id: number
  name: string
  category: string
  updatedAt: string | null
  createdAt: string | null
}

const xmlEscape = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

// The database holds "YYYY-MM-DD HH:MM:SS" (UTC, CURRENT_TIMESTAMP) for new rows and a full
// ISO string for rows edited in the admin. Both become a proper ISO date; junk becomes null.
export function toIsoDate(value: string | null | undefined): string | null {
  if (!value) return null
  let s = value.trim().replace(' ', 'T')
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s += 'T00:00:00Z'
  else if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(s)) s += 'Z'
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

type Entry = { path: string; lastmod: string | null }

export function buildSitemapXml(base: string, products: SitemapProduct[]): string {
  // `products` must be ordered by id ascending: the first row of a family is its original variant.
  const families = new Map<string, { id: number; lastmod: string | null }>()
  const categories = new Map<string, string | null>()

  for (const p of products) {
    const mod = toIsoDate(p.updatedAt) ?? toIsoDate(p.createdAt)

    const family = families.get(p.name)
    if (!family) families.set(p.name, { id: p.id, lastmod: mod })
    else if (mod && (!family.lastmod || mod > family.lastmod)) family.lastmod = mod

    const current = categories.get(p.category)
    if (current === undefined || (mod && (!current || mod > current))) categories.set(p.category, mod ?? current ?? null)
  }

  const entries: Entry[] = [
    { path: '/', lastmod: null },
    { path: '/products', lastmod: null },
    { path: '/contact', lastmod: null },
    ...SITE.extraSitemapPages.map((path) => ({ path, lastmod: null })),
    ...Array.from(categories, ([category, lastmod]) => ({
      path: `/products?category=${encodeURIComponent(category)}`,
      lastmod,
    })),
    ...Array.from(families.values(), (f) => ({ path: `/products/${f.id}`, lastmod: f.lastmod })),
  ]

  const urls = entries
    .map((e) => {
      const loc = xmlEscape(absoluteUrl(base, e.path))
      return `  <url><loc>${loc}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}</url>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}