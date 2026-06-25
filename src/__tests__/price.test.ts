import { calculatePrice, defaultToGrams } from '../enrich/price'
import type { UnitLike } from '../enrich/price'

const gram: UnitLike = { name: 'gram', type: 'mass' }
const pound: UnitLike = { name: 'pound', type: 'mass' }
const cup: UnitLike = { name: 'cup', type: 'volume' }

describe('calculatePrice — provenance', () => {
  it('gram-accurate path for mass units (high confidence)', () => {
    // 100 g at 0.5 cents/g = 50 cents
    const p = calculatePrice(100, gram, { perGramCents: 0.5, perUnitCents: 999 })
    expect(p).toEqual({
      cents: 50,
      basis: 'gram',
      grams: 100,
      perGramCents: 0.5,
      confidence: 'high',
    })
  })

  it('converts pounds to grams exactly', () => {
    const p = calculatePrice(1, pound, { perGramCents: 1 })
    expect(p?.basis).toBe('gram')
    expect(p?.grams).toBeCloseTo(453.59237)
    expect(p?.cents).toBeCloseTo(453.59)
  })

  it('falls back to unit-estimate for non-convertible units (low confidence)', () => {
    const p = calculatePrice(2, cup, { perGramCents: 5, perUnitCents: 30 })
    expect(p).toEqual({
      cents: 60,
      basis: 'unit-estimate',
      grams: null,
      perGramCents: null,
      confidence: 'low',
    })
  })

  it('uses unit cost when quantity is null', () => {
    const p = calculatePrice(null, gram, { perGramCents: 5, perUnitCents: 30 })
    expect(p).toMatchObject({ cents: 30, basis: 'unit-estimate' })
  })

  it('quantity 0 yields 0 cents (not null)', () => {
    const p = calculatePrice(0, cup, { perUnitCents: 30 })
    expect(p?.cents).toBe(0)
  })

  it('null when no usable price data', () => {
    expect(calculatePrice(2, cup, {})).toBeNull()
  })

  it('falls back to unit-estimate when mass unit lacks a per-gram price', () => {
    const p = calculatePrice(100, gram, { perUnitCents: 30 })
    expect(p).toMatchObject({ basis: 'unit-estimate', cents: 3000 })
  })

  it('does not over-round (no Math.ceil inflation)', () => {
    // 3 g at 0.333 cents/g = 0.999 → rounds to 1.00, not ceil 1.0
    const p = calculatePrice(3, gram, { perGramCents: 0.333 })
    expect(p?.cents).toBe(1)
  })

  it('defaultToGrams declines volume units, converts mass exactly', () => {
    expect(defaultToGrams(1, cup)).toBeNull()
    expect(defaultToGrams(2, gram)).toEqual({ grams: 2, exact: true })
  })

  it('supports a pluggable converter for volume (estimated → low confidence)', () => {
    const toGrams = (q: number, u: UnitLike) =>
      u.name === 'cup' ? { grams: q * 240, exact: false } : null
    const p = calculatePrice(2, cup, { perGramCents: 0.1 }, toGrams)
    expect(p).toMatchObject({ basis: 'gram', grams: 480, cents: 48, confidence: 'low' })
  })

  describe('hardening against out-of-band numeric input', () => {
    it('rejects negative quantity', () => {
      expect(calculatePrice(-5, gram, { perGramCents: 0.2 })).toBeNull()
    })
    it('rejects non-finite quantity (NaN, Infinity)', () => {
      expect(calculatePrice(NaN, gram, { perGramCents: 0.2 })).toBeNull()
      expect(calculatePrice(Infinity, gram, { perGramCents: 0.2 })).toBeNull()
    })
    it('treats non-finite provider prices as absent (no NaN/Infinity cents)', () => {
      expect(calculatePrice(100, gram, { perGramCents: 'x' as unknown as number })).toBeNull()
      expect(calculatePrice(1e308, gram, { perGramCents: 1e308 })).toBeNull()
    })

    it('treats a provider price of exactly 0 as "no data", not confident $0.00', () => {
      // the proxy returns perGramCents:0 for ingredients with no real cost
      expect(calculatePrice(500, gram, { perGramCents: 0, perUnitCents: 0 })).toBeNull()
      // a 0 per-gram falls back to a usable per-unit estimate
      expect(calculatePrice(100, gram, { perGramCents: 0, perUnitCents: 50 })).toMatchObject({
        basis: 'unit-estimate',
        cents: 5000,
      })
    })
  })
})
