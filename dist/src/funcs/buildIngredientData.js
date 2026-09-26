"use strict";
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
exports.buildIngredientData = buildIngredientData;
/**
 * Reduce a raw enriched ingredient record (Spoonacular metadata) plus a
 * resolved price into the public `IngredientData` shape. Mirrors the assembly
 * in the legacy `ingredientParser`, with the v2 additive price fields.
 */
function buildIngredientData(ingrData, options, price) {
    var _a;
    const { estimatedPrices, meta, categoryPath, unit, unitShort, unitLong, original, id, nutrition } = ingrData, reducedIngrData = __rest(ingrData, ["estimatedPrices", "meta", "categoryPath", "unit", "unitShort", "unitLong", "original", "id", "nutrition"]);
    const imageSize = (_a = options === null || options === void 0 ? void 0 : options.imageSize) !== null && _a !== void 0 ? _a : '100x100';
    const imagePath = `https://spoonacular.com/cdn/ingredients_${imageSize}/${reducedIngrData.image}`;
    return Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, reducedIngrData), { imagePath }), (price.totalPriceUSACents !== null && Object.assign({ totalPriceUSACents: price.totalPriceUSACents }, (price.priceSource && { priceSource: price.priceSource })))), (price.store != null && { store: price.store })), (price.matchedProduct != null && { matchedProduct: price.matchedProduct })), ((options === null || options === void 0 ? void 0 : options.returnNutritionData) && { nutrition }));
}
