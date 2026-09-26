/**
 * Score how well a candidate product description matches the requested
 * ingredient term. Higher is better. The score is the fraction of query tokens
 * found in the candidate, with a small bonus for an exact phrase hit.
 *
 * This is deliberately simple: good-enough fuzzy ranking without a dependency.
 */
const STOP_WORDS = new Set(['the', 'a', 'an', 'of', 'and', 'with', 'fresh'])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP_WORDS.has(t))
}

export function scoreMatch(query: string, candidate: string): number {
  const queryTokens = tokenize(query)
  if (queryTokens.length === 0) return 0
  const candidateTokens = new Set(tokenize(candidate))

  let hits = 0
  for (const token of queryTokens) {
    if (candidateTokens.has(token)) hits++
  }
  let score = hits / queryTokens.length

  // Bonus when the whole query phrase appears in the candidate.
  if (candidate.toLowerCase().includes(query.trim().toLowerCase())) {
    score += 0.25
  }
  return score
}

export interface RankableProduct<T> {
  value: T
  description: string
  /** Whether this product actually has a usable price. */
  hasPrice: boolean
}

/**
 * Pick the best product for a query. Products with a price always beat those
 * without; ties break on match score. Returns null if nothing scores above a
 * small floor.
 */
export function pickBest<T>(
  query: string,
  products: RankableProduct<T>[]
): T | null {
  let best: { value: T; score: number; hasPrice: boolean } | null = null

  for (const product of products) {
    const score = scoreMatch(query, product.description)
    if (score <= 0) continue
    if (
      best === null ||
      (product.hasPrice && !best.hasPrice) ||
      (product.hasPrice === best.hasPrice && score > best.score)
    ) {
      best = { value: product.value, score, hasPrice: product.hasPrice }
    }
  }

  return best ? best.value : null
}
