import {
  getIngredientInformation,
  searchIngredient,
} from '../api/requests.js'

export async function getSpoonacularIngrData(
  name: string,
  spoonacularAPIKey: string
) {
  const searchedIngr = await searchIngredient(name, spoonacularAPIKey)
  const ingrId = searchedIngr?.data?.results[0]?.id ?? null

  if (!ingrId) throw new Error(`No Data Found, unknown ingredient: ${name}`)

  const [ingrDataGram, ingrDataSingleUnit] = await Promise.all([
    getIngredientInformation(ingrId, true, spoonacularAPIKey),
    getIngredientInformation(ingrId, false, spoonacularAPIKey),
  ])

  const estimatedGramPrice = ingrDataGram.data.estimatedCost?.value ?? 0
  const estimatedSingleUnitPrice = ingrDataSingleUnit.data.estimatedCost?.value ?? 0

  const ingrData = {
    ...ingrDataGram.data,
    name,
    ingredientId: ingrId,
    estimatedPrices: { estimatedGramPrice, estimatedSingleUnitPrice },
  }

  return ingrData
}
