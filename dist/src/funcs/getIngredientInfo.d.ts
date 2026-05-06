import { IngredientData } from '../../types.js';
export declare function getIngredientInfo(ingredientName: string, spoonacularAPIKey: string, serverUrl?: string): Promise<IngredientData | null>;
