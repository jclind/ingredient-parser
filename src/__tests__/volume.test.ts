import { volumeToMl, lookupDensity, makeDensityToGrams } from '../enrich/volume'
import type { UnitLike } from '../enrich/price'

const cup: UnitLike = { name: 'cup', type: 'volume' }
const tbsp: UnitLike = { name: 'tablespoon', type: 'volume' }
const gram: UnitLike = { name: 'gram', type: 'mass' }
const can: UnitLike = { name: 'can', type: 'count' }

describe('volumeToMl', () => {
  it('converts known volume units', () => {
    expect(volumeToMl(1, 'cup')).toBeCloseTo(236.588)
    expect(volumeToMl(2, 'tablespoon')).toBeCloseTo(29.5736)
    expect(volumeToMl(1, 'liter')).toBe(1000)
  })
  it('null for unknown unit', () => {
    expect(volumeToMl(1, 'sprig')).toBeNull()
  })
})

describe('lookupDensity', () => {
  it('matches a term anywhere in the name', () => {
    expect(lookupDensity('all-purpose flour')).toBe(0.53)
    expect(lookupDensity('extra-virgin olive oil')).toBe(0.92)
    expect(lookupDensity('whole milk')).toBe(1.03)
  })

  it('matches whole words, not raw substrings', () => {
    // "boiling water".includes("oil") is true, so this used to return oil's
    // 0.92 and price boiling water like cooking oil.
    expect(lookupDensity('boiling water')).toBe(1.0)
    // and the mirror image: "watermelon" must not resolve to water.
    expect(lookupDensity('watermelon')).toBeNull()
  })

  it('prefers the longest matching term, whatever the table order', () => {
    expect(lookupDensity('brown sugar')).toBe(0.72)
    expect(lookupDensity('granulated sugar')).toBe(0.85)
    expect(lookupDensity('peanut butter')).toBe(1.08) // over 'butter' and 'peanut'
    expect(lookupDensity('cream cheese')).toBe(0.98) // over 'cream'
    // 'buttermilk' was unreachable under substring matching: 'butter' hit first
    // and claimed it at 0.911.
    expect(lookupDensity('buttermilk')).toBe(1.03)
  })

  it('handles plurals', () => {
    expect(lookupDensity('rolled oats')).toBe(0.38)
    expect(lookupDensity('chopped carrots')).toBe(0.54)
    expect(lookupDensity('chocolate chips')).toBe(0.72)
  })

  it('resolves the ingredients the original 13-entry table missed', () => {
    // The exact list from the prod smoke that filed the bug. Every one of these
    // fell through to the unit estimate and got priced ~236x low.
    const missed = [
      'salsa',
      'yogurt',
      'shredded cheese',
      'black beans',
      'diced tomatoes',
      'onion',
      'corn',
      'rolled oats',
      'breadcrumbs',
      'chopped walnuts',
      'chocolate chips',
      'soy sauce',
    ]
    for (const name of missed) {
      expect(lookupDensity(name)).not.toBeNull()
    }
  })

  it('null for unknown ingredient', () => {
    expect(lookupDensity('parsley')).toBeNull()
  })
})

describe('makeDensityToGrams', () => {
  it('mass units convert exactly regardless of ingredient', () => {
    expect(makeDensityToGrams('anything')(100, gram)).toEqual({ grams: 100, exact: true })
  })
  it('volume + known density → estimated grams (exact: false)', () => {
    const r = makeDensityToGrams('all-purpose flour')(1, cup)
    expect(r?.exact).toBe(false)
    expect(r?.grams).toBeCloseTo(236.588 * 0.53) // ~125.4 g, the canonical cup-of-flour
  })
  it('volume tablespoon of oil', () => {
    const r = makeDensityToGrams('olive oil')(1, tbsp)
    expect(r?.grams).toBeCloseTo(14.7868 * 0.92)
  })
  it('volume + unknown density → null', () => {
    expect(makeDensityToGrams('parsley')(1, cup)).toBeNull()
  })
  it('count units → null', () => {
    expect(makeDensityToGrams('beans')(1, can)).toBeNull()
  })
})
