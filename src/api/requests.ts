import { mongoHttp, spoonacularHttp } from './http.js'

export const checkIngredient = async (name: string) => {
  return await mongoHttp.get(`checkIngredient?name=${name}`)
}
export const searchIngredient = async (name: string, spoonacularAPIKey) => {
  let searchedIngr: any
  try {
    searchedIngr = await spoonacularHttp.get(
      `search?query=${name}&number=1&apiKey=${spoonacularAPIKey}`
    )
  } catch (error) {
    const res: any = error.response.data
    if (res.code === 401) {
      return { errorMsg: 'API Key Not Valid', error }
    } else {
      return { errorMsg: 'Error Occurred, Please Try Again', error }
    }
  }
  return searchedIngr
}
export const getIngredientInformation = async (
  ingrId: number,
  spoonacularAPIKey
) => {
  let ingrData: any
  try {
    ingrData = await spoonacularHttp.get(
      `${ingrId}/information?amount=28.3495&apiKey=${spoonacularAPIKey}`
    )
  } catch (error) {
    const res: any = error.response.data
    if (res.code === 401) {
      return { errorMsg: 'API Key Not Valid', error }
    } else {
      return { errorMsg: 'Error Occurred, Please Try Again', error }
    }
  }
  return ingrData
}
export const setMongoDBIngrData = async data => {
  await mongoHttp.post(`addIngredient`, data)
}
