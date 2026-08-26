// v2 core parser — a single tokenizing pass, no third-party parser, no
// consecutive-T hack, no Italian "q.b." leakage.
//
// Pipeline (one path — informal units flow through the same cleanup stages):
//   normalize → join hyphenated descriptors → strip trailing purpose →
//   split comment (parens + comma) → inverted-form lift →
//   informal-or-quantity → unit match → container-size lift →
//   descriptor/prep extraction

import { convertFractions } from './fractions.js'
import { parseQuantity } from './quantity.js'
import {
  CONTAINER_UNITS,
  matchLeadingUnit,
  SELF_NAMING_UNITS,
  UNITS,
  type UnitDef,
} from './units.js'
import {
  extractDescriptors,
  joinHyphenatedDescriptors,
  stripTrailingPurpose,
  preparationFromComment,
  dedupe,
} from './descriptors.js'
import type { ParsedIngredientV2 } from './types.js'

// Upper bound on the text we run regexes over. Real ingredient strings are well
// under this; the cap defends the pipeline against pathological inputs (e.g. an
// unbalanced-paren O(n²) case) while `original` still preserves the full input.
const MAX_PARSE_LEN = 1000

// Informal units are derived from the registry (single source of truth).
const INFORMAL_DEFS = UNITS.filter(u => u.type === 'informal')
const INFORMAL_RE = new RegExp(
  `^(?:an?\\s+)?(${INFORMAL_DEFS.map(u => u.name).join('|')})\\b(?:\\s+of\\b)?\\s*(.*)$`,
  'i'
)

function toUnit(def: UnitDef | null | undefined) {
  if (!def) return null
  return {
    name: def.name,
    plural: def.plural,
    symbol: def.symbol,
    type: def.type,
    system: def.system,
  }
}

// Words allowed to trail a container measure inside a parenthetical. "each" and
// "total" are how authors write the multiplier. Anything else means the
// parenthetical is prose, not a measure, so it is ignored.
const MEASURE_TRAILERS = new Set(['', 'each', 'total'])

const CONTAINER_DEFS = UNITS.filter(u => CONTAINER_UNITS.has(u.name))

/**
 * Read a mass or volume measure from a parenthetical: "15 oz", "about 14.5 oz
 * each", "15 ounce can". Returns null when the text isn't a clean measure.
 * Declining keeps "(optional)" and "(from 2 lemons)" out of the quantity.
 *
 * `container` is set when the container word sits INSIDE the parens, as in
 * "1 (15 ounce can) black beans". There the head has no unit at all, so the
 * caller adopts this one.
 */
function parseContainerMeasure(
  text: string
): { value: number; def: UnitDef; container: UnitDef | null } | null {
  const q = parseQuantity(text)
  if (q.value === null || !Number.isFinite(q.value) || q.value <= 0) return null
  const m = matchLeadingUnit(q.rest)
  if (!m) return null
  if (m.def.type !== 'mass' && m.def.type !== 'volume') return null

  const trailer = m.rest.trim()
  if (MEASURE_TRAILERS.has(trailer)) {
    return { value: q.value, def: m.def, container: null }
  }
  const container = CONTAINER_DEFS.find(
    u => u.name === trailer || u.plural === trailer
  )
  return container ? { value: q.value, def: m.def, container } : null
}

const QTY_ONE = { value: 1, min: 1, max: 1, isRange: false, isApproximate: false }
const QTY_NONE = { value: null, min: null, max: null, isRange: false, isApproximate: false }

