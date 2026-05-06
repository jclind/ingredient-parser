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
exports.getIngredientInfo = getIngredientInfo;
const requests_js_1 = require("../api/requests.js");
const getSpoonacularIngrData_js_1 = require("./getSpoonacularIngrData.js");
function getIngredientInfo(ingredientName, spoonacularAPIKey, serverUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        const cached = yield (0, requests_js_1.getIngredientFromServer)(ingredientName, serverUrl);
        if (cached)
            return cached;
        const spoonacularData = yield (0, getSpoonacularIngrData_js_1.getSpoonacularIngrData)(ingredientName, spoonacularAPIKey);
        if (!spoonacularData)
            return null;
        (0, requests_js_1.saveIngredientToServer)(ingredientName, spoonacularData, serverUrl);
        return spoonacularData;
    });
}
