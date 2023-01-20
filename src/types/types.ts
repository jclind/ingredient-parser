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

export interface IngredientData {
  id: number
  original: string
  originalName: string
  name: string
  amount: number
  unit: string
  unitShort: string
  unitLong: string
  possibleUnits: string[]
  estimatedCost: EstimatedCost
  consistency: string
  shoppingListUnits: string[]
  aisle: string
  image: string
  meta: any[]
  nutrition: Nutrition
  categoryPath: string[]
}

export interface EstimatedCost {
  value: number
  unit: string
}

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
