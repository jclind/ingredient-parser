const { mongoHttp, spoonacularHttp } = require('./http-common.ts')
const { parse } = require('recipe-ingredient-parser-v3')

const ingredientParser = async (ingrString, spoonacularAPIKey) => {
  const parsedIngr = parse(ingrString, 'eng')
  const formattedIngr = parsedIngr.ingredient
    .trim()
    .replace(/\s{2,}/g, ' ')
    .replace(/,/g, '')
    .replace(/^(fluid )/, '')
    .replace(/^(fl )/, '')
    .replace(/^(oz )/, '')
    .trim()
  if (formattedIngr) {
    const ingrData = await getIngredientInfo(formattedIngr, spoonacularAPIKey)
    return ingrData
  } else {
    return null
  }
}

async function getIngredientInfo(ingrName, spoonacularAPIKey) {
  const ingrNameLower = ingrName.toLowerCase()
  if (!ingrNameLower) return
  const mongoIngrData = await checkIngredient(ingrNameLower)
  if (!mongoIngrData.data) {
    const ingrData = await getSpoonacularIngrData(
      ingrNameLower,
      spoonacularAPIKey
    )
    return ingrData
  } else {
    return mongoIngrData.data
  }
}

async function checkIngredient(name) {
  return await mongoHttp.get(`checkIngredient?name=${name}`)
}
async function getSpoonacularIngrData(name, spoonacularAPIKey) {
  let searchedIngr = null
  try {
    searchedIngr = await spoonacularHttp.get(
      `search?query=${name}&number=1&apiKey=${spoonacularAPIKey}`
    )
  } catch (error) {
    const res = error.response.data
    if (res.code === 401) {
      return { errorMsg: 'API Key Not Valid', error }
    } else {
      return { errorMsg: 'Error Occurred, Please Try Again', error }
    }
  }

  if (
    !searchedIngr.data ||
    !searchedIngr.data.results ||
    searchedIngr.data.results.length <= 0
  ) {
    return null
  }

  const ingrId = searchedIngr.data.results[0].id

  let ingrData = null
  try {
    ingrData = await spoonacularHttp.get(
      `${ingrId}/information?amount=1&apiKey=${process.env.SPOONACULAR_API_KEY}`
    )
  } catch (error) {
    if (res.code === 401) {
      return { errorMsg: 'API Key Not Valid', error }
    } else {
      return { errorMsg: 'Error Occurred, Please Try Again', error }
    }
  }
  const mongoDBIngrData = { ...ingrData.data, name }
  setMongoDBIngrData(mongoDBIngrData)
  return mongoDBIngrData
}

async function setMongoDBIngrData(data) {
  await mongoHttp.post(`addIngredient`, data)
  return data
}

module.exports = ingredientParser
