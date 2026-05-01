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
function getIngredientInfo(ingrName, spoonacularAPIKey) {
    return __awaiter(this, void 0, void 0, function* () {
        const ingrNameLower = ingrName.toLowerCase();
        if (!ingrNameLower)
            throw new Error('Ingredient Invalid');
        let mongoIngrData = null;
        try {
            mongoIngrData = yield (0, requests_js_1.checkIngredient)(ingrNameLower);
        }
        catch (_a) {
            // MongoDB cache unavailable — fall through to Spoonacular
        }
        if (!(mongoIngrData === null || mongoIngrData === void 0 ? void 0 : mongoIngrData.data)) {
            const ingrData = yield (0, getSpoonacularIngrData_js_1.getSpoonacularIngrData)(ingrNameLower, spoonacularAPIKey);
            return ingrData;
        }
        else {
            return mongoIngrData.data;
        }
    });
}
