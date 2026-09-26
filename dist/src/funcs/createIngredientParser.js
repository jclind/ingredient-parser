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
exports.createIngredientParser = createIngredientParser;
const parseIngredientString_js_1 = require("./parseIngredientString.js");
const getIngredientInfo_js_1 = require("./getIngredientInfo.js");
const calculatePrice_js_1 = require("./calculatePrice.js");
const krogerPrice_js_1 = require("./krogerPrice.js");
const buildIngredientData_js_1 = require("./buildIngredientData.js");
const krogerClient_js_1 = require("../kroger/krogerClient.js");
const krogerCacheRequests_js_1 = require("../api/krogerCacheRequests.js");
const DAY_MS = 24 * 60 * 60 * 1000;
const UNKNOWN_INGREDIENT_MESSAGE = 'Ingredient not formatted correctly or Ingredient Unknown. Please pass ingredient comments/instructions after a comma';
function isFresh(data, ttlMs) {
    const ts = Date.parse(data.fetchedAt);
    if (!Number.isFinite(ts))
        return false;
    return Date.now() - ts < ttlMs;
}
/**
 * Build a Kroger-aware ingredient parser. Holds the Kroger OAuth token and
 * resolved store across calls. When `config.kroger` is omitted it behaves like
 * the legacy Spoonacular-only parser.
 */
function createIngredientParser(config) {
    var _a;
    const kroger = config.kroger
        ? new krogerClient_js_1.KrogerClient({
            config: config.kroger,
            zipCode: config.zipCode,
            locationId: config.locationId,
        })
        : null;
    const ttlMs = (_a = config.krogerCacheTtlMs) !== null && _a !== void 0 ? _a : DAY_MS;
    /** Spoonacular estimate — the graceful fallback price. */
    function spoonacularPrice(parsedIngr, estimatedPrices) {
        const total = estimatedPrices
            ? (0, calculatePrice_js_1.calculatePrice)(parsedIngr.quantity, parsedIngr.unit, estimatedPrices)
            : null;
        return Object.assign({ totalPriceUSACents: total }, (total !== null && { priceSource: 'spoonacular' }));
    }
    /** Live (or server-cached) Kroger price, or null to trigger the fallback. */
    function tryKroger(parsedIngr, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!kroger)
                return null;
            const name = parsedIngr.ingredient || '';
            if (!name)
                return null;
            const locationId = yield kroger.ensureLocationId();
            if (!locationId)
                return null;
            let data = null;
            if (!(options === null || options === void 0 ? void 0 : options.fresh)) {
                const cached = yield (0, krogerCacheRequests_js_1.getKrogerPriceFromServer)(locationId, name, config.serverUrl);
                if (cached && isFresh(cached, ttlMs))
                    data = cached;
            }
            if (!data) {
                const lookup = yield kroger.getPrice(name);
                if (!lookup)
                    return null;
                data = Object.assign(Object.assign({}, lookup), { fetchedAt: new Date().toISOString() });
                (0, krogerCacheRequests_js_1.saveKrogerPriceToServer)(name, data, config.serverUrl);
            }
            const total = (0, krogerPrice_js_1.krogerTotalPriceCents)(parsedIngr.quantity, parsedIngr.unit, data);
            if (total === null)
                return null; // matched but no usable price → fall back
            return {
                totalPriceUSACents: total,
                priceSource: 'kroger',
                store: data.store,
                matchedProduct: data.matchedProduct,
            };
        });
    }
    function parse(ingrString, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const parsedIngr = (0, parseIngredientString_js_1.parseIngredientString)(ingrString);
            let ingrData = null;
            try {
                ingrData = yield (0, getIngredientInfo_js_1.getIngredientInfo)(parsedIngr.ingredient || '', config.spoonacularAPIKey, config.serverUrl);
            }
            catch (error) {
                return {
                    error: { message: error.message },
                    ingredientData: null,
                    parsedIngredient: parsedIngr,
                };
            }
            if (!parsedIngr.ingredient || !ingrData) {
                return {
                    error: { message: UNKNOWN_INGREDIENT_MESSAGE },
                    ingredientData: null,
                    parsedIngredient: parsedIngr,
                };
            }
            let krogerPrice = null;
            try {
                krogerPrice = yield tryKroger(parsedIngr, options);
            }
            catch (_a) {
                // Any unexpected Kroger failure degrades to the Spoonacular estimate.
                krogerPrice = null;
            }
            const price = krogerPrice !== null && krogerPrice !== void 0 ? krogerPrice : spoonacularPrice(parsedIngr, ingrData.estimatedPrices);
            return {
                ingredientData: (0, buildIngredientData_js_1.buildIngredientData)(ingrData, options, price),
                parsedIngredient: parsedIngr,
            };
        });
    }
    return { parse };
}
