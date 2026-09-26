import { IngredientData, OptionsType, PriceSource } from '../../types.js';
/** The price outcome the factory has resolved for an ingredient. */
export interface PriceInfo {
    totalPriceUSACents: number | null;
    priceSource?: PriceSource;
    /** Set only when Kroger supplied the price. */
    store?: string | null;
    /** Set only when Kroger supplied the price. */
    matchedProduct?: string | null;
}
/**
 * Reduce a raw enriched ingredient record (Spoonacular metadata) plus a
 * resolved price into the public `IngredientData` shape. Mirrors the assembly
 * in the legacy `ingredientParser`, with the v2 additive price fields.
 */
export declare function buildIngredientData(ingrData: IngredientData, options: OptionsType | undefined, price: PriceInfo): IngredientData;
