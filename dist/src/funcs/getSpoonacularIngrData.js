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
exports.getSpoonacularIngrData = void 0;
const requests_js_1 = require("../api/requests.js");
function getSpoonacularIngrData(name, spoonacularAPIKey) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        const searchedIngr = yield (0, requests_js_1.searchIngredient)(name, spoonacularAPIKey);
        if (searchedIngr.error)
            return searchedIngr;
        const ingrId = (_c = (_b = (_a = searchedIngr === null || searchedIngr === void 0 ? void 0 : searchedIngr.data) === null || _a === void 0 ? void 0 : _a.results[0]) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : null;
        if (!ingrId)
            throw new Error(`No Data Found, unknown ingredient: ${name}`);
        const ingrDataGram = yield (0, requests_js_1.getIngredientInformation)(ingrId, true, spoonacularAPIKey);
        const ingrDataSingleUnit = yield (0, requests_js_1.getIngredientInformation)(ingrId, false, spoonacularAPIKey);
        if (ingrDataGram.error || ingrDataSingleUnit.error)
            return ingrDataGram;
        const estimatedGramPrice = ingrDataGram.data.estimatedCost.value;
        const estimatedSingleUnitPrice = ingrDataSingleUnit.data.estimatedCost.value;
        const ingrData = Object.assign(Object.assign({}, ingrDataGram.data), { name, ingredientId: ingrId, estimatedPrices: { estimatedGramPrice, estimatedSingleUnitPrice } });
        const mongoDBIngrData = ingrData;
        const mongoRes = yield (0, requests_js_1.setMongoDBIngrData)(mongoDBIngrData);
        const _id = mongoRes.data.insertedId;
        return Object.assign(Object.assign({}, mongoDBIngrData), { _id });
    });
}
exports.getSpoonacularIngrData = getSpoonacularIngrData;
