/**
 * Caches a single OAuth bearer token and refreshes it only when it is missing
 * or within `skewMs` of expiring. Concurrent callers share one in-flight
 * refresh so we never request two tokens at once.
 */
export declare class TokenStore {
    private readonly refresh;
    private readonly skewMs;
    private token;
    private expiresAt;
    private pending;
    constructor(refresh: () => Promise<{
        accessToken: string;
        expiresInSec: number;
    }>, skewMs?: number);
    get(): Promise<string>;
    /** Force the next get() to refresh — call this after a 401. */
    invalidate(): void;
}
