import { checkIngredient } from '../api/requests.js'
import { getSpoonacularIngrData } from './getSpoonacularIngrData.js'

export async function getIngredientInfo(
  ingrName: string,
  spoonacularAPIKey: string
) {
  const ingrNameLower = ingrName.toLowerCase()
  if (!ingrNameLower) return
  const mongoIngrData = await checkIngredient(ingrNameLower)
  if (!mongoIngrData.data) {
    const ingrData = await getSpoonacularIngrData(
      ingrNameLower,
      spoonacularAPIKey
    )
    return ingrData
  } else {
    return mongoIngrData.data
  }
}
