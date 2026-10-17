// src/lib/product-seo.ts
//
// SEO data for one product page (/products/:id).
//
// Size variants are separate product rows that share an itemName (see product-variants.ts), so
// /products/12 (1 kg) and /products/13 (5 kg) show almost the same page. To keep them from
// competing, every page in the family names ONE canonical URL: the original variant, i.e. the
// row with the lowest productId. (Not "the first in-stock size" — that changes with stock, and
// a canonical URL has to stay put.) The sitemap lists only that canonical page too.

import { breadcrumbJsonLd, productJsonLd, trimDescription } from './seo'
import { formatSize, packPrice } from './format'

export type ProductSeo = {
  /** Path of the canonical page for this product family, e.g. "/products/12". */
  canonical: string
  /** First product image (a path or URL — Layout makes it absolute). */
  image?: string
  /** Product + BreadcrumbList structured data, ready for <script type="application/ld+json">. */
  jsonLd: object[]
}

export function buildProductSeo(input: {
  base: string
  name: string
  category: string
  description: string | null | undefined
  images: string[]
  /** productId of every row in this family (including the one being viewed). */
  familyIds: number[]
  /** The family's pack sizes, as ProductDetailPage already receives them. */
  variants: { id: number; sizeKg: number; pricePerKg: number; inStockKg: number }[]
}): ProductSeo {
  const canonicalId = Math.min(...input.familyIds)
  const canonical = `/products/${canonicalId}`

  const description =
    trimDescription(input.description, 500) || `${input.name} — fresh, stone-ground, ready for store pickup.`

  const product = productJsonLd(input.base, {
    canonicalPath: canonical,
    canonicalId,
    name: input.name,
    category: input.category,
    description,
    images: input.images,
    variants: input.variants.map((v) => ({
      id: v.id,
      sizeLabel: formatSize(v.sizeKg),
      price: packPrice(v.pricePerKg, v.sizeKg),
      // same rule the page uses to disable a size: less than one full pack left = out of stock
      inStock: v.inStockKg + 1e-9 >= v.sizeKg,
    })),
  })

  const breadcrumbs = breadcrumbJsonLd(input.base, [
    { name: 'Home', path: '/' },
    { name: 'Products', path: '/products' },
    { name: input.category, path: `/products?category=${encodeURIComponent(input.category)}` },
    { name: input.name, path: canonical },
  ])

  return { canonical, image: input.images[0], jsonLd: [product, breadcrumbs] }
}