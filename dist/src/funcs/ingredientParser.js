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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const calculatePrice_js_1 = require("./calculatePrice.js");
const parseIngredientString_js_1 = require("./parseIngredientString.js");
const getIngredientInfo_js_1 = require("./getIngredientInfo.js");
const ingredientParser = (ingrString, spoonacularAPIKey, options) => __awaiter(void 0, void 0, void 0, function* () {
    // const parsedIngr: ParsedIngredient = parse(ingrString, 'eng')
    const parsedIngr = (0, parseIngredientString_js_1.parseIngredientString)(ingrString);
    let ingrData = null;
    try {
        ingrData = yield (0, getIngredientInfo_js_1.getIngredientInfo)(parsedIngr.ingredient || '', spoonacularAPIKey);
    }
    catch (error) {
        return {
            error: { message: error.message },
            ingredientData: null,
            parsedIngredient: parsedIngr !== null && parsedIngr !== void 0 ? parsedIngr : null,
        };
    }
    if (parsedIngr.ingredient && ingrData) {
        const { estimatedPrices, meta, categoryPath, unit, unitShort, unitLong, original, id, nutrition } = ingrData, reducedIngrData = __rest(ingrData, ["estimatedPrices", "meta", "categoryPath", "unit", "unitShort", "unitLong", "original", "id", "nutrition"]);
        const totalPrice = (0, calculatePrice_js_1.calculatePrice)(parsedIngr.quantity, parsedIngr.unit, estimatedPrices);
        const imagePath = `https://spoonacular.com/cdn/ingredients_100x100/${reducedIngrData.image}`;
        const updatedIngrData = Object.assign(Object.assign(Object.assign({}, reducedIngrData), { imagePath, totalPriceUSACents: totalPrice }), ((options === null || options === void 0 ? void 0 : options.returnNutritionData) && { nutrition }));
        return {
            ingredientData: updatedIngrData,
            parsedIngredient: parsedIngr,
        };
    }
    else {
        return {
            error: {
                message: 'Ingredient not formatted correctly or Ingredient Unknown. Please pass ingredient comments/instructions after a comma',
            },
            ingredientData: null,
            parsedIngredient: parsedIngr,
        };
    }
});
exports.default = ingredientParser;
