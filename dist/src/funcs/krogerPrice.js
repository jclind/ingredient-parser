"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.krogerEstimatedPrices = krogerEstimatedPrices;
exports.krogerTotalPriceCents = krogerTotalPriceCents;
const calculatePrice_js_1 = require("./calculatePrice.js");
const units_js_1 = require("../kroger/units.js");
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
function krogerEstimatedPrices(perUnitDollars, krogerUnit) {
    var _a;
    const perUnitCents = perUnitDollars * 100;
    const gramsPerUnit = (_a = units_js_1.GRAMS_PER_BASE_UNIT[krogerUnit]) !== null && _a !== void 0 ? _a : null;
    return Object.assign(Object.assign({}, (gramsPerUnit ? { estimatedGramPrice: perUnitCents / gramsPerUnit } : {})), { estimatedSingleUnitPrice: perUnitCents });
}
/**
 * Compute `totalPriceUSACents` for a parsed recipe quantity from a Kroger
 * lookup, or null when the lookup carries no usable per-unit price (e.g. the
 * pack size couldn't be parsed) — in which case the caller should fall back to
 * Spoonacular's estimate.
 */
function krogerTotalPriceCents(quantity, unit, lookup) {
    if (lookup.perUnit === null || lookup.unit === null)
        return null;
    const prices = krogerEstimatedPrices(lookup.perUnit, lookup.unit);
    return (0, calculatePrice_js_1.calculatePrice)(quantity, unit, prices);
}
