// src/lib/format.ts
//
// Shared formatters so CartContents, ProductCard, ProductDetailPage and
// products.ts all render money/size/quantity the same way.

export function rupee(n: number): string {
  return '₹' + Math.round(n).toLocaleString('en-IN')
}

// 1 -> "1 kg", 0.5 -> "500 g", 5 -> "5 kg"
export function formatSize(sizeKg: number): string {
  if (sizeKg < 1) return `${Math.round(sizeKg * 1000)} g`
  return `${sizeKg % 1 === 0 ? sizeKg : sizeKg.toFixed(1)} kg`
}

// Below this pack size, prices are quoted per 100g instead of per kg —
// "₹8/100g" reads naturally for a 50g spice packet; "₹80/kg" for the
// same product is correct but makes someone do mental math. Edit this
// one line to change the cutoff everywhere at once.
export const GRAM_PRICING_THRESHOLD_KG = 1

// The per-unit rate shown next to a price — "/kg" normally, "/100g"
// for anything under GRAM_PRICING_THRESHOLD_KG. pricePerKg in the DB is
// always a per-KILOGRAM rate regardless of pack size; this only changes
// how it's *displayed*.
export function formatUnitPrice(pricePerKg: number, sizeKg: number): string {
  if (sizeKg < GRAM_PRICING_THRESHOLD_KG) {
    return `${rupee(pricePerKg / 10)}/100g`
  }
  return `${rupee(pricePerKg)}/kg`
}

// The actual price of ONE PACK of this size — what a shopper is really
// paying when they tap "add" once. This is the number that should be
// the prominent price everywhere (card, detail page, variant chips);
// pricePerKg alone is just the rate used to compute it, and showing it
// bare next to a size ("5kg · ₹20") reads as "₹20 total", which is
// wrong and is exactly what was confusing in the size picker.
export function packPrice(pricePerKg: number, sizeKg: number): number {
  return pricePerKg * sizeKg
}

// Cart/cartItems store quantityKg (actual kg) for correct math — this
// converts that into the PACK COUNT a shopper actually taps through
// (1, 2, 3…), regardless of whether one pack is 0.05kg or 5kg. Always
// round: float accumulation (0.05 + 0.05 + 0.05) can land on
// 0.15000000000000002, which would otherwise show as a non-integer
// pack count.
export function toPackCount(quantityKg: number, sizeKg: number): number {
  if (sizeKg <= 0) return Math.round(quantityKg)
  return Math.round(quantityKg / sizeKg)
}

// Inverse of toPackCount — what to send the server as quantityKg for a
// given number of packs.
export function fromPackCount(packCount: number, sizeKg: number): number {
  return Math.round(packCount * sizeKg * 1000) / 1000
} 