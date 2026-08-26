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
  /**
   * The real measure of a container unit, lifted out of a parenthetical:
   * "1 can (15 oz) black beans" → quantity 1, unit `can`, containerSize 15 oz.
   * Per container, so the total is `quantity * containerSize.value`. Null unless
   * the unit is a container AND a parenthetical held a mass or volume.
   */
  containerSize: {
    value: number
    unit: {
      name: string
      plural: string
      symbol: string | null
      type: UnitType
      system: UnitSystem
    }
  } | null
  comment: string | null       // raw text after comma + parenthetical; null when absent
  original: string
}
