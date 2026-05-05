import { spoonacularHttp, createIngredientServerHttp } from './http.js'
import { IngredientData } from '../../types.js'

export const parseAndEnrich = async (
  ingredientString: string,
  spoonacularApiKey: string,
  serverUrl?: string
): Promise<IngredientData | null> => {
  const serverHttp = createIngredientServerHttp(serverUrl)
  const response = await serverHttp.post('/parse', {
    ingredientString,
    spoonacularApiKey,
  })
  return response.data.data ?? null
}

export const searchIngredient = async (
  name: string,
  spoonacularAPIKey: string
) => {
  let searchedIngr: any
  try {
    searchedIngr = await spoonacularHttp.get(
      `search?query=${name}&number=1&apiKey=${spoonacularAPIKey}`
    )
  } catch (error: any) {
    const res: any = error.response.data
    if (res.code === 401) {
      throw new Error('API Key Not Valid')
    } else {
      throw new Error('Error Occurred, Please Try Again')
    }
  }
  return searchedIngr
}
export const getIngredientInformation = async (
  ingrId: number,
  unit: boolean,
  spoonacularAPIKey: string
) => {
  let ingrData: any
  try {
    ingrData = await spoonacularHttp.get(
      `${ingrId}/information?amount=1&${
        unit ? 'unit=grams&' : ''
      }apiKey=${spoonacularAPIKey}`
    )
  } catch (error: any) {
    const res: any = error.response.data
    if (res.code === 401) {
      throw new Error('API Key Not Valid')
    } else {
      throw new Error('Error Occurred, Please Try Again')
    }
  }

  return ingrData
}
