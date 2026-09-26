type StringOrNull = string | null
type NumberOrNull = number | null

export type IngredientResponse =
  | {
      parsedIngredient: ParsedIngredient
      ingredientData: IngredientData
      id?: string
    }
  | {
      error: { message: string }
      parsedIngredient: ParsedIngredient
      ingredientData: IngredientData | null
      id?: string
    }

export type ParsedIngredient = {
  quantity: NumberOrNull
  unit: StringOrNull
  unitPlural: StringOrNull
  symbol: StringOrNull
  ingredient: StringOrNull
  originalIngredientString: string
  minQty: NumberOrNull
  maxQty: NumberOrNull
  comment: StringOrNull
}

export interface IngredientData {
  _id?: string
  ingredientId?: number
  originalName?: string
  name: string
  amount?: number
  possibleUnits?: string[]
  consistency?: string
  shoppingListUnits?: string[]
  aisle?: string
  image?: string
  imagePath?: string
  nutrition?: Nutrition
  totalPriceUSACents?: number
  estimatedPrices?: {
    estimatedGramPrice?: number
    estimatedSingleUnitPrice?: number
  }
  meta?: any
  categoryPath?: any
  unit?: string
  unitShort?: string
  unitLong?: string
  original?: any
  id?: number

  // ── v2 additive fields ─────────────────────────────────────────────
  // Present only on the createIngredientParser() path. Backward-compatible:
  // the legacy ingredientParser() output never sets the Kroger ones.
  /** Where `totalPriceUSACents` came from. */
  priceSource?: PriceSource
  /** Store/banner the Kroger price came from (e.g. "Ralphs"), when applicable. */
  store?: string | null
  /** The Kroger product description that was matched, when applicable. */
  matchedProduct?: string | null
}

export type PriceSource = 'kroger' | 'spoonacular'

export interface Nutrition {
  nutrients: Nutrient[]
  properties: Property[]
  flavonoids: Flavonoid[]
  caloricBreakdown: CaloricBreakdown
  weightPerServing: WeightPerServing
}

export interface Nutrient {
  name: string
  amount: number
  unit: string
  percentOfDailyNeeds: number
}

export interface Property {
  name: string
  amount: number
  unit: string
}

export interface Flavonoid {
  name: string
  amount: number
  unit: string
}

export interface CaloricBreakdown {
  percentProtein: number
  percentFat: number
  percentCarbs: number
}

export interface WeightPerServing {
  amount: number
  unit: string
}

export type SpoonacularImageSize = '100x100' | '250x250' | '500x500'

export type OptionsType = {
  returnNutritionData?: boolean
  imageSize?: SpoonacularImageSize
  serverUrl?: string
}

// ── v2: Kroger-aware client factory ──────────────────────────────────

/** Kroger Developer API credentials (OAuth2 client-credentials). */
export interface KrogerConfig {
  clientId: string
  clientSecret: string
  /** Override the API base (useful for tests). Defaults to https://api.kroger.com/v1 */
  baseUrl?: string
}

/**
 * Config for `createIngredientParser`. Spoonacular still supplies ingredient
 * metadata (image, aisle, nutrition); Kroger, when configured, supplies the
 * real shelf price that becomes `totalPriceUSACents`, falling back to
 * Spoonacular's estimate when Kroger can't match.
 */
export interface IngredientParserConfig {
  /** Spoonacular API key — still required for ingredient metadata. */
  spoonacularAPIKey: string
  /** Kroger credentials. Omit to behave exactly like the legacy parser. */
  kroger?: KrogerConfig
  /** Zip code whose nearest Kroger-banner store sets the prices. */
  zipCode?: string
  /** Pin a specific Kroger locationId instead of resolving one from `zipCode`. */
  locationId?: string
  /** Override the metadata/cache proxy server URL. */
  serverUrl?: string
  /**
   * Freshness window (ms) for a cached Kroger price before it is re-fetched.
   * Default: 24h. A cached price older than this is ignored.
   */
  krogerCacheTtlMs?: number
}

/** Per-call options for `createIngredientParser(...).parse()`. */
export type ParseOptions = OptionsType & {
  /** Bypass the Kroger price cache and force a fresh Kroger fetch. */
  fresh?: boolean
}

/**
 * Shape of a Kroger price cached on the server, keyed by locationId + name.
 * `fetchedAt` is an ISO timestamp the package uses to enforce freshness.
 */
export interface KrogerPriceData {
  locationId: string
  store: string | null
  matchedProduct: string | null
  regular: number | null
  promo: number | null
  perUnit: number | null
  unit: string | null
  fetchedAt: string
}
