// v1-compatible projection of the v2 parser.
//
// This exists ONLY so the spike can be measured against the existing v1 test
// suite (the 278-case acceptance gate). It maps the richer v2 result down to
// the flat v1 `ParsedIngredient` shape. In the real v2 this becomes an optional
// `legacy` adapter, not the primary API.

import { parse } from '../core/parse.js'

type StringOrNull = string | null
type NumberOrNull = number | null

export interface ParsedIngredient {
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

export function parseIngredientString(ingrStr: string): ParsedIngredient {
  const r = parse(ingrStr)

  return {
    // v1 forced an absent quantity to 0; preserve that contract here.
    quantity: r.quantity.value ?? 0,
    unit: r.unit ? r.unit.name : null,
    unitPlural: r.unit ? r.unit.plural : null,
    symbol: r.unit ? r.unit.symbol : null,
    ingredient: r.ingredient.name,
    originalIngredientString: r.original,
    minQty: r.quantity.min ?? 0,
    maxQty: r.quantity.max ?? 0,
    comment: r.comment ?? '',
  }
}
