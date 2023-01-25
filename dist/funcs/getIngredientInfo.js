import { checkIngredient } from '../api/requests.js';
import { getSpoonacularIngrData } from './getSpoonacularIngrData.js';
export async function getIngredientInfo(ingrName, spoonacularAPIKey) {
    const ingrNameLower = ingrName.toLowerCase();
    if (!ingrNameLower)
        throw new Error('Ingredient Invalid');
    const mongoIngrData = await checkIngredient(ingrNameLower);
    if (!mongoIngrData.data) {
        const ingrData = await getSpoonacularIngrData(ingrNameLower, spoonacularAPIKey);
        return ingrData;
    }
    else {
        return mongoIngrData.data;
    }
}
//# sourceMappingURL=getIngredientInfo.js.map