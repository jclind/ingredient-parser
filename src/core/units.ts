// Config-driven unit registry.
//
// This is the single source of truth that replaces v1's three parallel maps
// (`unitNormalizations`, `unrecognizedUnits`, `unitSingular`) plus the upstream
// parser's hardcoded `engUnits`/`engPluralUnits`/`engNameToSymbol` tables.
//
// To add a unit you add ONE entry here. No regex layers to touch.

export type UnitType = 'volume' | 'mass' | 'count' | 'informal'
export type UnitSystem = 'metric' | 'us' | 'imperial' | 'none'

export interface UnitDef {
  name: string // canonical singular
  plural: string
  symbol: string | null
  type: UnitType
  system: UnitSystem
  /** every spelling/abbreviation that should resolve to this unit */
  aliases: string[]
}

export const UNITS: UnitDef[] = [
  // ---- volume (US/imperial) ----
  { name: 'teaspoon', plural: 'teaspoons', symbol: 'tsp', type: 'volume', system: 'us',
    aliases: ['teaspoon', 'teaspoons', 'tsp', 'tsps', 'tsp.', 'tspn'] },
  { name: 'tablespoon', plural: 'tablespoons', symbol: 'tbs', type: 'volume', system: 'us',
    aliases: ['tablespoon', 'tablespoons', 'tbsp', 'tbsp.', 'tbs', 'tbspn', 'tblsp'] },
  { name: 'dessertspoon', plural: 'dessertspoons', symbol: null, type: 'volume', system: 'imperial',
    aliases: ['dessertspoon', 'dessertspoons'] },
  { name: 'cup', plural: 'cups', symbol: 'c', type: 'volume', system: 'us',
    aliases: ['cup', 'cups'] },
  { name: 'pint', plural: 'pints', symbol: 'pt', type: 'volume', system: 'us',
    aliases: ['pint', 'pints', 'pt', 'pt.', 'pts'] },
  { name: 'quart', plural: 'quarts', symbol: 'qt', type: 'volume', system: 'us',
    aliases: ['quart', 'quarts', 'qt', 'qt.', 'qts'] },
  { name: 'gallon', plural: 'gallons', symbol: 'gal', type: 'volume', system: 'us',
    aliases: ['gallon', 'gallons', 'gal', 'gal.'] },
  { name: 'fluid ounce', plural: 'fluid ounces', symbol: 'fl oz', type: 'volume', system: 'us',
    aliases: ['fluid ounce', 'fluid ounces', 'fluid oz', 'fl oz', 'fl. oz.', 'fl oz.'] },
  // ---- volume (metric) ----
  { name: 'milliliter', plural: 'milliliters', symbol: 'ml', type: 'volume', system: 'metric',
    aliases: ['milliliter', 'milliliters', 'millilitre', 'millilitres', 'ml', 'ml.'] },
  { name: 'liter', plural: 'liters', symbol: 'lt', type: 'volume', system: 'metric',
    aliases: ['liter', 'liters', 'litre', 'litres', 'lt'] },

  // ---- mass (metric) ----
  { name: 'milligram', plural: 'milligrams', symbol: 'mg', type: 'mass', system: 'metric',
    aliases: ['milligram', 'milligrams', 'mg', 'mg.'] },
  { name: 'gram', plural: 'grams', symbol: 'g', type: 'mass', system: 'metric',
    aliases: ['gram', 'grams', 'g', 'g.'] },
  { name: 'kilogram', plural: 'kilograms', symbol: 'kg', type: 'mass', system: 'metric',
    aliases: ['kilogram', 'kilograms', 'kg', 'kg.'] },
  // ---- mass (us/imperial) ----
  { name: 'ounce', plural: 'ounces', symbol: 'oz', type: 'mass', system: 'us',
    aliases: ['ounce', 'ounces', 'oz', 'oz.'] },
  { name: 'pound', plural: 'pounds', symbol: 'lb', type: 'mass', system: 'us',
    aliases: ['pound', 'pounds', 'lb', 'lb.', 'lbs', 'lbs.'] },

  // ---- count / container ----
  { name: 'can', plural: 'cans', symbol: null, type: 'count', system: 'none', aliases: ['can', 'cans'] },
  { name: 'package', plural: 'packages', symbol: null, type: 'count', system: 'none',
    aliases: ['package', 'packages', 'pkg', 'pkgs'] },
  { name: 'bag', plural: 'bags', symbol: null, type: 'count', system: 'none', aliases: ['bag', 'bags'] },
  { name: 'box', plural: 'boxes', symbol: null, type: 'count', system: 'none', aliases: ['box', 'boxes'] },
  { name: 'jar', plural: 'jars', symbol: null, type: 'count', system: 'none', aliases: ['jar', 'jars'] },
  { name: 'bottle', plural: 'bottles', symbol: null, type: 'count', system: 'none',
    aliases: ['bottle', 'bottles'] },
  { name: 'tin', plural: 'tins', symbol: null, type: 'count', system: 'none', aliases: ['tin', 'tins'] },
  { name: 'carton', plural: 'cartons', symbol: null, type: 'count', system: 'none',
    aliases: ['carton', 'cartons'] },
  { name: 'container', plural: 'containers', symbol: null, type: 'count', system: 'none',
    aliases: ['container', 'containers'] },
  { name: 'stick', plural: 'sticks', symbol: null, type: 'count', system: 'none', aliases: ['stick', 'sticks'] },
  { name: 'clove', plural: 'cloves', symbol: null, type: 'count', system: 'none', aliases: ['clove', 'cloves'] },
  { name: 'slice', plural: 'slices', symbol: null, type: 'count', system: 'none', aliases: ['slice', 'slices'] },
  { name: 'piece', plural: 'pieces', symbol: null, type: 'count', system: 'none',
    aliases: ['piece', 'pieces', 'pcs', 'pcs.'] },
  { name: 'strip', plural: 'strips', symbol: null, type: 'count', system: 'none', aliases: ['strip', 'strips'] },
  { name: 'sheet', plural: 'sheets', symbol: null, type: 'count', system: 'none', aliases: ['sheet', 'sheets'] },
  { name: 'sprig', plural: 'sprigs', symbol: null, type: 'count', system: 'none', aliases: ['sprig', 'sprigs'] },
  { name: 'bay leaf', plural: 'bay leaves', symbol: null, type: 'count', system: 'none',
    aliases: ['bay leaf', 'bay leaves'] },

  // ---- informal ----
  { name: 'pinch', plural: 'pinches', symbol: null, type: 'informal', system: 'none',
    aliases: ['pinch', 'pinches'] },
  { name: 'dash', plural: 'dashes', symbol: null, type: 'informal', system: 'none',
    aliases: ['dash', 'dashes'] },
  { name: 'handful', plural: 'handfuls', symbol: null, type: 'informal', system: 'none',
    aliases: ['handful', 'handfuls'] },
]

