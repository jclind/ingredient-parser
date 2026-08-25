// Volume → grams conversion via ingredient density.
//
// Volume → millilitres is exact. Millilitres → grams needs a density (g/ml),
// which is ingredient-specific, so this converter keys off the parsed ingredient
// name. Conversions it makes are flagged `exact: false` — the densities below are
// rough cooking estimates (a "cup of flour" genuinely varies ±20%), so the
// resulting price is reported as low confidence. Unknown ingredients return null,
// and `calculatePrice` then declines to price a volume measure at all rather than
// guessing from a per-item price (see the fallback gate there).

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

// Approximate densities (g/ml) for common cooking ingredients, grouped by aisle
// for readability. Order here does NOT decide precedence: matching is
// longest-term-first (see DENSITY_MATCHERS), so a specific entry beats a broader
// one wherever either sits in this list. Add entries in whichever group reads
// best.
//
// Only add a density you'd defend. Anything absent declines to a null price,
// which the caller renders as "no price" rather than a wrong one, so an honest
// gap costs less than a bad guess. That's why shape-dependent things (pasta,
// leafy greens packed vs loose) are deliberately left out.
const DENSITIES: { match: string[]; density: number }[] = [
  // Baking
  { match: ['brown sugar'], density: 0.72 },
  { match: ['powdered sugar', 'icing sugar', 'confectioners sugar'], density: 0.56 },
  { match: ['sugar'], density: 0.85 },
  { match: ['flour'], density: 0.53 },
  { match: ['cornstarch', 'corn starch'], density: 0.51 },
  { match: ['cornmeal'], density: 0.52 },
  { match: ['cocoa'], density: 0.5 },
  { match: ['chocolate chip', 'chocolate chunk'], density: 0.72 },
  { match: ['baking powder', 'baking soda'], density: 0.9 },
  { match: ['yeast'], density: 0.8 },
  { match: ['extract'], density: 0.88 },
  { match: ['breadcrumb', 'bread crumb'], density: 0.46 },
  { match: ['panko'], density: 0.25 },
  { match: ['shredded coconut', 'desiccated coconut'], density: 0.33 },

  // Sweeteners and spreads
  { match: ['honey', 'syrup', 'molasses'], density: 1.42 },
  { match: ['jam', 'jelly', 'preserves', 'marmalade'], density: 1.33 },
  { match: ['peanut butter', 'almond butter', 'nut butter'], density: 1.08 },

  // Fats and dairy
  { match: ['oil'], density: 0.92 },
  { match: ['butter'], density: 0.911 },
  { match: ['milk', 'buttermilk'], density: 1.03 },
  { match: ['cream cheese'], density: 0.98 },
  { match: ['cream'], density: 1.0 },
  { match: ['yogurt', 'yoghurt'], density: 1.03 },
  { match: ['shredded cheese', 'grated cheese', 'parmesan', 'cheddar', 'mozzarella'], density: 0.42 },

  // Liquids and condiments
  { match: ['water', 'broth', 'stock', 'juice', 'wine', 'vinegar'], density: 1.0 },
  { match: ['soy sauce', 'fish sauce', 'worcestershire'], density: 1.1 },
  { match: ['ketchup'], density: 1.15 },
  { match: ['mustard'], density: 1.05 },
  { match: ['mayonnaise', 'mayo'], density: 0.95 },
  { match: ['salsa', 'tomato sauce', 'marinara', 'pasta sauce'], density: 1.03 },
  { match: ['tomato paste'], density: 1.1 },

  // Grains and legumes
  { match: ['rice'], density: 0.85 },
  { match: ['quinoa'], density: 0.72 },
  { match: ['rolled oats', 'oats', 'oatmeal'], density: 0.38 },
  { match: ['lentils'], density: 0.81 },
  { match: ['beans', 'chickpeas', 'garbanzo'], density: 0.72 },

  // Produce, chopped or canned as a recipe would measure it
  { match: ['diced tomatoes', 'crushed tomatoes', 'chopped tomatoes'], density: 1.0 },
  { match: ['onion', 'shallot'], density: 0.68 },
  { match: ['corn'], density: 0.66 },
  { match: ['bell pepper'], density: 0.63 },
  { match: ['carrot'], density: 0.54 },
  { match: ['celery'], density: 0.43 },
  { match: ['mushroom'], density: 0.29 },
  { match: ['peas'], density: 0.57 },
  { match: ['strawberries', 'strawberry', 'blueberries', 'blueberry', 'raspberries', 'raspberry', 'blackberries', 'blackberry'], density: 0.63 },
  { match: ['raisins', 'raisin', 'dried cranberries'], density: 0.61 },

  // Nuts and seasoning
  { match: ['walnut', 'pecan', 'almond', 'cashew', 'pistachio', 'peanut'], density: 0.5 },
  { match: ['salt'], density: 1.2 },
]

// Escape a table term for use inside a RegExp. Terms are plain words today, but
// the table is edited by hand and a stray `.` or `(` would otherwise silently
// become a wildcard.
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Flattened, precompiled, and sorted longest-term-first.
//
// **Word boundaries, not raw substring.** `"boiling water".includes("oil")` is
// true, which used to price boiling water at oil's 0.92 g/ml. `\boils?\b` doesn't
// match inside "boiling", and `\bwaters?\b` doesn't match inside "watermelon".
// The optional trailing `s` keeps plurals working ("rolled oats", "carrots").
//
// **Longest term wins**, so "peanut butter" (13) beats "butter" (6) and "cream
// cheese" beats "cream" without anyone having to maintain list order by hand.
// This mirrors the longest-alias-first rule the unit registry already uses.
const DENSITY_MATCHERS: { re: RegExp; density: number }[] = DENSITIES.flatMap(
  ({ match, density }) => match.map(term => ({ term, density }))
)
  .sort((a, b) => b.term.length - a.term.length)
  .map(({ term, density }) => ({ re: new RegExp(`\\b${escapeRegExp(term)}s?\\b`), density }))

export function lookupDensity(ingredientName: string): number | null {
  const name = ingredientName.toLowerCase()
  for (const { re, density } of DENSITY_MATCHERS) {
    if (re.test(name)) return density
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
