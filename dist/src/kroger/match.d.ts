export declare function scoreMatch(query: string, candidate: string): number;
export interface RankableProduct<T> {
    value: T;
    description: string;
    /** Whether this product actually has a usable price. */
    hasPrice: boolean;
}
/**
 * Pick the best product for a query. Products with a price always beat those
 * without; ties break on match score. Returns null if nothing scores above a
 * small floor.
 */
export declare function pickBest<T>(query: string, products: RankableProduct<T>[]): T | null;
