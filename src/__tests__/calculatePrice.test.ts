import { calculatePrice } from '../funcs/calculatePrice'

const price = {
  estimatedGramPrice: 0.005,      // 0.5 cents per gram
  estimatedSingleUnitPrice: 150,  // 150 cents per single unit
}

describe('calculatePrice', () => {
  describe('convertible units', () => {
    it('returns a positive number for 1 cup', () => {
      const result = calculatePrice(1, 'cup', price)
      expect(typeof result).toBe('number')
      expect(result).toBeGreaterThan(0)
    })

    it('returns a positive number for 2 tablespoons', () => {
      expect(calculatePrice(2, 'tablespoon', price)).toBeGreaterThan(0)
    })

    it('returns a positive number for 0.5 pound', () => {
      expect(calculatePrice(0.5, 'pound', price)).toBeGreaterThan(0)
    })

    it('scales linearly with quantity for convertible units', () => {
      const one = calculatePrice(1, 'cup', price)!
      const two = calculatePrice(2, 'cup', price)!
      expect(two).toBeCloseTo(one * 2, 1)
    })

    it('rounds result to 2 decimal places', () => {
      const result = calculatePrice(1, 'cup', price)!
      expect(result).toBe(Math.ceil(result * 100) / 100)
    })

    it('returns 0 when all price data is 0', () => {
      expect(calculatePrice(1, 'cup', { estimatedGramPrice: 0, estimatedSingleUnitPrice: 0 })).toBe(0)
    })
  })

  describe('null inputs', () => {
    it('returns estimatedSingleUnitPrice when quantity is null', () => {
      expect(calculatePrice(null, 'cup', price)).toBe(150)
    })

    it('returns estimatedSingleUnitPrice × quantity when unit is null', () => {
      expect(calculatePrice(1, null, price)).toBe(150)
      expect(calculatePrice(3, null, price)).toBe(450)
    })

    it('returns estimatedSingleUnitPrice when both quantity and unit are null', () => {
      expect(calculatePrice(null, null, price)).toBe(150)
    })
  })

  describe('unrecognized units', () => {
    it('falls back to estimatedSingleUnitPrice × quantity for an unknown unit', () => {
      expect(calculatePrice(1, 'can', price)).toBe(150)
      expect(calculatePrice(2, 'can', price)).toBe(300)
    })

    it('falls back for "handful"', () => {
      expect(calculatePrice(1, 'handful', price)).toBe(150)
    })

    it('falls back for a completely nonsense unit', () => {
      expect(calculatePrice(2, 'zorgblat', price)).toBe(300)
    })
  })

  // BUG: `if (!quantity)` is falsy for 0, so a parsed quantity of 0 (e.g. from
  // "to taste" ingredients) returns estimatedSingleUnitPrice instead of 0.
  // Fix: change the guard to `if (quantity === null)`.
  describe('zero quantity (FAILING — known bug)', () => {
    it('returns 0 price when quantity is exactly 0', () => {
      expect(calculatePrice(0, 'cup', price)).toBe(0)
    })

    it('returns 0 when quantity is 0 and unit is null', () => {
      expect(calculatePrice(0, null, price)).toBe(0)
    })
  })

  describe('edge case inputs', () => {
    it('handles a very large quantity without throwing', () => {
      const result = calculatePrice(1000, 'cup', price)
      expect(typeof result).toBe('number')
    })

    it('handles a fractional (decimal) quantity', () => {
      expect(calculatePrice(0.25, 'cup', price)).toBeGreaterThan(0)
    })

    it('returns a negative price for a negative quantity', () => {
      // The upstream parser strips negatives, so this only occurs via direct
      // API misuse. Documents that the function does not guard against it.
      const result = calculatePrice(-1, 'cup', price)!
      expect(result).toBeLessThan(0)
    })
  })
})
