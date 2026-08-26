// Price calculation with explicit provenance.
//
// The gram-accurate path is used whenever the parsed unit converts to grams;
// otherwise we fall back to the provider's single-unit estimate and mark the
// result low-confidence — but only for units that count discrete items, since a
// per-item price says nothing about a cup or a pound. No silent `Math.ceil` (v1 did `Math.ceil(x*100)/100`,
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

// A usable price is a positive finite number. A provider price of exactly 0 is
// treated as "no data" (not a confident $0.00) — e.g. the proxy returns
// perGramCents:0 for ingredients it has no real cost for. Conflating "free"
// with "unknown" would silently undercount recipe totals at high confidence.
const usablePrice = (n: unknown): number | null =>
  typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null

// The single-unit estimate answers "what does one of these cost?", so it only
// means anything when the quantity counts discrete items: 2 eggs, 3 onions, a
// can of beans. A mass or volume measure needs a per-gram price. Multiplying
// cups by price-per-onion is a category error, not a rough approximation, and
// it silently produced ~236x errors in the wild (`1 1/3 cup salsa` → $0.01)
// before this gate existed. Declining lets the caller show "no price" and ask
// the author for one, which beats a confident wrong number.
const countsDiscreteItems = (unit: UnitLike | null): boolean =>
  unit === null || unit.type === 'count' || unit.type === 'informal'

/** A container unit's real measure, per container (parse.ts `containerSize`). */
export interface ContainerSize {
  value: number
  unit: UnitLike
}

/**
 * @param quantity  parsed quantity (null = unspecified)
 * @param unit      parsed unit object (null = no unit)
 * @param prices    provider per-name estimates (in cents)
 * @param toGrams   optional converter (defaults to mass-only)
 * @param container optional per-container measure; when present it replaces
 *                  the container unit for pricing
 */
export function calculatePrice(
  quantity: number | null,
  unit: UnitLike | null,
  prices: EstimatedPrices,
  toGrams: ToGrams = defaultToGrams,
  container: ContainerSize | null = null
): Price | null {
  // Reject non-finite / negative quantities (a scaled or garbage value) rather
  // than emit a negative or Infinity/NaN price.
  if (quantity !== null && (!Number.isFinite(quantity) || quantity < 0)) return null

  // Coerce provider price estimates: non-finite or non-positive → treated as absent.
  const perGram = usablePrice(prices.perGramCents)
  const perUnitRaw = usablePrice(prices.perUnitCents)

  // A per-unit price identical to the per-gram price is not a per-unit price.
  // Providers derive it from a "cost of amount=1" lookup whose unit is the
  // ingredient's own default, and for bulk goods that default IS a gram, so the
  // same number comes back wearing a per-item label. Equality is a reliable
  // tell: across a 20-ingredient probe of the live proxy every countable
  // ingredient differed (egg 24 vs 0.55, onion 24.2 vs 0.22) and every bulk one
  // matched to the cent (salsa, flour, yogurt, soy sauce). A genuine per-item
  // price that happens to equal the per-gram price would cost us a decline,
  // which is the safe direction to be wrong in.
  const perUnit = perGram !== null && perUnitRaw === perGram ? null : perUnitRaw

  const unitEstimate = (qty: number): Price | null => {
    if (perUnit === null || !countsDiscreteItems(unit)) return null
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

  // No quantity: best we can offer is the cost of a single unit, and only when
  // the unit counts items (the gate above rejects "cups of flour, amount
  // unspecified" rather than pricing it as one flour).
  if (quantity === null) {
    return unitEstimate(1)
  }

  // A container ("1 can", "2 jars") is packaging, not an amount, so when parse
  // recovered the size on the label we price that instead: 2 cans x 14.5 oz =
  // 29 oz of tomatoes. The size is per container, hence the multiply. Note this
  // is the NET weight printed on the can, not the drained weight. That is the
  // right basis for cost, since you pay for the whole can, even though the
  // yield after draining is smaller.
  let pricingQuantity = quantity
  let pricingUnit = unit
  if (container !== null && Number.isFinite(container.value) && container.value > 0) {
    pricingQuantity = quantity * container.value
    pricingUnit = container.unit
  }

  // Gram path: unit converts to grams and we have a per-gram price. Confidence
  // is 'high' only for exact (mass) conversions; density-estimated volume is 'low'.
  if (pricingUnit && perGram !== null) {
    const conv = toGrams(pricingQuantity, pricingUnit)
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

  // Fallback: single-unit estimate × quantity (covers quantity === 0 → 0), or
  // null when the unit isn't countable or the provider's per-unit price is the
  // disguised per-gram one.
  return unitEstimate(quantity)
}
