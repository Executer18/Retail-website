// src/lib/format.ts
//
// Tiny shared formatters so CartContents, ProductCard and HomePage all
// render money/size the same way instead of three slightly-different
// copies.

export function rupee(n: number): string {
  return '₹' + Math.round(n).toLocaleString('en-IN')
}

// 1 -> "1 kg", 0.5 -> "500 g", 5 -> "5 kg"
export function formatSize(sizeKg: number): string {
  if (sizeKg < 1) return `${Math.round(sizeKg * 1000)} g`
  return `${sizeKg % 1 === 0 ? sizeKg : sizeKg.toFixed(1)} kg`
}