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
exports.saveKrogerPriceToServer = exports.getKrogerPriceFromServer = void 0;
const http_js_1 = require("./http.js");
/**
 * Read a cached Kroger price for a store + ingredient name. Any server error is
 * treated as a cache miss so a live Kroger lookup can take over.
 */
const getKrogerPriceFromServer = (locationId, name, serverUrl) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const serverHttp = (0, http_js_1.createIngredientServerHttp)(serverUrl);
        const response = yield serverHttp.get(`/kroger-price/${encodeURIComponent(locationId)}/${encodeURIComponent(name)}`);
        return (_a = response.data.data) !== null && _a !== void 0 ? _a : null;
    }
    catch (_b) {
        return null;
    }
});
exports.getKrogerPriceFromServer = getKrogerPriceFromServer;
/**
 * Persist a freshly fetched Kroger price. Fire-and-forget — a failed write must
 * not affect the caller. `priceData.locationId` is the store partition key.
 */
const saveKrogerPriceToServer = (name, priceData, serverUrl) => {
    const serverHttp = (0, http_js_1.createIngredientServerHttp)(serverUrl);
    serverHttp.post('/kroger-price', { name, priceData }).catch(() => {
        // Fire-and-forget.
    });
};
exports.saveKrogerPriceToServer = saveKrogerPriceToServer;
