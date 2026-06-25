// Price calculation with explicit provenance.
//
// The gram-accurate path is used whenever the parsed unit converts to grams;
// otherwise we fall back to the provider's single-unit estimate and mark the
// result low-confidence. No silent `Math.ceil` (v1 did `Math.ceil(x*100)/100`,
// which over-counts); rounding is to the nearest 1/100 cent and documented.

import type { EstimatedPrices, Price } from './types.js'

export interface UnitLike {
  name: string
  type: 'volume' | 'mass' | 'count' | 'informal'
}

/** Result of a unit→grams conversion. `exact` drives price confidence. */
export interface GramConversion {
  grams: number
  exact: boolean // true for mass (density-independent); false for density-estimated volume
}

/** Pluggable converter: parsed quantity + unit → grams, or null if not convertible. */
export type ToGrams = (quantity: number, unit: UnitLike) => GramConversion | null

// Mass units convert to grams exactly and density-independently. Volume units
// would need an ingredient density, so the default converter declines them
// (→ unit-estimate fallback). Plug a richer converter in for volume support.
const MASS_TO_GRAMS: Record<string, number> = {
  milligram: 0.001,
  gram: 1,
  kilogram: 1000,
  ounce: 28.349523125,
  pound: 453.59237,
}

export const defaultToGrams: ToGrams = (quantity, unit) => {
  const factor = MASS_TO_GRAMS[unit.name]
  return factor === undefined ? null : { grams: quantity * factor, exact: true }
}

const round2 = (cents: number) => Math.round(cents * 100) / 100

/**
 * @param quantity parsed quantity (null = unspecified)
 * @param unit     parsed unit object (null = no unit)
 * @param prices   provider per-name estimates (in cents)
 * @param toGrams  optional converter (defaults to mass-only)
 */
// A usable price is a positive finite number. A provider price of exactly 0 is
// treated as "no data" (not a confident $0.00) — e.g. the proxy returns
// perGramCents:0 for ingredients it has no real cost for. Conflating "free"
// with "unknown" would silently undercount recipe totals at high confidence.
const usablePrice = (n: unknown): number | null =>
  typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null

export function calculatePrice(
  quantity: number | null,
  unit: UnitLike | null,
  prices: EstimatedPrices,
  toGrams: ToGrams = defaultToGrams
): Price | null {
  // Reject non-finite / negative quantities (a scaled or garbage value) rather
  // than emit a negative or Infinity/NaN price.
  if (quantity !== null && (!Number.isFinite(quantity) || quantity < 0)) return null

  // Coerce provider price estimates: non-finite or non-positive → treated as absent.
  const perGram = usablePrice(prices.perGramCents)
  const perUnit = usablePrice(prices.perUnitCents)

  const unitEstimate = (qty: number): Price | null => {
    if (perUnit === null) return null
    const cents = round2(perUnit * qty)
    if (!Number.isFinite(cents)) return null
    return {
      cents,
      basis: 'unit-estimate',
      grams: null,
      perGramCents: null,
      confidence: 'low',
    }
  }

  // No quantity: best we can offer is the cost of a single unit.
  if (quantity === null) {
    return unitEstimate(1)
  }

  // Gram path: unit converts to grams and we have a per-gram price. Confidence
  // is 'high' only for exact (mass) conversions; density-estimated volume is 'low'.
  if (unit && perGram !== null) {
    const conv = toGrams(quantity, unit)
    if (conv !== null) {
      const cents = round2(conv.grams * perGram)
      if (Number.isFinite(cents)) {
        return {
          cents,
          basis: 'gram',
          grams: conv.grams,
          perGramCents: perGram,
          confidence: conv.exact ? 'high' : 'low',
        }
      }
    }
  }

  // Fallback: single-unit estimate × quantity (covers quantity === 0 → 0).
  return unitEstimate(quantity)
}
