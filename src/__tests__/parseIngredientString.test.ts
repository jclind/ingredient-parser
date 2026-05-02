import { parseIngredientString } from '../funcs/parseIngredientString'

describe('parseIngredientString', () => {
  describe('basic quantity, unit, and ingredient extraction', () => {
    it('parses a standard ingredient string', () => {
      const r = parseIngredientString('1 cup flour')
      expect(r.quantity).toBe(1)
      expect(r.unit).toBe('cup')
      expect(r.ingredient).toBe('flour')
    })

    it('parses a multi-word ingredient', () => {
      const r = parseIngredientString('2 cups chicken broth')
      expect(r.quantity).toBe(2)
      expect(r.unit).toBe('cup')
      expect(r.ingredient).toBe('chicken broth')
    })

    it('parses a decimal quantity', () => {
      const r = parseIngredientString('1.5 cups rice')
      expect(r.quantity).toBeCloseTo(1.5)
    })

    it('always preserves originalIngredientString exactly as passed', () => {
      const input = '2 cups (16 oz) chicken broth, divided'
      expect(parseIngredientString(input).originalIngredientString).toBe(input)
    })
  })

  describe('unit normalisation', () => {
    it('converts "lb" to "pound"', () => {
      const r = parseIngredientString('1 lb chicken breast')
      expect(r.unit).toBe('pound')
      expect(r.quantity).toBe(1)
    })

    it('converts "lbs" to "pound" (plural)', () => {
      const r = parseIngredientString('2 lbs ground beef')
      expect(r.unit).toBe('pound')
      expect(r.quantity).toBe(2)
    })

    it('converts "tablespoon" to "tablespoon" unit', () => {
      const r = parseIngredientString('1 tablespoon olive oil')
      expect(r.unit).toBe('tablespoon')
    })

    it('converts "tablespoons" (plural) to "tablespoon" unit', () => {
      const r = parseIngredientString('2 tablespoons butter')
      expect(r.unit).toBe('tablespoon')
      expect(r.ingredient).toBe('butter')
    })
  })

  describe('unicode fraction handling', () => {
    it('handles a leading unicode fraction (½ cup → 0.5)', () => {
      const r = parseIngredientString('½ cup milk')
      expect(r.quantity).toBeCloseTo(0.5)
      expect(r.unit).toBe('cup')
      expect(r.ingredient).toBe('milk')
    })

    it('handles a leading unicode fraction (¾ tsp → 0.75)', () => {
      const r = parseIngredientString('¾ tsp salt')
      expect(r.quantity).toBeCloseTo(0.75)
    })

    it('handles a mixed number with a space before the fraction (1 ¼ → 1.25)', () => {
      const r = parseIngredientString('1 ¼ cups flour')
      expect(r.quantity).toBeCloseTo(1.25)
      expect(r.unit).toBe('cup')
    })

    it('handles a mixed number with a space before the fraction (2 ⅔ → 2.67)', () => {
      const r = parseIngredientString('2 ⅔ cups sugar')
      expect(r.quantity).toBeCloseTo(2.67, 1)
    })
  })

  // BUG: convertFractions does not insert a space between a digit and an adjacent
  // unicode fraction, so '2½' becomes '21/2' which the upstream parser reads as 10.5.
  // Fix: in convertFractions, insert a space before the fraction when preceded by a digit.
  describe('digit adjacent to unicode fraction (FAILING — known bug)', () => {
    it('parses "2½ cups sugar" as qty 2.5', () => {
      expect(parseIngredientString('2½ cups sugar').quantity).toBeCloseTo(2.5)
    })

    it('parses "1½ cups flour" as qty 1.5', () => {
      expect(parseIngredientString('1½ cups flour').quantity).toBeCloseTo(1.5)
    })

    it('parses "3⅓ cups water" as qty 3.33', () => {
      expect(parseIngredientString('3⅓ cups water').quantity).toBeCloseTo(3.33, 1)
    })
  })

  describe('comment extraction — comma', () => {
    it('extracts text after the first comma as comment', () => {
      const r = parseIngredientString('butter, softened')
      expect(r.ingredient).toBe('butter')
      expect(r.comment).toBe('softened')
    })

    it('extracts comment from a full ingredient string', () => {
      const r = parseIngredientString('2 cups chicken broth, divided')
      expect(r.ingredient).toBe('chicken broth')
      expect(r.comment).toBe('divided')
    })

    it('extracts a multi-word comment', () => {
      const r = parseIngredientString('2 cups all-purpose flour, sifted twice')
      expect(r.comment).toBe('sifted twice')
    })

    it('extracts comment when both quantity and comment are present', () => {
      const r = parseIngredientString('2 cloves garlic, minced')
      expect(r.ingredient).toBe('garlic')
      expect(r.comment).toBe('minced')
    })
  })

  describe('comment extraction — parentheses', () => {
    it('moves parenthetical text into comment', () => {
      const r = parseIngredientString('1 (14 oz) can diced tomatoes')
      expect(r.ingredient).toBe('diced tomatoes')
      expect(r.comment).toContain('14 oz')
    })

    it('moves inline parenthetical into comment', () => {
      const r = parseIngredientString('1 cup (8 oz) sour cream')
      expect(r.ingredient).toBe('sour cream')
      expect(r.comment).toContain('8 oz')
    })
  })

  describe('comment extraction — comma and parentheses combined', () => {
    it('merges both comma text and parenthetical text into comment', () => {
      const r = parseIngredientString('1 (14 oz) can diced tomatoes, drained')
      expect(r.ingredient).toBe('diced tomatoes')
      expect(r.comment).toContain('drained')
      expect(r.comment).toContain('14 oz')
    })

    it('handles parentheses with a comma inside them (comment only, no split)', () => {
      const r = parseIngredientString('1 (8 oz, drained) can chickpeas')
      expect(r.ingredient).toBe('chickpeas')
      expect(r.comment).toContain('8 oz, drained')
    })
  })

  describe('no comment', () => {
    it('returns an empty string for comment when there is no comma or parentheses', () => {
      expect(parseIngredientString('1 cup flour').comment).toBe('')
    })
  })

  describe('descriptor word stripping', () => {
    it('strips "fresh" from the ingredient name', () => {
      expect(parseIngredientString('1 cup fresh basil').ingredient).toBe('basil')
    })

    it('strips "canned" from the ingredient name', () => {
      expect(parseIngredientString('1 can canned beans').ingredient).toBe('beans')
    })

    it('strips multiple descriptor words', () => {
      const r = parseIngredientString('1 cup fresh canned tomatoes')
      expect(r.ingredient).not.toContain('fresh')
      expect(r.ingredient).not.toContain('canned')
    })
  })

  // BUG: the upstream parser consumes size words (small, medium, large) as the
  // unit when they appear before a noun (e.g. "1 small yellow onion" → unit: "small").
  // The wordsToRemove strip only runs on the ingredient string; by that point these
  // words are already in the `unit` field and not in the ingredient string.
  // Fix: after parsing, if `unit` is one of the descriptor words, set it to null.
  describe('size descriptor words (FAILING — known bug)', () => {
    it('parses "3 large eggs" with unit null and ingredient "eggs"', () => {
      const r = parseIngredientString('3 large eggs')
      expect(r.unit).toBeNull()
      expect(r.ingredient).toBe('eggs')
    })

    it('parses "2 medium onions" with unit null', () => {
      expect(parseIngredientString('2 medium onions').unit).toBeNull()
    })

    it('parses "1 small yellow onion" with unit null', () => {
      expect(parseIngredientString('1 small yellow onion').unit).toBeNull()
    })
  })

  describe('ingredients with consecutive-T words', () => {
    it('correctly restores "butter"', () => {
      expect(parseIngredientString('2 tbsp butter').ingredient).toBe('butter')
    })

    it('correctly restores "peanut butter"', () => {
      expect(parseIngredientString('2 tbsp peanut butter').ingredient).toBe('peanut butter')
    })

    it('correctly restores "butterscotch chips"', () => {
      expect(parseIngredientString('1 cup butterscotch chips').ingredient).toBe('butterscotch chips')
    })

    it('correctly restores "cottage cheese"', () => {
      expect(parseIngredientString('2 cups cottage cheese').ingredient).toBe('cottage cheese')
    })
  })

  describe('edge cases — no quantity, no unit, or empty input', () => {
    it('returns ingredient with qty 0 when there is no number', () => {
      const r = parseIngredientString('butter')
      expect(r.ingredient).toBe('butter')
      expect(r.quantity).toBe(0)
    })

    it('returns null ingredient when there is only a unit and quantity', () => {
      const r = parseIngredientString('1 cup')
      expect(r.ingredient).toBe('')
      expect(r.unit).toBe('cup')
    })

    it('does not throw on an empty string', () => {
      expect(() => parseIngredientString('')).not.toThrow()
    })

    it('does not throw on a whitespace-only string', () => {
      expect(() => parseIngredientString('   ')).not.toThrow()
    })

    it('handles "to taste" ingredients without throwing', () => {
      // Upstream parser drops "to" as a preposition; documents current behaviour.
      const r = parseIngredientString('salt to taste')
      expect(r.ingredient).toContain('salt')
      expect(() => parseIngredientString('salt to taste')).not.toThrow()
    })

    it('handles an all-purpose flour string with a hyphen', () => {
      const r = parseIngredientString('2 cups all-purpose flour')
      expect(r.ingredient).toBe('all-purpose flour')
    })
  })
})
