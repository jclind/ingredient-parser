import { KrogerConfig } from '../../types.js';
/** A normalized Kroger price lookup, ready to be bridged into IngredientData. */
export interface KrogerPriceLookup {
    /** Store/banner label, e.g. "Ralphs". */
    store: string | null;
    /** locationId the price came from — also the cache partition key. */
    locationId: string;
    /** Product description that was matched. */
    matchedProduct: string | null;
    /** Shelf price for the whole package, in USD dollars. */
    regular: number | null;
    /** Promo price in USD dollars if active, else null. */
    promo: number | null;
    /** Effective (promo ?? regular) price per base unit, in USD dollars. */
    perUnit: number | null;
    /** Base unit perUnit is expressed in ("oz" | "g" | "fl oz" | "ml" | "ct"). */
    unit: string | null;
}
export interface KrogerClientOptions {
    config: KrogerConfig;
    /** Pre-resolved store id; if absent, resolved from `zipCode` on first use. */
    locationId?: string;
    zipCode?: string;
}
/**
 * Live retail prices from a Kroger-banner store nearest a zip code. One instance
 * is held by the client factory so the OAuth token and resolved store persist
 * across lookups.
 */
export declare class KrogerClient {
    private readonly opts;
    private readonly http;
    private readonly tokens;
    private locationId;
    private storeLabel;
    private locationPromise;
    constructor(opts: KrogerClientOptions);
    private requestToken;
    private authHeaders;
    /** Resolve (and cache) the nearest store id. Pricing requires a locationId. */
    private resolveLocation;
    /** Resolve the nearest store id (memoized), or null if none/failed. The
     *  caller needs this as the cache partition key before hitting Kroger. */
    ensureLocationId(): Promise<string | null>;
    /**
     * Look up the best-matching product price for `ingredient`. Returns null when
     * there is no store in range, no product match, or the request fails — every
     * one of which should trigger the caller's Spoonacular fallback.
     */
    getPrice(ingredient: string): Promise<KrogerPriceLookup | null>;
    /** The resolved store label, if a lookup has resolved one. */
    get store(): string | null;
}
