import { checkIngredient } from '../api/requests.js'
import { getSpoonacularIngrData } from './getSpoonacularIngrData.js'

export async function getIngredientInfo(
  ingrName: string,
  spoonacularAPIKey: string
) {
  const ingrNameLower = ingrName.toLowerCase()
  if (!ingrNameLower) throw new Error('Ingredient Invalid')

  let mongoIngrData: any = null
  try {
    mongoIngrData = await checkIngredient(ingrNameLower)
  } catch {
    // MongoDB cache unavailable — fall through to Spoonacular
  }

  if (!mongoIngrData?.data) {
    const ingrData = await getSpoonacularIngrData(
      ingrNameLower,
      spoonacularAPIKey
    )
    return ingrData
  } else {
    return mongoIngrData.data
  }
}
