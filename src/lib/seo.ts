// src/lib/seo.ts
//
// One place for everything SEO: site details, the absolute site URL, which pages must not be
// indexed, canonical URLs and the JSON-LD (structured data) builders.
//
// The shop name, address lines and map link come from STORE in checkout-ui.ts and the opening
// hours from pickup-slots.ts, so changing them there updates the whole site. The values in SITE
// below are PLACEHOLDERS (taken from your design) — replace them with your real details.

import { STORE } from './checkout-ui'
import { SHOP_CLOSE_HOUR, SHOP_OPEN_HOUR } from './pickup-slots'

export const SITE = {
  name: STORE.name,
  defaultDescription:
    'Freshly stone-ground atta, besan, millets and more — milled after you order and ready for store pickup.',
  locale: 'en_IN',
  /** Colour of the browser bar on phones. Keep it in step with theme_color in site.webmanifest. */
  themeColor: '#ffffff',
  /** Default share image (1200x630), a real file in public/. */
  ogImagePath: '/og-image.png',
  ogImageWidth: 1200,
  ogImageHeight: 630,
  /** Logo used in Organization structured data (any square PNG, at least 112px). */
  logoPath: '/web-app-manifest-512x512.png',

  // ---- placeholders: replace with your real details ----
  telephone: '+919876543210',
  email: 'hello@annapurnachakki.in',
  address: {
    streetAddress: 'Shop 12, Grain Market Road, Sector 4',
    addressLocality: 'Pune',
    addressRegion: 'Maharashtra',
    postalCode: '411019',
    addressCountry: 'IN',
  },
  /** Optional, e.g. { latitude: 18.5204, longitude: 73.8567 } */
  geo: null as null | { latitude: number; longitude: number },
  /** Your social profile URLs, e.g. ['https://www.instagram.com/yourshop']. */
  sameAs: [] as string[],

  /** Extra public pages for the sitemap — add '/privacy', '/terms', ... once those pages exist. */
  extraSitemapPages: [] as string[],
}

// ---------------------------------------------------------------- URLs

/**
 * The public address of the site, no trailing slash. SITE_URL (a wrangler var) wins; then
 * BETTER_AUTH_URL; then whatever host this request came in on.
 */
export function siteUrl(
  env: { SITE_URL?: string; BETTER_AUTH_URL?: string } | undefined,
  requestUrl: string
): string {
  const configured = env?.SITE_URL || env?.BETTER_AUTH_URL
  let base = configured
  if (!base) {
    try {
      base = new URL(requestUrl).origin
    } catch {
      base = 'http://localhost'
    }
  }
  return base.replace(/\/+$/, '')
}

export function absoluteUrl(base: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  return base + (path.startsWith('/') ? path : `/${path}`)
}

// ---------------------------------------------------------------- what search engines may index

// Pages that must never show up in search results. They are NOT blocked in robots.txt on purpose:
// Google can only obey "noindex" on a page it is allowed to open.
const PRIVATE_PREFIXES = [
  '/cart',
  '/checkout',
  '/account',
  '/orders',
  '/order-confirmed',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/admin',
]

/** Value for <meta name="robots"> / the X-Robots-Tag header, or null for a normal indexable page. */
export function robotsForRequest(path: string, search: URLSearchParams): string | null {
  if (PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return 'noindex, nofollow'
  // Search results and free-text filters: thin, endless variations — keep out of the index, but follow the links.
  if (path === '/search') return 'noindex, follow'
  if (path === '/products' && search.get('q')) return 'noindex, follow'
  return null
}

/** The canonical path for the page being viewed: query strings are dropped except /products?category=. */
export function canonicalPathFor(path: string, search: URLSearchParams): string {
  const clean = path.length > 1 ? path.replace(/\/+$/, '') || '/' : path
  if (clean === '/products') {
    const category = search.get('category')
    if (category) return `/products?category=${encodeURIComponent(category)}`
  }
  return clean
}

/** Meta descriptions read best at ~160 characters. */
export function trimDescription(text: string | null | undefined, max = 160): string {
  const flat = (text ?? '').replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  const cut = flat.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,.;:\s]+$/, '') + '…'
}

