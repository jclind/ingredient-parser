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
  // 'ginger ale'/'ginger beer' are listed only to outrank the `ginger` spice term.
  { match: ['water', 'broth', 'stock', 'juice', 'wine', 'vinegar', 'ginger ale', 'ginger beer'], density: 1.0 },
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
  // Sweet peppers are spelled out so the bare `pepper` spice term below can't
  // claim them. "red pepper flakes" is longer still, so it goes back to 0.5.
  { match: ['bell pepper', 'green pepper', 'red pepper', 'sweet pepper'], density: 0.63 },
  { match: ['carrot'], density: 0.54 },
  { match: ['celery'], density: 0.43 },
  { match: ['mushroom'], density: 0.29 },
  { match: ['peas'], density: 0.57 },
  { match: ['strawberries', 'strawberry', 'blueberries', 'blueberry', 'raspberries', 'raspberry', 'blackberries', 'blackberry'], density: 0.63 },
  { match: ['raisins', 'raisin', 'dried cranberries'], density: 0.61 },

  // Nuts
  { match: ['walnut', 'pecan', 'almond', 'cashew', 'pistachio', 'peanut'], density: 0.5 },

  // Spices, milled
  //
  // A spice is nearly always measured in tsp or tbsp, so with no entry here the
  // price gate declines and the row reads "needs price" — which was every spice
  // in every savory recipe until this group existed.
  //
  // One density covers the category. A level teaspoon runs 2.1 g (cumin) to
  // 3.1 g (garlic powder), so 0.43–0.63 g/ml, and 0.5 sits inside the ±20% the
  // estimate already declares for any volume conversion. Grinding is what
  // flattens the spread: whole vs ground ginger differ, ground ginger and ground
  // cinnamon barely do.
  //
  // `seasoning` and `spice` deliberately match as bare words so blends come
  // along free — taco, cajun, pumpkin pie, five-spice. The leafy blends override
  // that below, since crumbled leaf is a third the weight of powder.
  {
    match: [
      'pepper',
      'peppercorn',
      'crushed red pepper',
      'red pepper flake',
      'pepper flake',
      'chili flake',
      'chile flake',
      'cayenne',
      'paprika',
      'cumin',
      'coriander',
      'turmeric',
      'cinnamon',
      'nutmeg',
      'allspice',
      'clove',
      'cardamom',
      'ginger',
      'chili powder',
      'chile powder',
      'chipotle',
      'garlic powder',
      'onion powder',
      'mustard powder',
      'dry mustard',
      'curry powder',
      'seasoning',
      'spice',
    ],
    density: 0.5,
  },

  // Herbs, dried leaf
  //
  // Crumbled leaf is far lighter than powder: a teaspoon of dried oregano is
  // about 1 g, a teaspoon of cinnamon 2.6 g. Hence a separate group.
  //
  // Only herbs that are nearly always dried when a recipe measures them by
  // volume are listed. Basil, parsley, cilantro, dill, mint, sage, rosemary and
  // chives are missing on purpose: `parse()` strips "dried" and "fresh" alike,
  // so "1 tsp dried basil" and "2 tbsp chopped fresh basil" both arrive here as
  // "basil" and nothing distinguishes them. Fresh chopped runs ~0.25 g/ml, so
  // guessing either way is wrong by roughly half in one direction. Declining is
  // the better answer until the parser keeps the qualifier.
  {
    match: [
      'oregano',
      'thyme',
      'marjoram',
      'tarragon',
      'bay leaf',
      'bay leaves',
      'italian seasoning',
      'herbes de provence',
      'poultry seasoning',
    ],
    density: 0.17,
  },

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
