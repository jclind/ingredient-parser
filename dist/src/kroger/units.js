"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GRAMS_PER_BASE_UNIT = void 0;
exports.parseSize = parseSize;
exports.perUnitPrice = perUnitPrice;
/** Grams in one of each canonical base unit, used to bridge to a per-gram price.
 *  Volume units assume a water-like density (the same approximation the
 *  ingredient-unit-converter already makes for recipe volumes). `ct` has no
 *  weight equivalent. */
exports.GRAMS_PER_BASE_UNIT = {
    oz: 28.3495,
    g: 1,
    'fl oz': 29.5735,
    ml: 1,
    ct: null,
};
const UNIT_ALIASES = {
    // count
    ct: { unit: 'ct', factor: 1 },
    count: { unit: 'ct', factor: 1 },
    each: { unit: 'ct', factor: 1 },
    ea: { unit: 'ct', factor: 1 },
    pk: { unit: 'ct', factor: 1 },
    pack: { unit: 'ct', factor: 1 },
    dozen: { unit: 'ct', factor: 12 },
    doz: { unit: 'ct', factor: 12 },
    // weight -> oz
    oz: { unit: 'oz', factor: 1 },
    ounce: { unit: 'oz', factor: 1 },
    ounces: { unit: 'oz', factor: 1 },
    lb: { unit: 'oz', factor: 16 },
    lbs: { unit: 'oz', factor: 16 },
    pound: { unit: 'oz', factor: 16 },
    pounds: { unit: 'oz', factor: 16 },
    g: { unit: 'g', factor: 1 },
    gram: { unit: 'g', factor: 1 },
    grams: { unit: 'g', factor: 1 },
    kg: { unit: 'g', factor: 1000 },
    // volume -> fl oz
    'fl oz': { unit: 'fl oz', factor: 1 },
    floz: { unit: 'fl oz', factor: 1 },
    pt: { unit: 'fl oz', factor: 16 },
    pint: { unit: 'fl oz', factor: 16 },
    qt: { unit: 'fl oz', factor: 32 },
    quart: { unit: 'fl oz', factor: 32 },
    gal: { unit: 'fl oz', factor: 128 },
    gallon: { unit: 'fl oz', factor: 128 },
    l: { unit: 'ml', factor: 1000 },
    liter: { unit: 'ml', factor: 1000 },
    ml: { unit: 'ml', factor: 1 },
};
// e.g. "18 ct", "1 gal", "16.9 fl oz", "750ml"
const SIZE_RE = /(\d+(?:\.\d+)?)\s*(fl\s*oz|[a-z]+)/i;
function parseSize(raw) {
    if (!raw)
        return null;
    const match = SIZE_RE.exec(raw.trim().toLowerCase());
    if (!match)
        return null;
    const value = Number.parseFloat(match[1]);
    if (!Number.isFinite(value) || value <= 0)
        return null;
    // Collapse any internal whitespace so "fl  oz" / "floz" both key as "fl oz".
    const rawUnit = match[2].replace(/\s+/g, ' ').trim();
    const key = rawUnit.replace(/\s/g, '') === 'floz' ? 'fl oz' : rawUnit;
    const alias = UNIT_ALIASES[key];
    if (!alias)
        return null;
    return { qty: value * alias.factor, unit: alias.unit };
}
/** Effective price per base unit, or null if the size can't be parsed. */
function perUnitPrice(packagePrice, size) {
    const parsed = parseSize(size);
    if (!parsed || parsed.qty <= 0)
        return null;
    return {
        perUnit: Number((packagePrice / parsed.qty).toFixed(4)),
        unit: parsed.unit,
    };
}
