// src/lib/category-icons.ts
//
// The Annapurna Chakki mockup's category pills/tiles each carry a fixed
// emoji icon from its hardcoded CATEGORIES array. Your real categories
// come from products.category (free text, grouped in the home route),
// so there's no icon column to read. This is a best-effort name match
// instead of a schema change — add an entry here whenever a category
// name doesn't match anything and falls back to the generic icon.

const ICONS: Array<[match: RegExp, icon: string]> = [
  [/wheat|atta/i, '🌾'],
  [/multigrain/i, '🥣'],
  [/millet|jowar|bajra|ragi/i, '🌱'],
  [/besan|dal|gram/i, '🫘'],
  [/rice/i, '🍚'],
  [/spice|masala|chilli|turmeric/i, '🌶️'],
  [/combo|kit|bundle/i, '🎁'],
  [/maize|makki|corn/i, '🌽'],
]

const FALLBACK_ICON = '🛍️'

export function categoryIcon(categoryName: string): string {
  const match = ICONS.find(([re]) => re.test(categoryName))
  return match ? match[1] : FALLBACK_ICON
}