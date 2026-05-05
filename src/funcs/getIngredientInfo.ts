import { parseAndEnrich } from '../api/requests.js'
import { IngredientData } from '../../types.js'

export async function getIngredientInfo(
  ingredientString: string,
  spoonacularAPIKey: string,
  serverUrl?: string
): Promise<IngredientData | null> {
  try {
    return await parseAndEnrich(ingredientString, spoonacularAPIKey, serverUrl)
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch ingredient data')
  }
}
