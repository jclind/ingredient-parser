import _axios from 'axios'
import type { AxiosStatic } from 'axios'

// Webpack 5 can resolve require("axios") to the ESM entry without setting
// __esModule, causing __importDefault to double-wrap it. The result is that
// _axios is the module namespace object rather than the axios instance, so
// .create lands one level deeper than expected.
const axios: AxiosStatic =
  typeof _axios.create === 'function'
    ? _axios
    : (_axios as unknown as { default: AxiosStatic }).default

const DEFAULT_SERVER_URL =
  'https://ingredient-parser-service-production-2635.up.railway.app'

export const spoonacularHttp = axios.create({
  baseURL: 'https://api.spoonacular.com/food/ingredients/',
  headers: {
    'Content-type': 'application/json',
  },
  timeout: 8000,
})

export const createIngredientServerHttp = (serverUrl?: string) =>
  axios.create({
    baseURL: serverUrl || DEFAULT_SERVER_URL,
    headers: {
      'Content-type': 'application/json',
    },
    timeout: 8000,
  })
