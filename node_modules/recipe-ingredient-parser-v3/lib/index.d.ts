export interface Ingredient {
    ingredient: string;
    quantity: string | null;
    unit: string | null;
    minQty: string | null;
    maxQty: string | null;
}
export declare function toTasteRecognize(input: string, language: string): [string, string, boolean];
export declare function parse(recipeString: string, language: string): {
    quantity: number;
    unit: string | null;
    unitPlural: string | null;
    symbol: string | null;
    ingredient: string;
    minQty: number;
    maxQty: number;
};
export declare function multiLineParse(recipeString: string, language: string): {
    quantity: number;
    unit: string | null;
    unitPlural: string | null;
    symbol: string | null;
    ingredient: string;
    minQty: number;
    maxQty: number;
}[];
export declare function combine(ingredientArray: Ingredient[]): Ingredient[];
export declare function prettyPrintingPress(ingredient: Ingredient): string;
