/**
 * PREVIEW ONLY: same formula as backend/apps/reservations/services.py
 * (compute_totals). The server recalculates and its numbers are the truth.
 */
const round = (n) => Math.round((Number(n) || 0) * 100) / 100

export function previewTotals({ basePrice, lines, discountType, discountValue }) {
  const base = round(basePrice)
  const servicesTotal = round(lines.reduce((sum, l) => sum + (Number(l.price) || 0) * (Number(l.quantity) || 0), 0))
  const subtotal = round(base + servicesTotal)
  const value = round(discountValue)
  let discount = 0
  if (discountType === 'percent') discount = round((subtotal * Math.min(value, 100)) / 100)
  if (discountType === 'fixed') discount = Math.min(value, subtotal)
  return {
    servicesTotal,
    subtotal,
    discount,
    total: round(subtotal - discount),
    discountTooHigh: (discountType === 'percent' && value > 100) || (discountType === 'fixed' && value > subtotal),
  }
}

/** True when the end time is on the next day (19:00 -> 01:00). */
export const endsNextDay = (start, end) => Boolean(start && end && end <= start)

/**
 * Same rule as Occasion.price_for() on the server: the smallest tier that
 * holds the guests; above the last tier, the last tier. No tiers: default price.
 * Returns { price, tier, overLast }.
 */
export function occasionPrice(occasion, guests) {
  const tiers = [...(occasion?.tiers || [])].sort((a, b) => a.max_guests - b.max_guests)
  if (!tiers.length) return { price: occasion?.default_price ?? '', tier: null, overLast: false }
  const n = Number(guests) || 0
  const tier = tiers.find((x) => n <= x.max_guests)
  return tier ? { price: tier.price, tier, overLast: false } : { price: tiers.at(-1).price, tier: tiers.at(-1), overLast: true }
}
