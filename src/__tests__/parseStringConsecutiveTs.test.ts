import { parseStringConsecutiveTs } from '../funcs/parseStringConsecutiveTs'

describe('parseStringConsecutiveTs', () => {
  describe('strings with no consecutive Ts — passes straight through', () => {
    it('parses a simple quantity + unit + ingredient', () => {
      const result = parseStringConsecutiveTs('1 cup flour')
      expect(result.quantity).toBe(1)
      expect(result.unit).toBe('cup')
      expect(result.ingredient).toBe('flour')
    })

    it('parses a decimal quantity', () => {
      const result = parseStringConsecutiveTs('0.5 cup milk')
      expect(result.quantity).toBeCloseTo(0.5)
    })

    it('returns quantity 0 and ingredient for a no-unit string', () => {
      const result = parseStringConsecutiveTs('salt')
      expect(result.ingredient).toBe('salt')
      expect(result.quantity).toBe(0)
    })
  })

  describe('strings containing consecutive Ts', () => {
    it('correctly parses "butter" (has tt)', () => {
      const result = parseStringConsecutiveTs('1 cup butter')
      expect(result.ingredient).toBe('butter')
      expect(result.unit).toBe('cup')
    })

    it('correctly parses "butterscotch" (has tt)', () => {
      const result = parseStringConsecutiveTs('1 cup butterscotch')
      expect(result.ingredient).toBe('butterscotch')
    })

    it('correctly parses "cottage cheese" (cottage has tt)', () => {
      const result = parseStringConsecutiveTs('2 cups cottage cheese')
      expect(result.ingredient).toBe('cottage cheese')
    })

    it('correctly parses "kettle corn" (kettle has tt)', () => {
      const result = parseStringConsecutiveTs('1 cup kettle corn')
      expect(result.ingredient).toBe('kettle corn')
    })

    it('correctly parses "peanut butter" (butter has tt)', () => {
      const result = parseStringConsecutiveTs('2 tbsp peanut butter')
      expect(result.ingredient).toBe('peanut butter')
    })

    it('correctly parses "butterscotch chips"', () => {
      const result = parseStringConsecutiveTs('1 cup butterscotch chips')
      expect(result.ingredient).toBe('butterscotch chips')
    })
  })

  describe('tablespoon normalization (pre-processed before this function)', () => {
    // By the time strings reach parseStringConsecutiveTs, tablespoon/tablespoons
    // have already been replaced with 'tbsp' by parseIngredientString.
    // These tests verify that 'tbsp' is still recognised as a unit here.
    it('recognises tbsp as a tablespoon unit', () => {
      const result = parseStringConsecutiveTs('2 tbsp olive oil')
      expect(result.unit).toBe('tablespoon')
    })
  })

  describe('empty / whitespace input', () => {
    it('does not throw on an empty string', () => {
      expect(() => parseStringConsecutiveTs('')).not.toThrow()
    })

    it('does not throw on a whitespace-only string', () => {
      expect(() => parseStringConsecutiveTs('   ')).not.toThrow()
    })
  })
})
