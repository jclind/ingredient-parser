type StringOrNull = string | null
type NumberOrNull = number | null

export type IngredientResponse =
  | { parsedIngredient: ParsedIngredient; ingredientData: IngredientData }
  | {
      error: { message: string }
      parsedIngredient: ParsedIngredient | null
      ingredientData: IngredientData | null
    }

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
  originalName: string
  name: string
  amount: number
  possibleUnits: string[]
  consistency: string
  shoppingListUnits: string[]
  aisle: string
  image: string
  imagePath: string
  nutrition: Nutrition
  totalPriceUSACents: number | null
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
