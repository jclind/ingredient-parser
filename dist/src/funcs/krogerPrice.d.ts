/**
 * Convert a Kroger per-base-unit price (in USD dollars) into the same
 * `{ estimatedGramPrice, estimatedSingleUnitPrice }` shape (in US cents) that
 * `calculatePrice` already consumes. Reusing that function keeps
 * `totalPriceUSACents` meaning exactly what it meant under Spoonacular:
 * the cost of the parsed recipe quantity.
 *
 *  - weight/volume units (oz, g, fl oz, ml) yield a per-gram price, so the
 *    converter can map any recipe measure (cups, tbsp, lb…) down to grams.
 *  - count units (ct) have no gram equivalent, so only a single-unit price is
 *    produced and `calculatePrice` falls back to `perEach × quantity`.
 */
export declare function krogerEstimatedPrices(perUnitDollars: number, krogerUnit: string): {
    estimatedGramPrice?: number;
    estimatedSingleUnitPrice?: number;
};
/**
 * Compute `totalPriceUSACents` for a parsed recipe quantity from a Kroger
 * lookup, or null when the lookup carries no usable per-unit price (e.g. the
 * pack size couldn't be parsed) — in which case the caller should fall back to
 * Spoonacular's estimate.
 */
export declare function krogerTotalPriceCents(quantity: number | null, unit: string | null, lookup: {
    perUnit: number | null;
    unit: string | null;
}): number | null;
