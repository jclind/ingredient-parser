import { IngredientData, OptionsType, PriceSource } from '../../types.js'

/** The price outcome the factory has resolved for an ingredient. */
export interface PriceInfo {
  totalPriceUSACents: number | null
  priceSource?: PriceSource
  /** Set only when Kroger supplied the price. */
  store?: string | null
  /** Set only when Kroger supplied the price. */
  matchedProduct?: string | null
}

/**
 * Reduce a raw enriched ingredient record (Spoonacular metadata) plus a
 * resolved price into the public `IngredientData` shape. Mirrors the assembly
 * in the legacy `ingredientParser`, with the v2 additive price fields.
 */
export function buildIngredientData(
  ingrData: IngredientData,
  options: OptionsType | undefined,
  price: PriceInfo
): IngredientData {
  const {
    estimatedPrices,
    meta,
    categoryPath,
    unit,
    unitShort,
    unitLong,
    original,
    id,
    nutrition,
    ...reducedIngrData
  } = ingrData

  const imageSize = options?.imageSize ?? '100x100'
  const imagePath = `https://spoonacular.com/cdn/ingredients_${imageSize}/${reducedIngrData.image}`

  return {
    ...reducedIngrData,
    imagePath,
    ...(price.totalPriceUSACents !== null && {
      totalPriceUSACents: price.totalPriceUSACents,
      ...(price.priceSource && { priceSource: price.priceSource }),
    }),
    ...(price.store != null && { store: price.store }),
    ...(price.matchedProduct != null && { matchedProduct: price.matchedProduct }),
    ...(options?.returnNutritionData && { nutrition }),
  }
}