export function parse(input: unknown): ParsedIngredientV2 {
  if (typeof input !== 'string') {
    throw new TypeError('parse expects a string input')
  }
  const original = input

  // 1. normalize: unicode fractions → ascii, lowercase, length-bound
  let working = convertFractions(input).toLowerCase().slice(0, MAX_PARSE_LEN)

  // 2. structural pre-processing (must run before comma split)
  working = joinHyphenatedDescriptors(working)
  const purposeSplit = stripTrailingPurpose(working)
  working = purposeSplit.text
  const purpose = purposeSplit.purpose

  // 3. comment = every parenthetical's content + text after the first comma.
  //    Only touch parens when a closing paren exists — an unbalanced "((((" is
  //    otherwise an O(n²) regex trap.
  const parenContents: string[] = []
  let noParen = working
  if (working.includes('(') && working.includes(')')) {
    for (const m of working.matchAll(/\(([^)]*)\)/g)) {
      const c = m[1].trim()
      if (c) parenContents.push(c)
    }
    noParen = working.replace(/\([^)]*\)/g, ' ').replace(/\s{2,}/g, ' ').trim()
  }

  let head = noParen
  const commentParts: string[] = []
  const commaIdx = noParen.indexOf(',')
  if (commaIdx !== -1) {
    head = noParen.slice(0, commaIdx).trim()
    const after = noParen.slice(commaIdx + 1).replace(/^[,\s]+/, '').trim()
    if (after) commentParts.push(after)
  }
  commentParts.push(...parenContents)
  const comment = commentParts.join(' ').trim() || null

  // 4. inverted form: "juice of 1 lemon" → form "juice", remainder "1 lemon"
  const formPrep: string[] = []
  const inverted = head.match(/^(juice|zest|rind|peel)\s+of\s+(.+)$/i)
  if (inverted) {
    formPrep.push(inverted[1].toLowerCase())
    head = inverted[2].trim()
  }

  // 5. informal unit ("a pinch of salt", "handful spinach") OR quantity+unit.
  //    Both branches converge on the same `nameText` for descriptor extraction.
  let quantity: ParsedIngredientV2['quantity'] = QTY_NONE
  let unitDef: UnitDef | null = null
  let nameText: string

  const informal = head.match(INFORMAL_RE)
  if (informal) {
    quantity = QTY_ONE
    unitDef = INFORMAL_DEFS.find(u => u.name === informal[1].toLowerCase()) ?? null
    nameText = informal[2].trim()
  } else {
    const q = parseQuantity(head)
    let { value, min, max } = q
    let rest = q.rest
    let unitMatch = matchLeadingUnit(rest)
    // leading indefinite article before a unit ("a cup of sugar",
    // "a tablespoon of oil") → treat as quantity 1, like "a pinch".
    if (!unitMatch && value === null) {
      const article = rest.match(/^(an?)\s+/i)
      if (article) {
        const afterArticle = rest.slice(article[0].length)
        const m = matchLeadingUnit(afterArticle)
        if (m) {
          value = min = max = 1
          rest = afterArticle
          unitMatch = m
        }
      }
    }
    quantity = { value, min, max, isRange: q.isRange, isApproximate: q.isApproximate }
    unitDef = unitMatch ? unitMatch.def : null
    // drop a connective "of" left after a real unit ("liter of milk" → "milk")
    nameText = (unitMatch ? unitMatch.rest : rest).replace(/^of\s+/i, '')
  }

  // 5b. container-size lift. "1 can (15 oz) black beans" describes 15 oz of
  //     beans; the can is packaging. Nobody sells "one can" as a priceable
  //     item, so without this the measure sits in the comment as prose and the
  //     ingredient can't be priced at all. The parenthetical is read as the
  //     size of ONE container. "2 cans (14.5 oz each)" and the far more common
  //     "2 cans (14.5 oz)" both mean 14.5 oz per can, so consumers multiply by
  //     `quantity`. Only the first parseable parenthetical is taken.
  //
  //     The measure stays in `comment` as well. `comment` is documented as the
  //     raw text, v1 consumers read it to show the can size on the page, and a
  //     cook shopping for the recipe wants to see "15 oz" there. Structured and
  //     raw overlapping is already how `preparation` and `descriptors` work.
  let containerSize: ParsedIngredientV2['containerSize'] = null
  const unitIsContainer = !!unitDef && CONTAINER_UNITS.has(unitDef.name)
  if (unitIsContainer || !unitDef) {
    for (const paren of parenContents) {
      const measure = parseContainerMeasure(paren)
      if (!measure) continue
      // Only adopt a container from inside the parens when the head supplied
      // no unit. "2 cups (500 ml) milk" already has a real unit and must keep it.
      if (!unitIsContainer) {
        if (!measure.container) continue
        unitDef = measure.container
      }
      containerSize = { value: measure.value, unit: toUnit(measure.def)! }
      break
    }
  }

  // 6. ingredient name + structured descriptors / preparation
  const split = extractDescriptors(nameText.replace(/\s{2,}/g, ' ').trim())
  // a self-naming unit ("2 bay leaves") IS the ingredient when nothing else remains
  if (!split.name && unitDef && SELF_NAMING_UNITS.has(unitDef.name)) {
    split.name = unitDef.name
  }
  const preparation = dedupe([
    ...formPrep,
    ...split.preparation,
    ...preparationFromComment(comment),
  ])

  return {
    quantity,
    unit: toUnit(unitDef),
    ingredient: {
      name: split.name,
      descriptors: dedupe(split.descriptors),
      preparation,
    },
    containerSize,
    purpose,
    comment,
    original,
  }
}
