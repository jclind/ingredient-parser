import { IngredientData } from '../../types.js';
export declare const parseAndEnrich: (ingredientString: string, spoonacularApiKey: string, serverUrl?: string) => Promise<IngredientData | null>;
export declare const searchIngredient: (name: string, spoonacularAPIKey: string) => Promise<import("axios").AxiosResponse<any, any, {}>>;
export declare const getIngredientInformation: (ingrId: number, unit: boolean, spoonacularAPIKey: string) => Promise<import("axios").AxiosResponse<any, any, {}>>;
