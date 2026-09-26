import { KrogerPriceData } from '../../types.js';
/**
 * Read a cached Kroger price for a store + ingredient name. Any server error is
 * treated as a cache miss so a live Kroger lookup can take over.
 */
export declare const getKrogerPriceFromServer: (locationId: string, name: string, serverUrl?: string) => Promise<KrogerPriceData | null>;
/**
 * Persist a freshly fetched Kroger price. Fire-and-forget — a failed write must
 * not affect the caller. `priceData.locationId` is the store partition key.
 */
export declare const saveKrogerPriceToServer: (name: string, priceData: KrogerPriceData, serverUrl?: string) => void;
