import { IngredientResponse } from '../../types.js';
declare const ingredientParser: (ingrString: string, spoonacularAPIKey: string) => Promise<IngredientResponse>;
export default ingredientParser;
