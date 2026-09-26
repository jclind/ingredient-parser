"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.KrogerClient = void 0;
const axios_1 = __importStar(require("axios"));
const tokenStore_js_1 = require("./tokenStore.js");
const match_js_1 = require("./match.js");
const units_js_1 = require("./units.js");
// Same webpack-double-wrap guard the rest of the package uses (see api/http.ts).
const axios = typeof axios_1.default.create === 'function'
    ? axios_1.default
    : axios_1.default.default;
const DEFAULT_BASE = 'https://api.kroger.com/v1';
/**
 * Live retail prices from a Kroger-banner store nearest a zip code. One instance
 * is held by the client factory so the OAuth token and resolved store persist
 * across lookups.
 */
class KrogerClient {
    constructor(opts) {
        var _a;
        this.opts = opts;
        this.storeLabel = null;
        this.locationPromise = null;
        this.http = axios.create({
            baseURL: (_a = opts.config.baseUrl) !== null && _a !== void 0 ? _a : DEFAULT_BASE,
            timeout: 8000,
        });
        this.locationId = opts.locationId;
        this.tokens = new tokenStore_js_1.TokenStore(() => this.requestToken());
    }
    requestToken() {
        return __awaiter(this, void 0, void 0, function* () {
            const creds = Buffer.from(`${this.opts.config.clientId}:${this.opts.config.clientSecret}`).toString('base64');
            const res = yield this.http.post('/connect/oauth2/token', 'grant_type=client_credentials&scope=product.compact', {
                headers: {
                    Authorization: `Basic ${creds}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            const json = res.data;
            return { accessToken: json.access_token, expiresInSec: json.expires_in };
        });
    }
    authHeaders() {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                Authorization: `Bearer ${yield this.tokens.get()}`,
                Accept: 'application/json',
            };
        });
    }
    /** Resolve (and cache) the nearest store id. Pricing requires a locationId. */
    resolveLocation() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.locationId)
                return this.locationId;
            if (this.locationPromise)
                return this.locationPromise;
            const zip = this.opts.zipCode;
            if (!zip) {
                throw new Error('KrogerClient needs a zipCode or locationId to fetch prices.');
            }
            this.locationPromise = (() => __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c;
                const res = yield this.http.get('/locations', {
                    headers: yield this.authHeaders(),
                    params: { 'filter.zip.code.near': zip, 'filter.limit': 1 },
                });
                const json = res.data;
                const first = (_a = json.data) === null || _a === void 0 ? void 0 : _a[0];
                if (!first) {
                    throw new Error(`No Kroger-banner store found near zip ${zip}.`);
                }
                this.locationId = first.locationId;
                this.storeLabel = (_c = (_b = first.name) !== null && _b !== void 0 ? _b : first.chain) !== null && _c !== void 0 ? _c : `Kroger #${first.locationId}`;
                return first.locationId;
            }))().finally(() => {
                this.locationPromise = null;
            });
            return this.locationPromise;
        });
    }
    /** Resolve the nearest store id (memoized), or null if none/failed. The
     *  caller needs this as the cache partition key before hitting Kroger. */
    ensureLocationId() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.resolveLocation();
            }
            catch (_a) {
                return null;
            }
        });
    }
    /**
     * Look up the best-matching product price for `ingredient`. Returns null when
     * there is no store in range, no product match, or the request fails — every
     * one of which should trigger the caller's Spoonacular fallback.
     */
    getPrice(ingredient) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            let locationId;
            try {
                locationId = yield this.resolveLocation();
            }
            catch (_j) {
                return null;
            }
            let products;
            try {
                const res = yield this.http.get('/products', {
                    headers: yield this.authHeaders(),
                    params: {
                        'filter.term': ingredient,
                        'filter.locationId': locationId,
                        'filter.limit': 15,
                    },
                });
                const json = res.data;
                products = (_a = json.data) !== null && _a !== void 0 ? _a : [];
            }
            catch (err) {
                // A 401 means the token went stale between calls — invalidate so the next
                // lookup mints a fresh one — then bail to the fallback.
                if ((0, axios_1.isAxiosError)(err) && ((_b = err.response) === null || _b === void 0 ? void 0 : _b.status) === 401) {
                    this.tokens.invalidate();
                }
                return null;
            }
            const rankable = products.map(p => {
                var _a, _b, _c, _d;
                return ({
                    value: p,
                    description: (_a = p.description) !== null && _a !== void 0 ? _a : '',
                    hasPrice: typeof ((_d = (_c = (_b = p.items) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.price) === null || _d === void 0 ? void 0 : _d.regular) === 'number',
                });
            });
            const best = (0, match_js_1.pickBest)(ingredient, rankable);
            if (!best)
                return null;
            const item = (_c = best.items) === null || _c === void 0 ? void 0 : _c[0];
            const regular = typeof ((_d = item === null || item === void 0 ? void 0 : item.price) === null || _d === void 0 ? void 0 : _d.regular) === 'number' ? item.price.regular : null;
            const promo = typeof ((_e = item === null || item === void 0 ? void 0 : item.price) === null || _e === void 0 ? void 0 : _e.promo) === 'number' && item.price.promo > 0
                ? item.price.promo
                : null;
            const effective = promo !== null && promo !== void 0 ? promo : regular;
            const per = effective !== null ? (0, units_js_1.perUnitPrice)(effective, item === null || item === void 0 ? void 0 : item.size) : null;
            return {
                store: this.storeLabel,
                locationId,
                matchedProduct: (_f = best.description) !== null && _f !== void 0 ? _f : null,
                regular,
                promo,
                perUnit: (_g = per === null || per === void 0 ? void 0 : per.perUnit) !== null && _g !== void 0 ? _g : null,
                unit: (_h = per === null || per === void 0 ? void 0 : per.unit) !== null && _h !== void 0 ? _h : null,
            };
        });
    }
    /** The resolved store label, if a lookup has resolved one. */
    get store() {
        return this.storeLabel;
    }
}
exports.KrogerClient = KrogerClient;
