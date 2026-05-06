import { getIngredientFromServer, saveIngredientToServer } from '../api/requests.js'
import { getSpoonacularIngrData } from './getSpoonacularIngrData.js'
import { IngredientData } from '../../types.js'

export async function getIngredientInfo(
  ingredientName: string,
  spoonacularAPIKey: string,
  serverUrl?: string
): Promise<IngredientData | null> {
  const cached = await getIngredientFromServer(ingredientName, serverUrl)
  if (cached) return cached

  const spoonacularData = await getSpoonacularIngrData(
    ingredientName,
    spoonacularAPIKey
  )
  if (!spoonacularData) return null

  saveIngredientToServer(ingredientName, spoonacularData, serverUrl)

  return spoonacularData
}
