// src/lib/grain-pricing.ts
//
// Placeholder numbers — EDIT THESE to your real rates. I'm using the
// figures you mentioned (₹6-8/kg grinding fee, ~50g/kg cut) as a starting
// config, not as something to hardcode inline in routes. Keeping it as
// one exported object means you (or your dad) can tune rates without
// touching any route/page code.
//
// Both grind-your-own-wheat and sell-to-store use this same per-grain
// config, just reading different fields from it — grinding reads
// feePerKg + cutGramsPerKg, selling reads buyPricePerKg.

export type GrainConfig = {
  label: string
  grindFeePerKg: number // what you charge to grind 1kg of this grain
  grindCutGramsPerKg: number // how much is kept as payment-in-kind per kg, in grams
  sellBuyPricePerKg: number // what you pay the customer per kg if they're selling it to you
}

export const GRAIN_CONFIG: Record<string, GrainConfig> = {
  wheat: { label: 'Wheat', grindFeePerKg: 6, grindCutGramsPerKg: 50, sellBuyPricePerKg: 22 },
  rice: { label: 'Rice', grindFeePerKg: 15, grindCutGramsPerKg: 10, sellBuyPricePerKg: 21 },
  // Add more grain types here as needed — maize, bajra, jowar, etc.
}

export type GrindQuote = {
  grainLabel: string
  inputKg: number
  feeAmount: number
  cutKg: number
  outputKg: number // what the customer actually takes home, after the cut
}

export function calculateGrindQuote(grainKey: string, inputKg: number): GrindQuote | null {
  const config = GRAIN_CONFIG[grainKey]
  if (!config || inputKg <= 0) return null

  const feeAmount = config.grindFeePerKg * inputKg
  const cutKg = (config.grindCutGramsPerKg / 1000) * inputKg
  const outputKg = Math.max(inputKg - cutKg, 0)

  return {
    grainLabel: config.label,
    inputKg,
    feeAmount,
    cutKg,
    outputKg,
  }
}

export type SellQuote = {
  grainLabel: string
  inputKg: number
  totalAmount: number
}

export function calculateSellQuote(grainKey: string, inputKg: number): SellQuote | null {
  const config = GRAIN_CONFIG[grainKey]
  if (!config || inputKg <= 0) return null

  return {
    grainLabel: config.label,
    inputKg,
    totalAmount: config.sellBuyPricePerKg * inputKg,
  }
}
