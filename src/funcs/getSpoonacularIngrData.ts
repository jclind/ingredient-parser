import {
  getIngredientInformation,
  searchIngredient,
  setMongoDBIngrData,
} from '../api/requests.js'

export async function getSpoonacularIngrData(
  name: string,
  spoonacularAPIKey: string
) {
  const searchedIngr = await searchIngredient(name, spoonacularAPIKey)
  if (searchedIngr.error) return searchedIngr
  const ingrId = searchedIngr?.data?.results[0]?.id ?? null

  if (!ingrId) return { error: 'No Data Found', errorMsg: 'No Data Found' }

  const ingrData = await getIngredientInformation(ingrId, spoonacularAPIKey)
  if (ingrData.error) return ingrData

  const mongoDBIngrData = { ...ingrData.data, name }
  setMongoDBIngrData(mongoDBIngrData)
  return mongoDBIngrData
}