// Build an alias → UnitDef lookup, with aliases sorted longest-first so that
// multi-word units ("fluid ounce", "bay leaf") win over their prefixes and a
// short alias never shadows a longer match.
interface AliasEntry {
  alias: string
  def: UnitDef
}
export const ALIAS_TABLE: AliasEntry[] = UNITS.flatMap(def =>
  def.aliases.map(alias => ({ alias: alias.toLowerCase(), def }))
).sort((a, b) => b.alias.length - a.alias.length)

// Containers a shopper buys as one item, whose real measure is usually written
// alongside it: "1 can (15 oz) black beans". The container name alone can't be
// priced (nobody sells "one can" of anything in the abstract), so when a
// parenthetical carries a mass or volume the parser records it as
// `containerSize` and pricing uses that instead. See parse.ts step 5b.
//
// `stick` is deliberately out: "1 stick (1/2 cup) butter" would work, but the
// word also means celery and cinnamon, and butter is the only common case.
export const CONTAINER_UNITS = new Set([
  'can',
  'jar',
  'bottle',
  'package',
  'bag',
  'box',
  'tin',
  'carton',
  'container',
])

// Count units where the unit IS the ingredient (e.g. "2 bay leaves" has no
// separate noun). When one of these consumes the whole line, the parser uses
// the unit name as the ingredient name rather than leaving it empty. Contrast
// "2 cloves" / "1 can" — those are genuinely incomplete ("of what?").
export const SELF_NAMING_UNITS = new Set(['bay leaf'])

/** words that modify a measurement but are not themselves the unit */
export const UNIT_MODIFIERS = new Set([
  'heaped',
  'heaping',
  'rounded',
  'level',
  'scant',
  'generous',
])

/**
 * Try to match a unit at the very start of `text` (already lowercased).
 * Returns the matched UnitDef and the remaining text, or null if no unit.
 */
export function matchLeadingUnit(
  text: string
): { def: UnitDef; rest: string } | null {
  // skip any run of leading unit modifiers ("heaped level tablespoon")
  let working = text
  let modMatch: RegExpMatchArray | null
  while ((modMatch = working.match(/^(\w+)\b\s*/)) && UNIT_MODIFIERS.has(modMatch[1])) {
    working = working.slice(modMatch[0].length)
  }

  for (const { alias, def } of ALIAS_TABLE) {
    // word-boundary aware prefix match: alias must be followed by end or a
    // non-word char so "cup" doesn't match inside "cupcake" and "c" (if ever
    // added) wouldn't match "coconut".
    if (working === alias || working.startsWith(alias + ' ')) {
      return { def, rest: working.slice(alias.length).trim() }
    }
    // handle alias immediately followed by punctuation already in alias list
  }
  return null
}
