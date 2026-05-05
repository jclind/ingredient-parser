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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIngredientInformation = exports.searchIngredient = exports.parseAndEnrich = void 0;
const axios_1 = __importDefault(require("axios"));
const http_js_1 = require("./http.js");
function handleRequestError(error) {
    var _a, _b, _c;
    if (axios_1.default.isAxiosError(error)) {
        const status = (_a = error.response) === null || _a === void 0 ? void 0 : _a.status;
        const code = (_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.code;
        if (status === 401 || code === 401)
            throw new Error('API Key Not Valid');
        if (status === 429)
            throw new Error('Rate limit exceeded, please try again later');
        if (error.response)
            throw new Error('Error Occurred, Please Try Again');
        throw new Error('Network error, please try again');
    }
    throw new Error('Network error, please try again');
}
const parseAndEnrich = (ingredientString, spoonacularApiKey, serverUrl) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const serverHttp = (0, http_js_1.createIngredientServerHttp)(serverUrl);
        const response = yield serverHttp.post('/parse', {
            ingredientString,
            spoonacularApiKey,
        });
        return (_a = response.data.data) !== null && _a !== void 0 ? _a : null;
    }
    catch (error) {
        handleRequestError(error);
    }
});
exports.parseAndEnrich = parseAndEnrich;
const searchIngredient = (name, spoonacularAPIKey) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        return yield http_js_1.spoonacularHttp.get(`search?query=${name}&number=1&apiKey=${spoonacularAPIKey}`);
    }
    catch (error) {
        handleRequestError(error);
    }
});
exports.searchIngredient = searchIngredient;
const getIngredientInformation = (ingrId, unit, spoonacularAPIKey) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        return yield http_js_1.spoonacularHttp.get(`${ingrId}/information?amount=1&${unit ? 'unit=grams&' : ''}apiKey=${spoonacularAPIKey}`);
    }
    catch (error) {
        handleRequestError(error);
    }
});
exports.getIngredientInformation = getIngredientInformation;
