import { parseIngredientString } from './parseIngredientString.js'
import { getIngredientInfo } from './getIngredientInfo.js'
import { calculatePrice } from './calculatePrice.js'
import { krogerTotalPriceCents } from './krogerPrice.js'
import { buildIngredientData, PriceInfo } from './buildIngredientData.js'
import { KrogerClient } from '../kroger/krogerClient.js'
import {
  getKrogerPriceFromServer,
  saveKrogerPriceToServer,
} from '../api/krogerCacheRequests.js'
import {
  IngredientParserConfig,
  IngredientResponse,
  KrogerPriceData,
  ParseOptions,
  ParsedIngredient,
} from '../../types.js'

const DAY_MS = 24 * 60 * 60 * 1000

export interface IngredientParserClient {
  /**
   * Parse + enrich one ingredient string. Same I/O contract as the legacy
   * `ingredientParser`, but `totalPriceUSACents` is a real Kroger shelf price
   * when one can be matched, falling back to Spoonacular's estimate otherwise.
   */
  parse(
    ingrString: string,
    options?: ParseOptions
  ): Promise<IngredientResponse>
}

const UNKNOWN_INGREDIENT_MESSAGE =
  'Ingredient not formatted correctly or Ingredient Unknown. Please pass ingredient comments/instructions after a comma'

function isFresh(data: KrogerPriceData, ttlMs: number): boolean {
  const ts = Date.parse(data.fetchedAt)
  if (!Number.isFinite(ts)) return false
  return Date.now() - ts < ttlMs
}

/**
 * Build a Kroger-aware ingredient parser. Holds the Kroger OAuth token and
 * resolved store across calls. When `config.kroger` is omitted it behaves like
 * the legacy Spoonacular-only parser.
 */
export function createIngredientParser(
  config: IngredientParserConfig
): IngredientParserClient {
  const kroger = config.kroger
    ? new KrogerClient({
        config: config.kroger,
        zipCode: config.zipCode,
        locationId: config.locationId,
      })
    : null
  const ttlMs = config.krogerCacheTtlMs ?? DAY_MS

  /** Spoonacular estimate — the graceful fallback price. */
  function spoonacularPrice(
    parsedIngr: ParsedIngredient,
    estimatedPrices: { estimatedGramPrice?: number; estimatedSingleUnitPrice?: number } | undefined
  ): PriceInfo {
    const total = estimatedPrices
      ? calculatePrice(parsedIngr.quantity, parsedIngr.unit, estimatedPrices)
      : null
    return {
      totalPriceUSACents: total,
      ...(total !== null && { priceSource: 'spoonacular' as const }),
    }
  }

  /** Live (or server-cached) Kroger price, or null to trigger the fallback. */
  async function tryKroger(
    parsedIngr: ParsedIngredient,
    options?: ParseOptions
  ): Promise<PriceInfo | null> {
    if (!kroger) return null
    const name = parsedIngr.ingredient || ''
    if (!name) return null

    const locationId = await kroger.ensureLocationId()
    if (!locationId) return null

    let data: KrogerPriceData | null = null
    if (!options?.fresh) {
      const cached = await getKrogerPriceFromServer(locationId, name, config.serverUrl)
      if (cached && isFresh(cached, ttlMs)) data = cached
    }

    if (!data) {
      const lookup = await kroger.getPrice(name)
      if (!lookup) return null
      data = { ...lookup, fetchedAt: new Date().toISOString() }
      saveKrogerPriceToServer(name, data, config.serverUrl)
    }

    const total = krogerTotalPriceCents(parsedIngr.quantity, parsedIngr.unit, data)
    if (total === null) return null // matched but no usable price → fall back

    return {
      totalPriceUSACents: total,
      priceSource: 'kroger',
      store: data.store,
      matchedProduct: data.matchedProduct,
    }
  }

  async function parse(
    ingrString: string,
    options?: ParseOptions
  ): Promise<IngredientResponse> {
    const parsedIngr: ParsedIngredient = parseIngredientString(ingrString)

    let ingrData = null
    try {
      ingrData = await getIngredientInfo(
        parsedIngr.ingredient || '',
        config.spoonacularAPIKey,
        config.serverUrl
      )
    } catch (error: any) {
      return {
        error: { message: error.message },
        ingredientData: null,
        parsedIngredient: parsedIngr,
      }
    }

    if (!parsedIngr.ingredient || !ingrData) {
      return {
        error: { message: UNKNOWN_INGREDIENT_MESSAGE },
        ingredientData: null,
        parsedIngredient: parsedIngr,
      }
    }

    let krogerPrice: PriceInfo | null = null
    try {
      krogerPrice = await tryKroger(parsedIngr, options)
    } catch {
      // Any unexpected Kroger failure degrades to the Spoonacular estimate.
      krogerPrice = null
    }

    const price =
      krogerPrice ?? spoonacularPrice(parsedIngr, ingrData.estimatedPrices)

    return {
      ingredientData: buildIngredientData(ingrData, options, price),
      parsedIngredient: parsedIngr,
    }
  }

  return { parse }
}