// ---------------------------------------------------------------- JSON-LD

/** JSON for a <script type="application/ld+json"> tag. "<" is escaped so data can't close the tag. */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

const pad = (n: number) => String(n).padStart(2, '0')

// Organization + WebSite + the physical shop. Shown on the home and contact pages.
export function siteJsonLd(base: string) {
  const orgId = `${base}/#organization`
  const logo = absoluteUrl(base, SITE.logoPath)

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': orgId,
        name: SITE.name,
        url: `${base}/`,
        logo,
        sameAs: SITE.sameAs.length > 0 ? SITE.sameAs : undefined,
      },
      {
        '@type': 'WebSite',
        '@id': `${base}/#website`,
        url: `${base}/`,
        name: SITE.name,
        inLanguage: 'en-IN',
        publisher: { '@id': orgId },
      },
      {
        '@type': 'GroceryStore',
        '@id': `${base}/#store`,
        name: SITE.name,
        url: `${base}/`,
        image: absoluteUrl(base, SITE.ogImagePath),
        logo,
        telephone: SITE.telephone,
        email: SITE.email,
        address: { '@type': 'PostalAddress', ...SITE.address },
        geo: SITE.geo ? { '@type': 'GeoCoordinates', ...SITE.geo } : undefined,
        hasMap: STORE.mapsUrl,
        parentOrganization: { '@id': orgId },
        openingHoursSpecification: [
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            opens: `${pad(SHOP_OPEN_HOUR)}:00`,
            closes: `${pad(SHOP_CLOSE_HOUR)}:00`,
          },
        ],
      },
    ],
  }
}

export function breadcrumbJsonLd(base: string, crumbs: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(base, crumb.path),
    })),
  }
}

export type SeoProductVariant = {
  id: number
  sizeLabel: string // "500 g", "1 kg" ...
  price: number // the pack price shown on the page
  inStock: boolean
}

// One pack size -> a plain Product. Several pack sizes -> a ProductGroup with one variant per size
// (all sizes are visible on the page, so the markup matches what the shopper sees).
export function productJsonLd(
  base: string,
  p: {
    canonicalPath: string
    canonicalId: number
    name: string
    category: string
    description: string
    images: string[]
    variants: SeoProductVariant[]
  }
) {
  const url = absoluteUrl(base, p.canonicalPath)
  const images = p.images.map((src) => absoluteUrl(base, src))
  const brand = { '@type': 'Brand', name: SITE.name }

  const offer = (v: SeoProductVariant) => ({
    '@type': 'Offer',
    url,
    price: v.price.toFixed(2),
    priceCurrency: 'INR',
    availability: v.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    itemCondition: 'https://schema.org/NewCondition',
  })

  if (p.variants.length <= 1) {
    const v = p.variants[0]
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      '@id': `${url}#product`,
      name: p.name,
      description: p.description,
      image: images.length > 0 ? images : undefined,
      sku: v ? String(v.id) : String(p.canonicalId),
      category: p.category,
      brand,
      url,
      offers: v ? offer(v) : undefined,
    }
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'ProductGroup',
    '@id': `${url}#product`,
    name: p.name,
    description: p.description,
    image: images.length > 0 ? images : undefined,
    category: p.category,
    brand,
    url,
    productGroupID: String(p.canonicalId),
    variesBy: 'https://schema.org/size',
    hasVariant: p.variants.map((v) => ({
      '@type': 'Product',
      name: `${p.name} ${v.sizeLabel}`,
      sku: String(v.id),
      size: v.sizeLabel,
      image: images.length > 0 ? images : undefined,
      url,
      offers: offer(v),
    })),
  }
}