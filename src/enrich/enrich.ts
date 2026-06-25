// Enrichment orchestration.
//
// Architecture (DESIGN §6): the client never holds a provider API key. It talks
// to a proxy that holds the key, hits the provider, and caches per-name results.
// The proxy is reached through an injectable `Transport` (fetch-compatible) so
// the whole flow is unit-testable with a fake — no live server needed.

import type { ParsedIngredientV2 } from '../core/types.js'
import { calculatePrice, type ToGrams } from './price.js'
import { makeDensityToGrams } from './volume.js'
import { buildImageUrl } from './spoonacular.js'
import type {
  IngredientData,
  IngredientProvider,
  ImageSize,
  NeutralIngredient,
} from './types.js'

const DEFAULT_SERVER_URL =
  'https://ingredient-parser-service-production-2635.up.railway.app'

export interface TransportResponse {
  ok: boolean
  status: number
  json(): Promise<unknown>
}
export type Transport = (url: string) => Promise<TransportResponse>

/** Raised for transport/proxy failures (distinct from a clean "not found"). */
export class EnrichError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message)
    this.name = 'EnrichError'
  }
}

export interface EnricherOptions {
  serverUrl?: string
  transport?: Transport
  imageSize?: ImageSize
  includeNutrition?: boolean
  includeRaw?: boolean
  /** override the unit→grams converter (defaults to mass-only) */
  toGrams?: ToGrams
  /**
   * On a lookup miss, retry with progressively shorter names by dropping leading
   * modifier words ("boneless chicken breast" → "chicken breast" → "breast").
   * The real proxy is an exact-match cache, so richer parsed names miss without
   * this. Default: true. Set false to look up only the exact parsed name.
   */
  nameFallbacks?: boolean
}

// Cap the fallback attempts so a pathologically long name can't fan out into
// many sequential lookups. Real ingredient names are ≤4 words.
const MAX_NAME_CANDIDATES = 4

/**
 * Lookup candidates from most- to least-specific: the full name, then the same
 * with each leading word dropped. English head nouns trail ("olive oil" → "oil"),
 * so dropping from the front preserves the most meaningful remainder.
 */
export function nameCandidates(name: string): string[] {
  const words = name.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean)
  if (words.length === 0) return []
  const out: string[] = []
  for (let i = 0; i < words.length && out.length < MAX_NAME_CANDIDATES; i++) {
    out.push(words.slice(i).join(' '))
  }
  return out
}

const defaultTransport: Transport = (url: string) =>
  (globalThis as unknown as { fetch: Transport }).fetch(url)

/**
 * Proxy-backed provider. Calls the server's `/v2/ingredient/:name` route, which
 * returns the vendor-neutral shape (`{ data: NeutralIngredient | null }`). The
 * server owns vendor mapping; the client only resolves the image URL at its
 * chosen size and applies the `includeNutrition` preference.
 */
export function createProxyProvider(opts: EnricherOptions = {}): IngredientProvider {
  const serverUrl = (opts.serverUrl ?? DEFAULT_SERVER_URL).replace(/\/$/, '')
  const transport = opts.transport ?? defaultTransport

  return {
    async lookup(name) {
      const url = `${serverUrl}/v2/ingredient/${encodeURIComponent(name)}`
      let res: TransportResponse
      try {
        res = await transport(url)
      } catch (err) {
        throw new EnrichError(
          `Network error contacting ingredient proxy: ${(err as Error).message}`
        )
      }
      if (res.status === 404) return null
      if (!res.ok) throw new EnrichError('Ingredient proxy request failed', res.status)

      const body = (await res.json()) as { data?: NeutralIngredient | null } | null
      const n = body?.data
      if (!n || !n.name) return null

      return {
        data: {
          name: n.name,
          category: n.category ?? null,
          image: buildImageUrl(n.imageFilename ?? null, opts.imageSize),
          possibleUnits: Array.isArray(n.possibleUnits) ? n.possibleUnits : [],
          nutrition: opts.includeNutrition ? (n.nutrition ?? null) : null,
          ...(opts.includeRaw ? { raw: n } : {}),
        },
        estimatedPrices: n.estimatedPrices ?? {},
      }
    },
  }
}

/**
 * Build an `enrich(parsed)` function. Looks the parsed ingredient name up via
 * the provider and attaches a quantity-aware `price`. Returns `null` when the
 * ingredient can't be looked up or isn't found.
 */
export function createEnricher(
  opts: EnricherOptions & { provider?: IngredientProvider } = {}
): (parsed: ParsedIngredientV2) => Promise<IngredientData | null> {
  const provider = opts.provider ?? createProxyProvider(opts)

  return async (parsed) => {
    const name = parsed.ingredient.name.trim()
    if (!name) return null

    // Try the full name first, then fall back to progressively shorter names so
    // a richer parsed name ("boneless chicken breast") can still hit a cache that
    // only indexes the base noun ("chicken breast"). First hit wins.
    const candidates = opts.nameFallbacks === false ? [name] : nameCandidates(name)
    let result = null
    for (const candidate of candidates) {
      result = await provider.lookup(candidate)
      if (result) break
    }
    if (!result) return null

    // Default to a density-aware converter bound to this ingredient, so volume
    // units (cup of flour) get an estimated gram price; opt out via opts.toGrams.
    const toGrams: ToGrams = opts.toGrams ?? makeDensityToGrams(name)
    const price = calculatePrice(
      parsed.quantity.value,
      parsed.unit,
      result.estimatedPrices,
      toGrams
    )

    return { ...result.data, price }
  }
}
