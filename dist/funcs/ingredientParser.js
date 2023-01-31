import { parse } from 'recipe-ingredient-parser-v3';
import { v4 as uuidv4 } from 'uuid';
import { calculatePrice } from './calculatePrice.js';
import { editIngredientString } from './editIngredientString.js';
import { getIngredientInfo } from './getIngredientInfo.js';
const ingredientParser = async (ingrString, spoonacularAPIKey) => {
    const parsedIngr = parse(ingrString, 'eng');
    const formattedIngr = editIngredientString(parsedIngr.ingredient);
    const { formattedIngrName, comment } = formattedIngr;
    const updatedParsedIngr = {
        ...parsedIngr,
        ingredient: formattedIngrName,
        comment,
    };
    let ingrData = null;
    try {
        ingrData = await getIngredientInfo(formattedIngrName, spoonacularAPIKey);
    }
    catch (error) {
        return {
            error: { message: error.message },
            ingredientData: null,
            parsedIngredient: updatedParsedIngr ?? null,
            id: uuidv4(),
        };
    }
    if (formattedIngr && ingrData) {
        const { estimatedCost, meta, categoryPath, unit, unitShort, unitLong, original, id, ...reducedIngrData } = ingrData;
        console.log(parsedIngr, estimatedCost);
        const totalPrice = calculatePrice(parsedIngr.quantity, parsedIngr.unit, estimatedCost.value);
        const imagePath = `https://spoonacular.com/cdn/ingredients_100x100/${reducedIngrData.image}`;
        const updatedIngrData = {
            ...reducedIngrData,
            imagePath,
            totalPriceUSACents: totalPrice,
        };
        return {
            ingredientData: updatedIngrData,
            parsedIngredient: updatedParsedIngr,
            id: uuidv4(),
        };
    }
    else {
        return {
            error: {
                message: 'Ingredient not formatted correctly or Ingredient Unknown. Please pass ingredient comments/instructions after a comma',
            },
            ingredientData: null,
            parsedIngredient: updatedParsedIngr,
            id: uuidv4(),
        };
    }
};
export default ingredientParser;
//# sourceMappingURL=ingredientParser.js.map