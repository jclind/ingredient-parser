import { IngredientData } from '../../index.js'
import { mongoHttp, spoonacularHttp } from './http.js'

export const checkIngredient = async (name: string) => {
  return await mongoHttp.get(`checkIngredient?name=${name}`)
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
export const setMongoDBIngrData = async (data: IngredientData) => {
  return await mongoHttp.post(`addIngredient`, data)
}
