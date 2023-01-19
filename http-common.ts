const axios = require('axios')

const mongoHttp = axios.create({
  baseURL:
    'https://us-east-1.aws.data.mongodb-api.com/app/prepify-ixumn/endpoint',
  headers: {
    'Content-type': 'application/json',
  },
})
const spoonacularHttp = axios.create({
  baseURL: 'https://api.spoonacular.com/food/ingredients/',
  headers: {
    'Content-type': 'application/json',
  },
})
module.exports = { mongoHttp, spoonacularHttp }
