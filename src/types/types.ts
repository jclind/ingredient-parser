type StringOrNull = string | null
type NumberOrNull = number | null

export type ParsedIngredient = {
  quantity: NumberOrNull
  unit: StringOrNull
  unitPlural: StringOrNull
  symbol: StringOrNull
  ingredient: StringOrNull
  minQty: NumberOrNull
  maxQty: NumberOrNull
  comment: StringOrNull
}
