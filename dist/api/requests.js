import { mongoHttp, spoonacularHttp } from './http.js';
export const checkIngredient = async (name) => {
    return await mongoHttp.get(`checkIngredient?name=${name}`);
};
export const searchIngredient = async (name, spoonacularAPIKey) => {
    let searchedIngr;
    try {
        searchedIngr = await spoonacularHttp.get(`search?query=${name}&number=1&apiKey=${spoonacularAPIKey}`);
    }
    catch (error) {
        const res = error.response.data;
        if (res.code === 401) {
            throw new Error('API Key Not Valid');
        }
        else {
            throw new Error('Error Occurred, Please Try Again');
        }
    }
    return searchedIngr;
};
export const getIngredientInformation = async (ingrId, unit, spoonacularAPIKey) => {
    let ingrData;
    try {
        ingrData = await spoonacularHttp.get(`${ingrId}/information?amount=1&${unit ? 'unit=grams&' : ''}apiKey=${spoonacularAPIKey}`);
    }
    catch (error) {
        const res = error.response.data;
        if (res.code === 401) {
            throw new Error('API Key Not Valid');
        }
        else {
            throw new Error('Error Occurred, Please Try Again');
        }
    }
    return ingrData;
};
export const setMongoDBIngrData = async (data) => {
    return await mongoHttp.post(`addIngredient`, data);
};
//# sourceMappingURL=requests.js.map