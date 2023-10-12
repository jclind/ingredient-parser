import { IngredientResponse, OptionsType } from '../../types.js';
declare const ingredientParser: (ingrString: string, spoonacularAPIKey: string, options: OptionsType) => Promise<IngredientResponse>;
export default ingredientParser;
