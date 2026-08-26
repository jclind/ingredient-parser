// Ingredients that genuinely cost nothing.
//
// The package treats a provider price of `0` as "no data" (`usablePrice` in
// price.ts), so a real zero needs its own signal rather than a number that gets
// swallowed. That signal is `basis: 'free'` with high confidence, which a UI
// renders as a plain $0.00 instead of an estimate or a "needs price" nag.
//
// Two independent reasons a row can be free, deliberately kept apart:
//
//   by name    — tap water. It converts to grams accurately and then gets
//                multiplied by the provider's per-gram price for BOTTLED water,
//                so every soup and pasta recipe reads more expensive than it is.
//   by purpose — "salt and pepper to taste". No amount exists to price, and the
//                phrase is what says so.

import type { Purpose } from '../core/descriptors.js'
import type { Price } from './types.js'

/**
 * The price of something free. A fresh object each call, so a consumer that
 * mutates what it's handed can't poison every later free row.
 */
export const freePrice = (): Price => ({
  cents: 0,
  basis: 'free',
  grams: null,
  perGramCents: null,
  confidence: 'high',
})

// Exact names only. A substring rule on "water" would zero coconut water,
// sparkling water, tonic water and rose water, all of which you buy. Parse
// hands us a lowercased name with descriptors already split out, so the forms
// below are what actually arrives.
const FREE_NAMES = new Set([
  'water',
  'tap water',
  'cold water',
  'cool water',
  'warm water',
  'lukewarm water',
  'hot water',
  'boiling water',
  'ice water',
  'iced water',
  'filtered water',
  'room temperature water',
  'ice',
  'ice cubes',
])

/**
 * True when the ingredient is free no matter how much of it a recipe uses.
 * Deliberately narrow: everything here is something you get from a tap or a
 * freezer, and anything you'd put in a shopping basket stays priced.
 */
export function isFreeIngredient(name: string | null | undefined): boolean {
  if (!name) return false
  return FREE_NAMES.has(name.trim().toLowerCase().replace(/\s+/g, ' '))
}

// Purpose phrases that mean "no measurable amount", as opposed to "a small
// amount of a real ingredient". A garnish costs something and is left out on
// purpose: zeroing "cilantro, for garnish" would understate the recipe, which
// is the exact failure this whole line of work exists to kill.
const UNMEASURED_PURPOSES = new Set<Purpose>(['to taste', 'as needed'])

/**
 * True when a purpose phrase says the amount is negligible.
 *
 * Requires the phrase AND the absence of any measure. The phrase alone isn't
 * enough, since "1 tsp salt to taste" has a real amount that should be priced.
 * The missing measure alone is very much not enough either: a bare "flour" has
 * an UNKNOWN cost, not a free one.
 */
export function isNegligibleAmount(
  purpose: Purpose | null | undefined,
  quantity: number | null,
  hasUnit: boolean
): boolean {
  if (!purpose || !UNMEASURED_PURPOSES.has(purpose)) return false
  return quantity === null && !hasUnit
}
