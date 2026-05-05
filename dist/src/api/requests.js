"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIngredientInformation = exports.searchIngredient = exports.parseAndEnrich = void 0;
const http_js_1 = require("./http.js");
const parseAndEnrich = (ingredientString, spoonacularApiKey, serverUrl) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const serverHttp = (0, http_js_1.createIngredientServerHttp)(serverUrl);
    const response = yield serverHttp.post('/parse', {
        ingredientString,
        spoonacularApiKey,
    });
    return (_a = response.data.data) !== null && _a !== void 0 ? _a : null;
});
exports.parseAndEnrich = parseAndEnrich;
const searchIngredient = (name, spoonacularAPIKey) => __awaiter(void 0, void 0, void 0, function* () {
    let searchedIngr;
    try {
        searchedIngr = yield http_js_1.spoonacularHttp.get(`search?query=${name}&number=1&apiKey=${spoonacularAPIKey}`);
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
});
exports.searchIngredient = searchIngredient;
const getIngredientInformation = (ingrId, unit, spoonacularAPIKey) => __awaiter(void 0, void 0, void 0, function* () {
    let ingrData;
    try {
        ingrData = yield http_js_1.spoonacularHttp.get(`${ingrId}/information?amount=1&${unit ? 'unit=grams&' : ''}apiKey=${spoonacularAPIKey}`);
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
});
exports.getIngredientInformation = getIngredientInformation;
