type StringOrNull = string | null;
type NumberOrNull = number | null;
export type IngredientResponse = {
    parsedIngredient: ParsedIngredient;
    ingredientData: IngredientData;
    id?: string;
} | {
    error: {
        message: string;
    };
    parsedIngredient: ParsedIngredient;
    ingredientData: IngredientData | null;
    id?: string;
};
export type ParsedIngredient = {
    quantity: NumberOrNull;
    unit: StringOrNull;
    unitPlural: StringOrNull;
    symbol: StringOrNull;
    ingredient: StringOrNull;
    originalIngredientString: string;
    minQty: NumberOrNull;
    maxQty: NumberOrNull;
    comment: StringOrNull;
};
export interface IngredientData {
    _id?: string;
    ingredientId?: number;
    originalName?: string;
    name: string;
    amount?: number;
    possibleUnits?: string[];
    consistency?: string;
    shoppingListUnits?: string[];
    aisle?: string;
    image?: string;
    imagePath?: string;
    nutrition?: Nutrition;
    totalPriceUSACents?: number;
    estimatedPrices?: {
        estimatedGramPrice?: number;
        estimatedSingleUnitPrice?: number;
    };
    meta?: any;
    categoryPath?: any;
    unit?: string;
    unitShort?: string;
    unitLong?: string;
    original?: any;
    id?: number;
}
export interface Nutrition {
    nutrients: Nutrient[];
    properties: Property[];
    flavonoids: Flavonoid[];
    caloricBreakdown: CaloricBreakdown;
    weightPerServing: WeightPerServing;
}
export interface Nutrient {
    name: string;
    amount: number;
    unit: string;
    percentOfDailyNeeds: number;
}
export interface Property {
    name: string;
    amount: number;
    unit: string;
}
export interface Flavonoid {
    name: string;
    amount: number;
    unit: string;
}
export interface CaloricBreakdown {
    percentProtein: number;
    percentFat: number;
    percentCarbs: number;
}
export interface WeightPerServing {
    amount: number;
    unit: string;
}
export type SpoonacularImageSize = '100x100' | '250x250' | '500x500';
export type OptionsType = {
    returnNutritionData?: boolean;
    imageSize?: SpoonacularImageSize;
    serverUrl?: string;
};
export {};
