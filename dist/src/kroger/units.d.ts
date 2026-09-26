/**
 * Parse a Kroger product size string into a quantity + canonical base unit, so
 * a package price can be divided down to a per-unit price.
 *
 * Examples it handles:
 *   "18 ct"        -> { qty: 18,  unit: "ct" }
 *   "16 oz"        -> { qty: 16,  unit: "oz" }
 *   "1 gal"        -> { qty: 128, unit: "fl oz" }   (normalized)
 *   "2 lb"         -> { qty: 32,  unit: "oz" }      (normalized)
 *   "1 dozen"      -> { qty: 12,  unit: "ct" }
 *   "750 ml"       -> { qty: 750, unit: "ml" }
 */
export interface ParsedSize {
    qty: number;
    unit: string;
}
/** Grams in one of each canonical base unit, used to bridge to a per-gram price.
 *  Volume units assume a water-like density (the same approximation the
 *  ingredient-unit-converter already makes for recipe volumes). `ct` has no
 *  weight equivalent. */
export declare const GRAMS_PER_BASE_UNIT: Record<string, number | null>;
export declare function parseSize(raw: string | null | undefined): ParsedSize | null;
/** Effective price per base unit, or null if the size can't be parsed. */
export declare function perUnitPrice(packagePrice: number, size: string | null | undefined): {
    perUnit: number;
    unit: string;
} | null;
