import { calculatePrice, defaultToGrams } from '../enrich/price'
import type { UnitLike } from '../enrich/price'

const gram: UnitLike = { name: 'gram', type: 'mass' }
const pound: UnitLike = { name: 'pound', type: 'mass' }
const cup: UnitLike = { name: 'cup', type: 'volume' }
const can: UnitLike = { name: 'can', type: 'count' }

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

  it('falls back to unit-estimate for countable units (low confidence)', () => {
    // A can doesn't convert to grams, but "2 cans at 30 cents each" is a
    // sentence that means something, so the estimate stands.
    const p = calculatePrice(2, can, { perGramCents: 5, perUnitCents: 30 })
    expect(p).toEqual({
      cents: 60,
      basis: 'unit-estimate',
      grams: null,
      perGramCents: null,
      confidence: 'low',
    })
  })

  it('uses unit cost when quantity is null and nothing contradicts it', () => {
    const p = calculatePrice(null, null, { perGramCents: 5, perUnitCents: 30 })
    expect(p).toMatchObject({ cents: 30, basis: 'unit-estimate' })
  })

  it('quantity 0 yields 0 cents (not null)', () => {
    const p = calculatePrice(0, can, { perUnitCents: 30 })
    expect(p?.cents).toBe(0)
  })

  it('null when no usable price data', () => {
    expect(calculatePrice(2, cup, {})).toBeNull()
  })

  it('declines a mass measure with no per-gram price', () => {
    // Was 3000 cents: 100 grams priced as 100 whole items. A per-item price
    // says nothing about what a gram costs, so there's no honest answer here.
    expect(calculatePrice(100, gram, { perUnitCents: 30 })).toBeNull()
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
      expect(calculatePrice(100, can, { perGramCents: 0, perUnitCents: 50 })).toMatchObject({
        basis: 'unit-estimate',
        cents: 5000,
      })
    })
  })
})

describe('calculatePrice — the unit-estimate gate', () => {
  // Regression cover for the ~236x volume undercount. Numbers below are the
  // live proxy's, taken from a 20-ingredient probe on 2026-08-25.

  it('declines a volume measure with no density instead of pricing cups as items', () => {
    // `1 1/3 cup salsa`. The old fallback returned 0.52 cents, which Prepify
    // rounded to $0.01 for a third of a jar that really costs about $1.23.
    expect(calculatePrice(1.333, cup, { perGramCents: 0.39, perUnitCents: 0.39 })).toBeNull()
  })

  it('declines a volume measure even when the per-unit price is genuine', () => {
    // Strawberries have a real per-item price and no density entry, so the old
    // fallback made `1 cup strawberries` $0.11 against a real ~$1.28. The
    // category error is in the units, not in the provider's number.
    expect(calculatePrice(1, cup, { perGramCents: 0.89, perUnitCents: 10.71 })).toBeNull()
  })

  it('ignores a per-unit price that merely echoes the per-gram price', () => {
    // A can of black beans: the proxy reports 0.15 for both, because its
    // "price for one unit" lookup resolved that unit to a gram.
    expect(calculatePrice(1, can, { perGramCents: 0.15, perUnitCents: 0.15 })).toBeNull()
  })

  it('keeps a per-unit price that differs from the per-gram price', () => {
    expect(calculatePrice(1, can, { perGramCents: 0.15, perUnitCents: 89 })).toMatchObject({
      cents: 89,
      basis: 'unit-estimate',
    })
  })

  it('still prices a bare count (2 eggs)', () => {
    expect(calculatePrice(2, null, { perGramCents: 0.55, perUnitCents: 24 })).toMatchObject({
      cents: 48,
      basis: 'unit-estimate',
      confidence: 'low',
    })
  })

  it('leaves the gram path alone — a density hit prices the same volume fine', () => {
    // Same salsa inputs, but with a density converter supplying the grams.
    const toGrams = () => ({ grams: 315.5, exact: false })
    expect(
      calculatePrice(1.333, cup, { perGramCents: 0.39, perUnitCents: 0.39 }, toGrams)
    ).toMatchObject({ cents: 123.05, basis: 'gram', confidence: 'low' })
  })
})
