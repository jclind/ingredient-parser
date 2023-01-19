const { mongoHttp, spoonacularHttp } = require('./http-common.ts')
const dotenv = require('dotenv')
console.log(dotenv.config())

async function isWds(ingrName) {
  const ingrNameLower = ingrName.toLowerCase()
  if (!ingrNameLower) return
  const mongoIngrData = await checkIngredient(ingrNameLower)
  if (!mongoIngrData.data) {
    console.log('here 1')
    getSpoonacularIngrData(ingrNameLower)
  } else {
    console.log('here 2')
  }

  return
}

async function checkIngredient(name) {
  return await mongoHttp.get(`checkIngredient?name=${name}`)
}
async function getSpoonacularIngrData(name) {
  // console.log(process.env.SPOONACULAR_API_KEY)
  const searchedIngr = await spoonacularHttp.get(
    `search?query=${name}&number=1&apiKey=${process.env.SPOONACULAR_API_KEY}`
  )

  if (
    !searchedIngr.data ||
    !searchedIngr.data.results ||
    searchedIngr.data.results.length <= 0
  ) {
    console.log('no searchedIngr data')
    return null
  }

  const ingrId = searchedIngr.data.results[0].id

  const ingrData = await spoonacularHttp.get(
    `${ingrId}/information?amount=1&apiKey=${process.env.SPOONACULAR_API_KEY}`
  )
  setMongoDBIngrData({ ...ingrData.data, name })
}

async function setMongoDBIngrData(data) {
  const test = await mongoHttp.post(`addIngredient`, data)
  console.log(test.data)
}

module.exports = isWds
