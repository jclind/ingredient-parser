import { getIngredientInformation, searchIngredient, setMongoDBIngrData, } from '../api/requests.js';
export async function getSpoonacularIngrData(name, spoonacularAPIKey) {
    const searchedIngr = await searchIngredient(name, spoonacularAPIKey);
    if (searchedIngr.error)
        return searchedIngr;
    const ingrId = searchedIngr?.data?.results[0]?.id ?? null;
    if (!ingrId)
        throw new Error(`No Data Found, unknown ingredient: ${name}`);
    const ingrDataGram = await getIngredientInformation(ingrId, true, spoonacularAPIKey);
    const ingrDataSingleUnit = await getIngredientInformation(ingrId, false, spoonacularAPIKey);
    if (ingrDataGram.error || ingrDataSingleUnit.error)
        return ingrDataGram;
    const estimatedGramPrice = ingrDataGram.data.estimatedCost.value;
    const estimatedSingleUnitPrice = ingrDataSingleUnit.data.estimatedCost.value;
    const ingrData = {
        ...ingrDataGram.data,
        name,
        ingredientId: ingrId,
        estimatedPrices: { estimatedGramPrice, estimatedSingleUnitPrice },
    };
    const mongoDBIngrData = ingrData;
    const mongoRes = await setMongoDBIngrData(mongoDBIngrData);
    const _id = mongoRes.data.insertedId;
    return { ...mongoDBIngrData, _id };
}
//# sourceMappingURL=getSpoonacularIngrData.js.map