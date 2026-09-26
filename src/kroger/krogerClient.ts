import _axios, { isAxiosError } from 'axios'
import type { AxiosInstance, AxiosStatic } from 'axios'
import { TokenStore } from './tokenStore.js'
import { pickBest, RankableProduct } from './match.js'
import { perUnitPrice } from './units.js'
import { KrogerConfig } from '../../types.js'

// Same webpack-double-wrap guard the rest of the package uses (see api/http.ts).
const axios: AxiosStatic =
  typeof _axios.create === 'function'
    ? _axios
    : (_axios as unknown as { default: AxiosStatic }).default

const DEFAULT_BASE = 'https://api.kroger.com/v1'

interface KrogerItem {
  price?: { regular?: number; promo?: number }
  size?: string
}

interface KrogerProduct {
  description?: string
  items?: KrogerItem[]
}

/** A normalized Kroger price lookup, ready to be bridged into IngredientData. */
export interface KrogerPriceLookup {
  /** Store/banner label, e.g. "Ralphs". */
  store: string | null
  /** locationId the price came from — also the cache partition key. */
  locationId: string
  /** Product description that was matched. */
  matchedProduct: string | null
  /** Shelf price for the whole package, in USD dollars. */
  regular: number | null
  /** Promo price in USD dollars if active, else null. */
  promo: number | null
  /** Effective (promo ?? regular) price per base unit, in USD dollars. */
  perUnit: number | null
  /** Base unit perUnit is expressed in ("oz" | "g" | "fl oz" | "ml" | "ct"). */
  unit: string | null
}

export interface KrogerClientOptions {
  config: KrogerConfig
  /** Pre-resolved store id; if absent, resolved from `zipCode` on first use. */
  locationId?: string
  zipCode?: string
}

/**
 * Live retail prices from a Kroger-banner store nearest a zip code. One instance
 * is held by the client factory so the OAuth token and resolved store persist
 * across lookups.
 */
export class KrogerClient {
  private readonly http: AxiosInstance
  private readonly tokens: TokenStore
  private locationId: string | undefined
  private storeLabel: string | null = null
  private locationPromise: Promise<string> | null = null

  constructor(private readonly opts: KrogerClientOptions) {
    this.http = axios.create({
      baseURL: opts.config.baseUrl ?? DEFAULT_BASE,
      timeout: 8000,
    })
    this.locationId = opts.locationId
    this.tokens = new TokenStore(() => this.requestToken())
  }

  private async requestToken(): Promise<{
    accessToken: string
    expiresInSec: number
  }> {
    const creds = Buffer.from(
      `${this.opts.config.clientId}:${this.opts.config.clientSecret}`
    ).toString('base64')

    const res = await this.http.post(
      '/connect/oauth2/token',
      'grant_type=client_credentials&scope=product.compact',
      {
        headers: {
          Authorization: `Basic ${creds}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )
    const json = res.data as { access_token: string; expires_in: number }
    return { accessToken: json.access_token, expiresInSec: json.expires_in }
  }

  private async authHeaders(): Promise<Record<string, string>> {
    return {
      Authorization: `Bearer ${await this.tokens.get()}`,
      Accept: 'application/json',
    }
  }

  /** Resolve (and cache) the nearest store id. Pricing requires a locationId. */
  private async resolveLocation(): Promise<string> {
    if (this.locationId) return this.locationId
    if (this.locationPromise) return this.locationPromise

    const zip = this.opts.zipCode
    if (!zip) {
      throw new Error(
        'KrogerClient needs a zipCode or locationId to fetch prices.'
      )
    }

    this.locationPromise = (async () => {
      const res = await this.http.get('/locations', {
        headers: await this.authHeaders(),
        params: { 'filter.zip.code.near': zip, 'filter.limit': 1 },
      })
      const json = res.data as {
        data?: Array<{ locationId: string; name?: string; chain?: string }>
      }
      const first = json.data?.[0]
      if (!first) {
        throw new Error(`No Kroger-banner store found near zip ${zip}.`)
      }
      this.locationId = first.locationId
      this.storeLabel = first.name ?? first.chain ?? `Kroger #${first.locationId}`
      return first.locationId
    })().finally(() => {
      this.locationPromise = null
    })

    return this.locationPromise
  }

  /** Resolve the nearest store id (memoized), or null if none/failed. The
   *  caller needs this as the cache partition key before hitting Kroger. */
  async ensureLocationId(): Promise<string | null> {
    try {
      return await this.resolveLocation()
    } catch {
      return null
    }
  }

  /**
   * Look up the best-matching product price for `ingredient`. Returns null when
   * there is no store in range, no product match, or the request fails — every
   * one of which should trigger the caller's Spoonacular fallback.
   */
  async getPrice(ingredient: string): Promise<KrogerPriceLookup | null> {
    let locationId: string
    try {
      locationId = await this.resolveLocation()
    } catch {
      return null
    }

    let products: KrogerProduct[]
    try {
      const res = await this.http.get('/products', {
        headers: await this.authHeaders(),
        params: {
          'filter.term': ingredient,
          'filter.locationId': locationId,
          'filter.limit': 15,
        },
      })
      const json = res.data as { data?: KrogerProduct[] }
      products = json.data ?? []
    } catch (err) {
      // A 401 means the token went stale between calls — invalidate so the next
      // lookup mints a fresh one — then bail to the fallback.
      if (isAxiosError(err) && err.response?.status === 401) {
        this.tokens.invalidate()
      }
      return null
    }

    const rankable: RankableProduct<KrogerProduct>[] = products.map(p => ({
      value: p,
      description: p.description ?? '',
      hasPrice: typeof p.items?.[0]?.price?.regular === 'number',
    }))

    const best = pickBest(ingredient, rankable)
    if (!best) return null

    const item = best.items?.[0]
    const regular = typeof item?.price?.regular === 'number' ? item.price.regular : null
    const promo =
      typeof item?.price?.promo === 'number' && item.price.promo > 0
        ? item.price.promo
        : null

    const effective = promo ?? regular
    const per = effective !== null ? perUnitPrice(effective, item?.size) : null

    return {
      store: this.storeLabel,
      locationId,
      matchedProduct: best.description ?? null,
      regular,
      promo,
      perUnit: per?.perUnit ?? null,
      unit: per?.unit ?? null,
    }
  }

  /** The resolved store label, if a lookup has resolved one. */
  get store(): string | null {
    return this.storeLabel
  }
}
