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
exports.TokenStore = void 0;
/**
 * Caches a single OAuth bearer token and refreshes it only when it is missing
 * or within `skewMs` of expiring. Concurrent callers share one in-flight
 * refresh so we never request two tokens at once.
 */
class TokenStore {
    constructor(refresh, skewMs = 30000) {
        this.refresh = refresh;
        this.skewMs = skewMs;
        this.token = null;
        this.expiresAt = 0;
        this.pending = null;
    }
    get() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.token && Date.now() < this.expiresAt - this.skewMs) {
                return this.token;
            }
            if (this.pending)
                return this.pending;
            this.pending = this.refresh()
                .then(({ accessToken, expiresInSec }) => {
                this.token = accessToken;
                this.expiresAt = Date.now() + expiresInSec * 1000;
                return accessToken;
            })
                .finally(() => {
                this.pending = null;
            });
            return this.pending;
        });
    }
    /** Force the next get() to refresh — call this after a 401. */
    invalidate() {
        this.token = null;
        this.expiresAt = 0;
    }
}
exports.TokenStore = TokenStore;
