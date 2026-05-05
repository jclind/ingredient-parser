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
exports.getSpoonacularIngrData = getSpoonacularIngrData;
const requests_js_1 = require("../api/requests.js");
function getSpoonacularIngrData(name, spoonacularAPIKey) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g;
        const searchedIngr = yield (0, requests_js_1.searchIngredient)(name, spoonacularAPIKey);
        const ingrId = (_c = (_b = (_a = searchedIngr === null || searchedIngr === void 0 ? void 0 : searchedIngr.data) === null || _a === void 0 ? void 0 : _a.results[0]) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : null;
        if (!ingrId)
            throw new Error(`No Data Found, unknown ingredient: ${name}`);
        const [ingrDataGram, ingrDataSingleUnit] = yield Promise.all([
            (0, requests_js_1.getIngredientInformation)(ingrId, true, spoonacularAPIKey),
            (0, requests_js_1.getIngredientInformation)(ingrId, false, spoonacularAPIKey),
        ]);
        const estimatedGramPrice = (_e = (_d = ingrDataGram.data.estimatedCost) === null || _d === void 0 ? void 0 : _d.value) !== null && _e !== void 0 ? _e : 0;
        const estimatedSingleUnitPrice = (_g = (_f = ingrDataSingleUnit.data.estimatedCost) === null || _f === void 0 ? void 0 : _f.value) !== null && _g !== void 0 ? _g : 0;
        const ingrData = Object.assign(Object.assign({}, ingrDataGram.data), { name, ingredientId: ingrId, estimatedPrices: { estimatedGramPrice, estimatedSingleUnitPrice } });
        return ingrData;
    });
}
