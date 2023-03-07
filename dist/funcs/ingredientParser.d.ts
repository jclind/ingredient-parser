import { IngredientResponse } from '@jclind/ingredient-parser';
declare const ingredientParser: (ingrString: string, spoonacularAPIKey: string) => Promise<IngredientResponse>;
export default ingredientParser;
