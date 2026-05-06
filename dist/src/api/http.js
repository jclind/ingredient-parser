"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIngredientServerHttp = exports.spoonacularHttp = void 0;
const axios_1 = __importDefault(require("axios"));
// Webpack 5 can resolve require("axios") to the ESM entry without setting
// __esModule, causing __importDefault to double-wrap it. The result is that
// _axios is the module namespace object rather than the axios instance, so
// .create lands one level deeper than expected.
const axios = typeof axios_1.default.create === 'function'
    ? axios_1.default
    : axios_1.default.default;
const DEFAULT_SERVER_URL = 'https://ingredient-parser-service-production-2635.up.railway.app';
exports.spoonacularHttp = axios.create({
    baseURL: 'https://api.spoonacular.com/food/ingredients/',
    headers: {
        'Content-type': 'application/json',
    },
    timeout: 8000,
});
const createIngredientServerHttp = (serverUrl) => axios.create({
    baseURL: serverUrl || DEFAULT_SERVER_URL,
    headers: {
        'Content-type': 'application/json',
    },
    timeout: 8000,
});
exports.createIngredientServerHttp = createIngredientServerHttp;
