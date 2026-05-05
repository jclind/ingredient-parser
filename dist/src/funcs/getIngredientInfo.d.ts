import { IngredientData } from '../../types.js';
export declare function getIngredientInfo(ingredientString: string, spoonacularAPIKey: string, serverUrl?: string): Promise<IngredientData | null>;
