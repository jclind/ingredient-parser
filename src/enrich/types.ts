// Vendor-neutral enrichment contract.
//
// v1 leaked Spoonacular's response shape (20+ optional fields plus `meta: any`,
// `categoryPath: any`, `original: any`) straight to consumers, so a vendor
// change was a breaking change. v2 defines its own shape and maps into it; the
// provider response is reachable only via the opt-in `raw` escape hatch.

export interface IngredientData {
  name: string
  category: string | null // was Spoonacular `aisle`
  image: string | null // fully-resolved CDN URL
  possibleUnits: string[]
  nutrition: Nutrition | null // only when requested
  price: Price | null
  raw?: unknown // the neutral provider response, opt-in (proxy-only: the client never sees the vendor blob)
}

/**
 * Estimated price with provenance. v1 returned a bare `totalPriceUSACents`
 * number with no way to know how it was derived; v2 makes the basis explicit.
 */
export interface Price {
  cents: number // estimated total for the parsed quantity, in US cents
  // 'gram'          — gram-accurate, from a per-gram price
  // 'unit-estimate' — single-unit price multiplied by a count
  // 'free'          — genuinely costs nothing (tap water; "salt to taste").
  //                   Always cents 0 at high confidence. A provider price of 0
  //                   means "no data" here, so a real zero needs its own basis.
  basis: 'gram' | 'unit-estimate' | 'free'
  grams: number | null // grams used when basis === 'gram'
  perGramCents: number | null
  confidence: 'high' | 'low' // 'low' when the unit wasn't gram-convertible
}

/** Per-name price estimates returned by a provider (quantity-independent). */
export interface EstimatedPrices {
  perGramCents?: number // cost of 1 gram, in US cents
  perUnitCents?: number // cost of 1 "single unit", in US cents
}

export interface Nutrition {
  nutrients: NutrientLike[]
  properties?: NutrientLike[]
  flavonoids?: NutrientLike[]
  caloricBreakdown?: Record<string, number>
  weightPerServing?: { amount: number; unit: string }
}

export interface NutrientLike {
  name: string
  amount: number
  unit: string
  percentOfDailyNeeds?: number
}

/**
 * The vendor-neutral wire shape returned by the server's `/v2/ingredient/:name`
 * route. `imageFilename` is the bare CDN filename — the client resolves it to a
 * URL at its chosen `imageSize` (a display concern the server stays out of).
 */
export interface NeutralIngredient {
  name: string
  category: string | null
  imageFilename: string | null
  possibleUnits: string[]
  nutrition: Nutrition | null
  estimatedPrices: EstimatedPrices
}

/** Provider-agnostic lookup result: neutral metadata + raw price estimates. */
export interface ProviderResult {
  data: Omit<IngredientData, 'price'>
  estimatedPrices: EstimatedPrices
}

/** A source of ingredient metadata (Spoonacular today, others later). */
export interface IngredientProvider {
  lookup(name: string): Promise<ProviderResult | null>
}

export type ImageSize = '100x100' | '250x250' | '500x500'
