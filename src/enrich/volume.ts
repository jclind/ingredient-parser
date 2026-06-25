// Volume → grams conversion via ingredient density.
//
// Volume → millilitres is exact. Millilitres → grams needs a density (g/ml),
// which is ingredient-specific, so this converter keys off the parsed ingredient
// name. Conversions it makes are flagged `exact: false` — the densities below are
// rough cooking estimates (a "cup of flour" genuinely varies ±20%), so the
// resulting price is reported as low confidence. Unknown ingredients return null,
// which makes `calculatePrice` fall back to the single-unit estimate.

import { defaultToGrams, type GramConversion, type ToGrams } from './price.js'

// US customary volume units → millilitres.
const VOLUME_TO_ML: Record<string, number> = {
  teaspoon: 4.92892,
  tablespoon: 14.7868,
  dessertspoon: 10,
  'fluid ounce': 29.5735,
  cup: 236.588,
  pint: 473.176,
  quart: 946.353,
  gallon: 3785.41,
  milliliter: 1,
  liter: 1000,
}

export function volumeToMl(quantity: number, unitName: string): number | null {
  const factor = VOLUME_TO_ML[unitName]
  return factor === undefined ? null : quantity * factor
}

// Approximate densities (g/ml) for common cooking ingredients. Matched by
// substring against the ingredient name; first match wins, so list more specific
// terms before broader ones.
const DENSITIES: { match: string[]; density: number }[] = [
  { match: ['brown sugar'], density: 0.72 },
  { match: ['powdered sugar', 'icing sugar'], density: 0.56 },
  { match: ['sugar'], density: 0.85 },
  { match: ['flour'], density: 0.53 },
  { match: ['honey', 'syrup', 'molasses'], density: 1.42 },
  { match: ['oil'], density: 0.92 },
  { match: ['butter'], density: 0.911 },
  { match: ['milk', 'buttermilk'], density: 1.03 },
  { match: ['cream'], density: 1.0 },
  { match: ['water', 'broth', 'stock', 'juice', 'wine', 'vinegar'], density: 1.0 },
  { match: ['salt'], density: 1.2 },
  { match: ['rice'], density: 0.85 },
  { match: ['cocoa'], density: 0.5 },
]

export function lookupDensity(ingredientName: string): number | null {
  const name = ingredientName.toLowerCase()
  for (const { match, density } of DENSITIES) {
    if (match.some(m => name.includes(m))) return density
  }
  return null
}

/**
 * Build a `ToGrams` bound to an ingredient name: mass units convert exactly,
 * volume units convert via the density table (estimated), everything else → null.
 */
export function makeDensityToGrams(ingredientName: string): ToGrams {
  return (quantity, unit): GramConversion | null => {
    const mass = defaultToGrams(quantity, unit) // exact for mass units
    if (mass) return mass

    if (unit.type === 'volume') {
      const ml = volumeToMl(quantity, unit.name)
      const density = lookupDensity(ingredientName)
      if (ml !== null && density !== null) {
        return { grams: ml * density, exact: false }
      }
    }
    return null
  }
}
