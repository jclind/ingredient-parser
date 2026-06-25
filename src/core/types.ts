import type { UnitType, UnitSystem } from './units.js'

/** The richer v2 parse result. */
export interface ParsedIngredientV2 {
  quantity: {
    value: number | null // null = no quantity present (v1 forced this to 0)
    min: number | null
    max: number | null
    isRange: boolean
    isApproximate: boolean
  }
  unit: {
    name: string
    plural: string
    symbol: string | null
    type: UnitType
    system: UnitSystem
  } | null
  ingredient: {
    name: string
    descriptors: string[] // size/quality kept, not discarded: large, fresh, dried
    preparation: string[] // normalized prep verbs: chopped, grated, minced, ...
  }
  comment: string | null       // raw text after comma + parenthetical; null when absent
  original: string
}
