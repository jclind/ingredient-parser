import { isAxiosError } from 'axios'
import { spoonacularHttp, createIngredientServerHttp } from './http.js'
import { IngredientData } from '../../types.js'

function handleRequestError(error: unknown): never {
  if (isAxiosError(error)) {
    const status = error.response?.status
    const code = error.response?.data?.code
    if (status === 401 || code === 401) throw new Error('API Key Not Valid')
    if (status === 429) throw new Error('Rate limit exceeded, please try again later')
    if (error.response) throw new Error('Error Occurred, Please Try Again')
    throw new Error('Network error, please try again')
  }
  throw new Error('Network error, please try again')
}

export const parseAndEnrich = async (
  ingredientString: string,
  spoonacularApiKey: string,
  serverUrl?: string
): Promise<IngredientData | null> => {
  try {
    const serverHttp = createIngredientServerHttp(serverUrl)
    const response = await serverHttp.post('/parse', {
      ingredientString,
      spoonacularApiKey,
    })
    return response.data.data ?? null
  } catch (error: unknown) {
    handleRequestError(error)
  }
}

export const searchIngredient = async (
  name: string,
  spoonacularAPIKey: string
) => {
  try {
    return await spoonacularHttp.get(
      `search?query=${name}&number=1&apiKey=${spoonacularAPIKey}`
    )
  } catch (error: unknown) {
    handleRequestError(error)
  }
}

export const getIngredientInformation = async (
  ingrId: number,
  unit: boolean,
  spoonacularAPIKey: string
) => {
  try {
    return await spoonacularHttp.get(
      `${ingrId}/information?amount=1&${
        unit ? 'unit=grams&' : ''
      }apiKey=${spoonacularAPIKey}`
    )
  } catch (error: unknown) {
    handleRequestError(error)
  }
}
