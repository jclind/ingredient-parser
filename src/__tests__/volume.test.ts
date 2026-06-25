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
  it('matches by substring', () => {
    expect(lookupDensity('all-purpose flour')).toBe(0.53)
    expect(lookupDensity('extra-virgin olive oil')).toBe(0.92)
    expect(lookupDensity('whole milk')).toBe(1.03)
  })
  it('prefers more specific entries (brown sugar before sugar)', () => {
    expect(lookupDensity('brown sugar')).toBe(0.72)
    expect(lookupDensity('granulated sugar')).toBe(0.85)
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
