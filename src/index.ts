// top-level convenience (parse + enrich)
export { ingredientParser } from './ingredientParser.js'
export type { IngredientResult } from './ingredientParser.js'

// v2 primary API (rich output)
export { parse } from './core/parse.js'
export type { ParsedIngredientV2 } from './core/types.js'
export { UNITS } from './core/units.js'
export type { UnitDef, UnitType, UnitSystem } from './core/units.js'

// enrichment (network, proxy-backed)
export { createEnricher, createProxyProvider, nameCandidates, EnrichError } from './enrich/enrich.js'
export type { EnricherOptions, Transport, TransportResponse } from './enrich/enrich.js'
export { calculatePrice, defaultToGrams } from './enrich/price.js'
export type { ToGrams, UnitLike, GramConversion } from './enrich/price.js'
export { buildImageUrl } from './enrich/spoonacular.js'
export type {
  IngredientData,
  Price,
  Nutrition,
  EstimatedPrices,
  IngredientProvider,
  ProviderResult,
  NeutralIngredient,
  ImageSize,
} from './enrich/types.js'

// v1-compatible projection (acceptance-gate / migration adapter)
export {
  parseIngredientString,
  type ParsedIngredient,
} from './legacy/parseIngredientString.js'
