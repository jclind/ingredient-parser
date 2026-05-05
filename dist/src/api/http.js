"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIngredientServerHttp = exports.spoonacularHttp = void 0;
const axios_1 = __importDefault(require("axios"));
const DEFAULT_SERVER_URL = 'https://ingredient-parser-service-production-2635.up.railway.app';
exports.spoonacularHttp = axios_1.default.create({
    baseURL: 'https://api.spoonacular.com/food/ingredients/',
    headers: {
        'Content-type': 'application/json',
    },
});
const createIngredientServerHttp = (serverUrl) => axios_1.default.create({
    baseURL: serverUrl || DEFAULT_SERVER_URL,
    headers: {
        'Content-type': 'application/json',
    },
});
exports.createIngredientServerHttp = createIngredientServerHttp;
