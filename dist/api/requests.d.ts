import { IngredientData } from '@jclind/ingredient-parser';
export declare const checkIngredient: (name: string) => Promise<import("axios").AxiosResponse<any, any>>;
export declare const searchIngredient: (name: string, spoonacularAPIKey: string) => Promise<any>;
export declare const getIngredientInformation: (ingrId: number, unit: boolean, spoonacularAPIKey: string) => Promise<any>;
export declare const setMongoDBIngrData: (data: IngredientData) => Promise<import("axios").AxiosResponse<any, any>>;
