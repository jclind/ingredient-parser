import {
  krogerEstimatedPrices,
  krogerTotalPriceCents,
} from '../funcs/krogerPrice'
import { GRAMS_PER_BASE_UNIT } from '../kroger/units'

describe('krogerEstimatedPrices', () => {
  it('derives a per-gram price for weight units (cents)', () => {
    // $0.10 per oz → 10 cents per oz → 10 / 28.3495 cents per gram
    const prices = krogerEstimatedPrices(0.1, 'oz')
    expect(prices.estimatedSingleUnitPrice).toBeCloseTo(10)
    expect(prices.estimatedGramPrice).toBeCloseTo(10 / GRAMS_PER_BASE_UNIT.oz!)
  })

  it('passes grams straight through', () => {
    const prices = krogerEstimatedPrices(0.02, 'g') // 2 cents/g
    expect(prices.estimatedGramPrice).toBeCloseTo(2)
  })

  it('omits a gram price for count units', () => {
    const prices = krogerEstimatedPrices(0.25, 'ct') // 25 cents each
    expect(prices.estimatedGramPrice).toBeUndefined()
    expect(prices.estimatedSingleUnitPrice).toBeCloseTo(25)
  })
})

describe('krogerTotalPriceCents', () => {
  it('multiplies a per-each price by a unitless recipe quantity', () => {
    // 2 eggs at $0.25/egg → 50 cents
    const total = krogerTotalPriceCents(2, null, { perUnit: 0.25, unit: 'ct' })
    expect(total).toBeCloseTo(50)
  })

  it('prices a weight recipe quantity from a per-oz price', () => {
    // 8 oz at $0.10/oz → 80 cents
    const total = krogerTotalPriceCents(8, 'oz', { perUnit: 0.1, unit: 'oz' })
    expect(total).toBeCloseTo(80, 0)
  })

  it('returns null when the lookup has no usable per-unit price', () => {
    expect(krogerTotalPriceCents(2, 'cup', { perUnit: null, unit: null })).toBeNull()
    expect(krogerTotalPriceCents(2, 'cup', { perUnit: 1.5, unit: null })).toBeNull()
  })
})
