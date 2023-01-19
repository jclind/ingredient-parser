const { mongoHttp, spoonacularHttp } = require('./http-common.ts')
const dotenv = require('dotenv')
dotenv.config()
const { parse } = require('recipe-ingredient-parser-v3')

const ingredientParser = async ingrString => {
  const parsedIngr = parse(ingrString, 'eng')
  const formattedIngr = parsedIngr.ingredient
    .trim()
    .replace(/\s{2,}/g, ' ')
    .replace(/,/g, '')
    .replace(/^(fluid )/, '')
    .replace(/^(fl )/, '')
    .replace(/^(oz )/, '')
    .trim()
  console.log(formattedIngr)
  console.log(parsedIngr)
  if (formattedIngr) {
    const ingrData = await getIngredientInfo(formattedIngr)
    return ingrData
  } else {
    return null
  }
}

async function getIngredientInfo(ingrName) {
  const ingrNameLower = ingrName.toLowerCase()
  console.log(ingrNameLower)
  if (!ingrNameLower) return
  const mongoIngrData = await checkIngredient(ingrNameLower)
  console.log(mongoIngrData)
  if (!mongoIngrData.data) {
    const ingrData = await getSpoonacularIngrData(ingrNameLower)
    console.log(ingrData, 'test')
    return ingrData
  } else {
    return mongoIngrData.data
  }
}

async function checkIngredient(name) {
  return await mongoHttp.get(`checkIngredient?name=${name}`)
}
async function getSpoonacularIngrData(name) {
  // console.log(process.env.SPOONACULAR_API_KEY)
  const searchedIngr = await spoonacularHttp.get(
    `search?query=${name}&number=1&apiKey=${process.env.SPOONACULAR_API_KEY}`
  )
  console.log(searchedIngr, 'test2')

  if (
    !searchedIngr.data ||
    !searchedIngr.data.results ||
    searchedIngr.data.results.length <= 0
  ) {
    // console.log('no searchedIngr data')
    return null
  }

  const ingrId = searchedIngr.data.results[0].id

  const ingrData = await spoonacularHttp.get(
    `${ingrId}/information?amount=1&apiKey=${process.env.SPOONACULAR_API_KEY}`
  )
  const mongoDBIngrData = { ...ingrData.data, name }
  // console.log(mongoDBIngrData)
  setMongoDBIngrData(mongoDBIngrData)
  return mongoDBIngrData
}

async function setMongoDBIngrData(data) {
  await mongoHttp.post(`addIngredient`, data)
  return data
}

module.exports = ingredientParser
