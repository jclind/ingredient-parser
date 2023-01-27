export declare const checkIngredient: (name: string) => Promise<import("axios").AxiosResponse<any, any>>;
export declare const searchIngredient: (name: string, spoonacularAPIKey: any) => Promise<any>;
export declare const getIngredientInformation: (ingrId: number, spoonacularAPIKey: any) => Promise<any>;
export declare const setMongoDBIngrData: (data: any) => Promise<void>;
