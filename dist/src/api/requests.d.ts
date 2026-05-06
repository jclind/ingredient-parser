import { IngredientData } from '../../types.js';
export declare const getIngredientFromServer: (name: string, serverUrl?: string) => Promise<IngredientData | null>;
export declare const saveIngredientToServer: (name: string, ingredientData: IngredientData, serverUrl?: string) => void;
export declare const searchIngredient: (name: string, spoonacularAPIKey: string) => Promise<import("axios").AxiosResponse<any, any, {}>>;
export declare const getIngredientInformation: (ingrId: number, unit: boolean, spoonacularAPIKey: string) => Promise<import("axios").AxiosResponse<any, any, {}>>;
