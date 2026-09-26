import { IngredientParserConfig, IngredientResponse, ParseOptions } from '../../types.js';
export interface IngredientParserClient {
    /**
     * Parse + enrich one ingredient string. Same I/O contract as the legacy
     * `ingredientParser`, but `totalPriceUSACents` is a real Kroger shelf price
     * when one can be matched, falling back to Spoonacular's estimate otherwise.
     */
    parse(ingrString: string, options?: ParseOptions): Promise<IngredientResponse>;
}
/**
 * Build a Kroger-aware ingredient parser. Holds the Kroger OAuth token and
 * resolved store across calls. When `config.kroger` is omitted it behaves like
 * the legacy Spoonacular-only parser.
 */
export declare function createIngredientParser(config: IngredientParserConfig): IngredientParserClient;
