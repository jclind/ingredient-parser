import { freePrice, isFreeIngredient, isNegligibleAmount } from '../enrich/free'
import { parse } from '../core/parse'

describe('isFreeIngredient', () => {
  it('accepts water you get from a tap', () => {
    for (const name of [
      'water',
      'tap water',
      'cold water',
      'warm water',
      'hot water',
      'boiling water',
      'ice water',
      'filtered water',
      'ice',
    ]) {
      expect(isFreeIngredient(name)).toBe(true)
    }
  })

  // The whole reason this is an exact-match allowlist rather than a word match
  // on "water". Every one of these is something you buy.
  it('rejects waters you buy', () => {
    for (const name of [
      'coconut water',
      'sparkling water',
      'tonic water',
      'rose water',
      'orange blossom water',
      'soda water',
      'mineral water',
      'watermelon',
      'water chestnuts',
      'watercress',
    ]) {
      expect(isFreeIngredient(name)).toBe(false)
    }
  })

  it('normalizes case and whitespace', () => {
    expect(isFreeIngredient('  Boiling   Water ')).toBe(true)
  })

  it('handles null and empty names', () => {
    expect(isFreeIngredient(null)).toBe(false)
    expect(isFreeIngredient('')).toBe(false)
  })

  it('matches the names parse actually produces', () => {
    expect(isFreeIngredient(parse('4 cups boiling water').ingredient.name)).toBe(true)
    expect(isFreeIngredient(parse('1 cup coconut water').ingredient.name)).toBe(false)
  })
})

describe('isNegligibleAmount', () => {
  it('is true for an unmeasured seasoning phrase', () => {
    expect(isNegligibleAmount('to taste', null, false)).toBe(true)
    expect(isNegligibleAmount('as needed', null, false)).toBe(true)
  })

  // The phrase is the trigger, never the missing quantity. A bare "flour" has
  // an unknown cost, not a free one, and zeroing it would understate the recipe.
  it('is false without a phrase, however empty the measure', () => {
    expect(isNegligibleAmount(null, null, false)).toBe(false)
  })

  it('is false when a real amount was given', () => {
    expect(isNegligibleAmount('to taste', 1, true)).toBe(false)
    expect(isNegligibleAmount('to taste', 1, false)).toBe(false)
    expect(isNegligibleAmount('to taste', null, true)).toBe(false)
  })

  // A garnish is a small amount of a real ingredient, not an absent one.
  it('is false for garnish and serving phrases', () => {
    expect(isNegligibleAmount('for garnish', null, false)).toBe(false)
    expect(isNegligibleAmount('for serving', null, false)).toBe(false)
    expect(isNegligibleAmount('for topping', null, false)).toBe(false)
  })
})

describe('freePrice', () => {
  it('is zero cents at high confidence', () => {
    expect(freePrice()).toEqual({
      cents: 0,
      basis: 'free',
      grams: null,
      perGramCents: null,
      confidence: 'high',
    })
  })

  it('returns a fresh object each call', () => {
    const a = freePrice()
    a.cents = 999
    expect(freePrice().cents).toBe(0)
  })
})
