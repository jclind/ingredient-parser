import { IngredientResponse } from '../../index.js';
declare const ingredientParser: (ingrString: string, spoonacularAPIKey: string) => Promise<IngredientResponse>;
export default ingredientParser;
