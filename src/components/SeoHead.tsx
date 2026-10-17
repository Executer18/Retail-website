/** @jsxImportSource hono/jsx */
// src/components/SeoHead.tsx
//
// Everything SEO-related that goes inside <head>, in one component so Layout.tsx only needs a
// single line. It reads the current request itself (getContext, same as Layout does), so every
// page gets a correct canonical URL, robots rule and share tags with no changes to the page.
// A page only passes props to override the defaults — today that's the product detail page.

import type { FC } from 'hono/jsx'
import { raw } from 'hono/html'
import { getContext } from 'hono/context-storage'
import {
  SITE,
  absoluteUrl,
  canonicalPathFor,
  jsonLdString,
  robotsForRequest,
  siteJsonLd,
  siteUrl,
  trimDescription,
} from '../lib/seo'

export type SeoHeadProps = {
  /** Page title (the shop name is added after it). */
  title: string
  description?: string
  /** Canonical path (or URL) if it isn't simply this page's own path. */
  canonical?: string
  /** Share image path or URL; defaults to SITE.ogImagePath. */
  image?: string
  ogType?: 'website' | 'product'
  /** Force noindex even if the path isn't on the private list. */
  noindex?: boolean
  /** Extra structured data for this page (one object or an array). */
  jsonLd?: object | object[]
}

export const SeoHead: FC<SeoHeadProps> = ({ title, description, canonical, image, ogType = 'website', noindex, jsonLd }) => {
  const c: any = getContext()
  const requestUrl: string = c?.req?.url ?? 'http://localhost/'
  let url: URL
  try {
    url = new URL(requestUrl)
  } catch {
    url = new URL('http://localhost/')
  }

  const base = siteUrl(c?.env, requestUrl)
  const robots = noindex ? 'noindex, nofollow' : robotsForRequest(url.pathname, url.searchParams)
  const canonicalPath = canonical ?? canonicalPathFor(url.pathname, url.searchParams)
  const canonicalUrl = absoluteUrl(base, canonicalPath)
  const fullTitle = `${title} · ${SITE.name}`
  const desc = trimDescription(description || SITE.defaultDescription)
  const shareImage = absoluteUrl(base, image || SITE.ogImagePath)

  // Organization + WebSite + the shop itself: only on the pages that describe the business.
  const showSiteData = !robots && (canonicalPath === '/' || canonicalPath === '/contact')
  const blocks: object[] = [
    ...(showSiteData ? [siteJsonLd(base)] : []),
    ...(Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : []),
  ]

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {robots ? <meta name="robots" content={robots} /> : <link rel="canonical" href={canonicalUrl} />}
      <meta name="theme-color" content={SITE.themeColor} />

      {/* Open Graph (Facebook, WhatsApp, LinkedIn, ...) */}
      <meta property="og:site_name" content={SITE.name} />
      <meta property="og:locale" content={SITE.locale} />
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={shareImage} />
      {!image && <meta property="og:image:width" content={String(SITE.ogImageWidth)} />}
      {!image && <meta property="og:image:height" content={String(SITE.ogImageHeight)} />}
      <meta property="og:image:alt" content={title} />

      {/* Twitter / X */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={shareImage} />

      {/* Structured data */}
      {blocks.map((block) => (
        <script type="application/ld+json">{raw(jsonLdString(block))}</script>
      ))}
    </>
  )
}