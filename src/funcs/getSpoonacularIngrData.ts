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

  if (!ingrId) throw new Error(`No Data Found, unknown ingredient: ${name}`)
  1
  const ingrData = await getIngredientInformation(ingrId, spoonacularAPIKey)
  if (ingrData.error) return ingrData

  const mongoDBIngrData = { ...ingrData.data, name }
  const mongoRes = await setMongoDBIngrData(mongoDBIngrData)
  const _id = mongoRes.data.insertedId
  return { ...mongoDBIngrData, _id }
}
