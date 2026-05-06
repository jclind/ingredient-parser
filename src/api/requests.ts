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

export const getIngredientFromServer = async (
  name: string,
  serverUrl?: string
): Promise<IngredientData | null> => {
  try {
    const serverHttp = createIngredientServerHttp(serverUrl)
    const response = await serverHttp.get(
      `/ingredient/${encodeURIComponent(name)}`
    )
    return response.data.data ?? null
  } catch {
    // Treat any server error as a cache miss and fall through to Spoonacular
    return null
  }
}

export const saveIngredientToServer = (
  name: string,
  ingredientData: IngredientData,
  serverUrl?: string
): void => {
  const serverHttp = createIngredientServerHttp(serverUrl)
  serverHttp
    .post('/ingredient', { name, ingredientData })
    .catch(() => {
      // Fire-and-forget — a failed write doesn't affect the caller
    })
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
