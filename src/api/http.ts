import axios from 'axios'

const DEFAULT_SERVER_URL =
  'https://ingredient-parser-service-production-2635.up.railway.app'

export const spoonacularHttp = axios.create({
  baseURL: 'https://api.spoonacular.com/food/ingredients/',
  headers: {
    'Content-type': 'application/json',
  },
})

export const createIngredientServerHttp = (serverUrl?: string) =>
  axios.create({
    baseURL: serverUrl || DEFAULT_SERVER_URL,
    headers: {
      'Content-type': 'application/json',
    },
  })
