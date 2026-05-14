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

  describe('P1 — tricky real-world inputs', () => {
    describe('parenthetical sizes before unit', () => {
      it('handles parenthetical size before unit', () => {
        const input = '1 (14 oz) can coconut milk'
        const r = parseIngredientString(input)
        expect(r.quantity).toBe(1)
        expect(r.unit).toBe('can')
        expect(r.ingredient).toBe('coconut milk')
        expect(r.comment).toContain('14 oz')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles plural cans with parenthetical', () => {
        const input = '2 (15 oz) cans chickpeas'
        const r = parseIngredientString(input)
        expect(r.quantity).toBe(2)
        expect(r.ingredient).toBe('chickpeas')
        expect(r.comment).toContain('15 oz')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles dual unit annotation', () => {
        const input = '1 cup (240ml) milk'
        const r = parseIngredientString(input)
        expect(r.quantity).toBe(1)
        expect(r.unit).toBe('cup')
        expect(r.ingredient).toBe('milk')
        expect(r.comment).toContain('240ml')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles weight + volume equivalence', () => {
        const input = '8 oz (1 cup) sour cream'
        const r = parseIngredientString(input)
        expect(r.quantity).toBe(8)
        expect(r.unit).toBe('ounce')
        expect(r.comment).toContain('1 cup')
        expect(r.originalIngredientString).toBe(input)
      })
    })

    describe('hyphenated ingredients', () => {
      it('handles extra-virgin olive oil', () => {
        const input = '1 tbsp extra-virgin olive oil'
        const r = parseIngredientString(input)
        expect(r.ingredient).toBe('extra-virgin olive oil')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles self-rising flour', () => {
        const input = '2 cups self-rising flour'
        const r = parseIngredientString(input)
        expect(r.ingredient).toBe('self-rising flour')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles sun-dried tomatoes', () => {
        const input = '1/4 cup sun-dried tomatoes'
        const r = parseIngredientString(input)
        expect(r.ingredient).toBe('sun-dried tomatoes')
        expect(r.originalIngredientString).toBe(input)
      })

      it('preserves comma-separated hyphenated descriptors in the ingredient name', () => {
        const input = '4 bone-in, skin-on chicken thighs'
        const r = parseIngredientString(input)
        expect(r.quantity).toBe(4)
        expect(r.ingredient).toBe('bone-in skin-on chicken thighs')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles a single hyphenated descriptor with no comma', () => {
        const r = parseIngredientString('2 boneless chicken breasts')
        expect(r.quantity).toBe(2)
        expect(r.ingredient).toBe('boneless chicken breasts')
      })

      it('handles a chain of three comma-separated descriptors', () => {
        const r = parseIngredientString('6 bone-in, skin-on, free-range chicken thighs')
        expect(r.quantity).toBe(6)
        expect(r.ingredient).toBe('bone-in skin-on free-range chicken thighs')
      })

      it('does not join commas when only one side is a known descriptor', () => {
        // Regression guard: "flour, sifted" must still route "sifted" to comment.
        const r = parseIngredientString('2 cups all-purpose flour, sifted')
        expect(r.ingredient).toBe('all-purpose flour')
        expect(r.comment).toBe('sifted')
      })
    })

    describe('multi-word ingredients with modifiers', () => {
      it('handles vanilla extract', () => {
        const input = '1 tsp vanilla extract'
        const r = parseIngredientString(input)
        expect(r.ingredient).toBe('vanilla extract')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles low-fat Greek yogurt (note: lowercase "greek")', () => {
        const input = '1 cup low-fat Greek yogurt'
        const r = parseIngredientString(input)
        expect(r.ingredient).toBe('low-fat greek yogurt')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles fresh lemon juice', () => {
        const input = '2 tablespoons fresh lemon juice'
        const r = parseIngredientString(input)
        expect(r.ingredient).toContain('lemon juice')
        expect(r.originalIngredientString).toBe(input)
      })

      it('strips "freshly" modifier from ingredient', () => {
        const input = '1 cup freshly grated Parmesan'
        const r = parseIngredientString(input)
        expect(r.ingredient).toBe('parmesan')
        expect(r.originalIngredientString).toBe(input)
      })
    })

    describe('compound ingredients', () => {
      it('handles "salt and pepper to taste"', () => {
        const input = 'salt and pepper to taste'
        const r = parseIngredientString(input)
        expect(r.ingredient).toContain('salt')
        expect(r.quantity).toBe(0)
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles "salt to taste" without quantity', () => {
        const input = 'salt to taste'
        const r = parseIngredientString(input)
        expect(r.ingredient).toContain('salt')
        expect(r.quantity).toBe(0)
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles bare ingredient "pepper"', () => {
        const input = 'pepper'
        const r = parseIngredientString(input)
        expect(r.ingredient).toBe('pepper')
        expect(r.quantity).toBe(0)
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles "salt & pepper" with ampersand', () => {
        const input = 'salt & pepper'
        const r = parseIngredientString(input)
        expect(r.ingredient).toContain('salt')
        expect(r.originalIngredientString).toBe(input)
      })
    })

    describe('informal quantities', () => {
      it('handles "a pinch of salt"', () => {
        const input = 'a pinch of salt'
        const r = parseIngredientString(input)
        expect(r.unit).toBe('pinch')
        expect(r.ingredient).toBe('salt')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles "a handful of raisins"', () => {
        const input = 'a handful of raisins'
        const r = parseIngredientString(input)
        expect(r.unit).toBe('handful')
        expect(r.ingredient).toBe('raisins')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles "handful spinach" without article', () => {
        const input = 'handful spinach'
        const r = parseIngredientString(input)
        expect(r.quantity).toBe(1)
        expect(r.unit).toBe('handful')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles "dash of hot sauce"', () => {
        const input = 'dash of hot sauce'
        const r = parseIngredientString(input)
        expect(r.unit).toBe('dash')
        expect(r.originalIngredientString).toBe(input)
      })
    })

    describe('inverted format (quantity after ingredient)', () => {
      it('handles "juice of 1 lemon"', () => {
        const input = 'juice of 1 lemon'
        const r = parseIngredientString(input)
        expect(r.ingredient).toContain('lemon')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles "zest of 2 oranges"', () => {
        const input = 'zest of 2 oranges'
        const r = parseIngredientString(input)
        expect(r.ingredient).toContain('orange')
        expect(r.originalIngredientString).toBe(input)
      })
    })
  })

  describe('P2 — extended quantity formats', () => {
    describe('simple fractions beyond 1/2 and 3/4', () => {
      it('handles 1/3 cup honey', () => {
        const input = '1/3 cup honey'
        const r = parseIngredientString(input)
        expect(r.quantity).toBeCloseTo(0.333, 2)
        expect(r.unit).toBe('cup')
        expect(r.ingredient).toBe('honey')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles 2/3 cup breadcrumbs', () => {
        const input = '2/3 cup breadcrumbs'
        const r = parseIngredientString(input)
        expect(r.quantity).toBeCloseTo(0.666, 1)
        expect(r.unit).toBe('cup')
        expect(r.ingredient).toBe('breadcrumbs')
        expect(r.originalIngredientString).toBe(input)
      })
    })

    describe('mixed numbers with different fractions', () => {
      it('handles 2 1/4 teaspoons yeast', () => {
        const input = '2 1/4 teaspoons yeast'
        const r = parseIngredientString(input)
        expect(r.quantity).toBe(2.25)
        expect(r.unit).toBe('teaspoon')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles 1 1/2 cups broth', () => {
        const input = '1 1/2 cups broth'
        const r = parseIngredientString(input)
        expect(r.quantity).toBe(1.5)
        expect(r.unit).toBe('cup')
        expect(r.originalIngredientString).toBe(input)
      })
    })

    describe('decimal quantities', () => {
      it('handles 0.5 cups cream', () => {
        const input = '0.5 cups cream'
        const r = parseIngredientString(input)
        expect(r.quantity).toBe(0.5)
        expect(r.unit).toBe('cup')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles 0.25 teaspoon nutmeg', () => {
        const input = '0.25 teaspoon nutmeg'
        const r = parseIngredientString(input)
        expect(r.quantity).toBe(0.25)
        expect(r.unit).toBe('teaspoon')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles 1.5 lbs shrimp', () => {
        const input = '1.5 lbs shrimp'
        const r = parseIngredientString(input)
        expect(r.quantity).toBe(1.5)
        expect(r.unit).toBe('pound')
        expect(r.originalIngredientString).toBe(input)
      })
    })

    describe('large whole numbers', () => {
      it('handles 10 cups stock', () => {
        const input = '10 cups stock'
        const r = parseIngredientString(input)
        expect(r.quantity).toBe(10)
        expect(r.unit).toBe('cup')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles 100 grams chocolate', () => {
        const input = '100 grams chocolate'
        const r = parseIngredientString(input)
        expect(r.quantity).toBe(100)
        expect(r.unit).toBe('gram')
        expect(r.originalIngredientString).toBe(input)
      })
    })

    describe('zero quantity', () => {
      it('handles 0 cups flour as qty 0', () => {
        const input = '0 cups flour'
        const r = parseIngredientString(input)
        expect(r.quantity).toBe(0)
        expect(r.originalIngredientString).toBe(input)
      })
    })

    describe('range quantities (minQty / maxQty)', () => {
      it('parses "1-2 cups pasta" with range', () => {
        const input = '1-2 cups pasta'
        const r = parseIngredientString(input)
        expect(r.quantity).toBe(1)
        expect(r.minQty).toBe(1)
        expect(r.maxQty).toBe(2)
        expect(r.originalIngredientString).toBe(input)
      })

      it('parses "2 to 3 tablespoons capers" with range', () => {
        const input = '2 to 3 tablespoons capers'
        const r = parseIngredientString(input)
        expect(r.quantity).toBe(2)
        expect(r.minQty).toBe(2)
        expect(r.maxQty).toBe(3)
        expect(r.originalIngredientString).toBe(input)
      })
    })

    describe('approximation qualifiers', () => {
      it('handles "about 1 cup oats"', () => {
        const input = 'about 1 cup oats'
        const r = parseIngredientString(input)
        expect(r.quantity).toBe(1)
        expect(r.unit).toBe('cup')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles "roughly 2 tablespoons butter"', () => {
        const input = 'roughly 2 tablespoons butter'
        const r = parseIngredientString(input)
        expect(r.quantity).toBe(2)
        expect(r.unit).toBe('tablespoon')
        expect(r.originalIngredientString).toBe(input)
      })
    })
  })

  describe('P2 — extended unit coverage', () => {
    describe('volume units', () => {
      it('handles fluid ounce', () => {
        const input = '1 fl oz lemon juice'
        const r = parseIngredientString(input)
        expect(r.unit).toBe('fluid ounce')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles pint', () => {
        const input = '1 pint cream'
        const r = parseIngredientString(input)
        expect(r.unit).toBe('pint')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles quart', () => {
        const input = '1 quart stock'
        const r = parseIngredientString(input)
        expect(r.unit).toBe('quart')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles gallon', () => {
        const input = '1 gallon water'
        const r = parseIngredientString(input)
        expect(r.unit).toBe('gallon')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles liter', () => {
        const input = '1 liter broth'
        const r = parseIngredientString(input)
        expect(r.unit).toBe('liter')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles milliliter', () => {
        const input = '1 ml vanilla'
        const r = parseIngredientString(input)
        expect(r.unit).toBe('milliliter')
        expect(r.originalIngredientString).toBe(input)
      })
    })

    describe('weight units', () => {
      it('handles ounce', () => {
        const input = '1 oz cream cheese'
        const r = parseIngredientString(input)
        expect(r.unit).toBe('ounce')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles gram', () => {
        const input = '1 gram saffron'
        const r = parseIngredientString(input)
        expect(r.unit).toBe('gram')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles kilogram', () => {
        const input = '1 kilogram potatoes'
        const r = parseIngredientString(input)
        expect(r.unit).toBe('kilogram')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles kg abbreviation', () => {
        const input = '1 kg flour'
        const r = parseIngredientString(input)
        expect(r.unit).toBe('kilogram')
        expect(r.originalIngredientString).toBe(input)
      })
    })

    describe('count / no unit items', () => {
      it('handles bananas with no unit', () => {
        const input = '3 bananas'
        const r = parseIngredientString(input)
        expect(r.quantity).toBe(3)
        expect(r.ingredient).toBe('bananas')
        expect(r.unit).toBeNull()
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles onion with no unit', () => {
        const input = '1 onion'
        const r = parseIngredientString(input)
        expect(r.ingredient).toBe('onion')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles strips of bacon', () => {
        const input = '6 strips bacon'
        const r = parseIngredientString(input)
        expect(r.quantity).toBe(6)
        expect(r.unit).toBe('strip')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles sprig of thyme', () => {
        const input = '1 sprig thyme'
        const r = parseIngredientString(input)
        expect(r.unit).toBe('sprig')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles bay leaves', () => {
        const input = '2 bay leaves'
        const r = parseIngredientString(input)
        expect(r.quantity).toBe(2)
        expect(r.unit).toBe('bay leaf')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles sheet of puff pastry', () => {
        const input = '1 sheet puff pastry'
        const r = parseIngredientString(input)
        expect(r.unit).toBe('sheet')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles package of cream cheese', () => {
        const input = '1 package cream cheese'
        const r = parseIngredientString(input)
        expect(r.unit).toBe('package')
        expect(r.originalIngredientString).toBe(input)
      })
    })

    describe('unit abbreviation variants', () => {
      it('handles tbs variation', () => {
        const input = '1 tbs oil'
        const r = parseIngredientString(input)
        expect(r.unit).toBe('tablespoon')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles tblsp variation', () => {
        const input = '2 tblsp soy sauce'
        const r = parseIngredientString(input)
        expect(r.unit).toBe('tablespoon')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles tbsp with period', () => {
        const input = '1 tbsp. olive oil'
        const r = parseIngredientString(input)
        expect(r.unit).toBe('tablespoon')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles uncommon dessertspoon', () => {
        const input = '1 dessertspoon honey'
        const r = parseIngredientString(input)
        expect(r.unit).toBe('dessertspoon')
        expect(r.originalIngredientString).toBe(input)
      })
    })

    describe('unit modifiers before unit', () => {
      it('handles heaped modifier', () => {
        const input = '1 heaped tablespoon flour'
        const r = parseIngredientString(input)
        expect(r.unit).toBe('tablespoon')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles rounded modifier', () => {
        const input = '1 rounded teaspoon baking soda'
        const r = parseIngredientString(input)
        expect(r.unit).toBe('teaspoon')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles level modifier', () => {
        const input = '2 level teaspoons sugar'
        const r = parseIngredientString(input)
        expect(r.unit).toBe('teaspoon')
        expect(r.originalIngredientString).toBe(input)
      })

      it('handles scant modifier', () => {
        const input = '1 scant cup milk'
        const r = parseIngredientString(input)
        expect(r.unit).toBe('cup')
        expect(r.originalIngredientString).toBe(input)
      })
    })
  })

  describe('P2 — extended comment / preparation variations', () => {
    it('handles finely chopped comment', () => {
      const input = '1 onion, finely chopped'
      const r = parseIngredientString(input)
      expect(r.ingredient).toBe('onion')
      expect(r.comment).toBe('finely chopped')
      expect(r.originalIngredientString).toBe(input)
    })

    it('handles packed comment', () => {
      const input = '1 cup spinach, packed'
      const r = parseIngredientString(input)
      expect(r.comment).toBe('packed')
      expect(r.originalIngredientString).toBe(input)
    })

    it('handles zested and juiced comment', () => {
      const input = '1 lemon, zested and juiced'
      const r = parseIngredientString(input)
      expect(r.comment).toBe('zested and juiced')
      expect(r.originalIngredientString).toBe(input)
    })

    it('handles shredded with optional comment', () => {
      const input = '1 cup cheese, shredded (optional)'
      const r = parseIngredientString(input)
      expect(r.comment).toContain('shredded')
      expect(r.comment).toContain('optional')
      expect(r.originalIngredientString).toBe(input)
    })

    it('handles divided comment', () => {
      const input = '1 cup heavy cream, divided'
      const r = parseIngredientString(input)
      expect(r.comment).toBe('divided')
      expect(r.originalIngredientString).toBe(input)
    })

    it('handles roughly chopped comment', () => {
      const input = '1/2 cup nuts, roughly chopped'
      const r = parseIngredientString(input)
      expect(r.comment).toBe('roughly chopped')
      expect(r.originalIngredientString).toBe(input)
    })

    it('handles seeded and diced comment', () => {
      const input = '2 tomatoes, seeded and diced'
      const r = parseIngredientString(input)
      expect(r.comment).toBe('seeded and diced')
      expect(r.originalIngredientString).toBe(input)
    })

    it('handles dash-separated secondary comment', () => {
      const input = '2 eggs, beaten - room temperature'
      const r = parseIngredientString(input)
      expect(r.comment).toContain('beaten')
      expect(r.comment).toContain('room temperature')
      expect(r.originalIngredientString).toBe(input)
    })
  })

  describe('P3 — field-specific tests: symbol field', () => {
    it('sets symbol "c" for cup', () => {
      const input = '1 cup flour'
      const r = parseIngredientString(input)
      expect(r.symbol).toBe('c')
      expect(r.originalIngredientString).toBe(input)
    })

    it('sets symbol "tbs" for tablespoon', () => {
      const input = '2 tablespoons oil'
      const r = parseIngredientString(input)
      expect(r.symbol).toBe('tbs')
      expect(r.originalIngredientString).toBe(input)
    })

    it('sets symbol "tsp" for teaspoon', () => {
      const input = '1 teaspoon salt'
      const r = parseIngredientString(input)
      expect(r.symbol).toBe('tsp')
      expect(r.originalIngredientString).toBe(input)
    })

    it('sets symbol "oz" for ounce', () => {
      const input = '8 oz cheese'
      const r = parseIngredientString(input)
      expect(r.symbol).toBe('oz')
      expect(r.originalIngredientString).toBe(input)
    })

    it('sets symbol "lb" for pound', () => {
      const input = '1 lb beef'
      const r = parseIngredientString(input)
      expect(r.symbol).toBe('lb')
      expect(r.originalIngredientString).toBe(input)
    })

    it('sets symbol "g" for gram', () => {
      const input = '100 g sugar'
      const r = parseIngredientString(input)
      expect(r.symbol).toBe('g')
      expect(r.originalIngredientString).toBe(input)
    })

    it('sets symbol "ml" for milliliter', () => {
      const input = '10 ml vanilla'
      const r = parseIngredientString(input)
      expect(r.symbol).toBe('ml')
      expect(r.originalIngredientString).toBe(input)
    })

    it('sets symbol "lt" for liter', () => {
      const input = '1 liter water'
      const r = parseIngredientString(input)
      expect(r.symbol).toBe('lt')
      expect(r.originalIngredientString).toBe(input)
    })

    it('sets symbol "pt" for pint', () => {
      const input = '1 pint milk'
      const r = parseIngredientString(input)
      expect(r.symbol).toBe('pt')
      expect(r.originalIngredientString).toBe(input)
    })

    it('sets symbol "qt" for quart', () => {
      const input = '1 quart stock'
      const r = parseIngredientString(input)
      expect(r.symbol).toBe('qt')
      expect(r.originalIngredientString).toBe(input)
    })

    it('sets symbol "gal" for gallon', () => {
      const input = '1 gallon water'
      const r = parseIngredientString(input)
      expect(r.symbol).toBe('gal')
      expect(r.originalIngredientString).toBe(input)
    })
  })

  describe('P3 — field-specific tests: unitPlural field', () => {
    it('sets unitPlural for quantity > 1', () => {
      const input = '2 cups flour'
      const r = parseIngredientString(input)
      expect(r.unit).toBe('cup')
      expect(r.unitPlural).toBe('cups')
      expect(r.originalIngredientString).toBe(input)
    })

    it('sets unitPlural for tablespoons (plural)', () => {
      const input = '3 tablespoons oil'
      const r = parseIngredientString(input)
      expect(r.unit).toBe('tablespoon')
      expect(r.unitPlural).toBe('tablespoons')
      expect(r.originalIngredientString).toBe(input)
    })

    it('handles unitPlural for teaspoons (plural)', () => {
      const input = '5 teaspoons sugar'
      const r = parseIngredientString(input)
      expect(r.unit).toBe('teaspoon')
      expect(r.unitPlural).toBe('teaspoons')
      expect(r.originalIngredientString).toBe(input)
    })
  })

  describe('P3 — field-specific tests: originalIngredientString always preserved', () => {
    it.each([
      '1 cup flour, washed',
      '1/2 cup sugar',
      '1-2 cups pasta',
      'salt to taste',
      '2 eggs',
      '½ cup milk',
      '1 (14 oz) can coconut milk',
      '1 tbsp extra-virgin olive oil',
      'a pinch of salt',
      'juice of 1 lemon',
      '1 cup rice (about 185g)',
    ])('preserves original input: "%s"', (input) => {
      const r = parseIngredientString(input)
      expect(r.originalIngredientString).toBe(input)
    })
  })

  describe('P3 — field-specific tests: happy path assertions', () => {
    it('fully asserts on "1 cup rice, washed"', () => {
      const input = '1 cup rice, washed'
      const r = parseIngredientString(input)
      expect(r.quantity).toBe(1)
      expect(r.unit).toBe('cup')
      expect(r.unitPlural).toBe('cups')
      expect(r.symbol).toBe('c')
      expect(r.ingredient).toBe('rice')
      expect(r.originalIngredientString).toBe(input)
      expect(r.minQty).toBe(1)
      expect(r.maxQty).toBe(1)
      expect(r.comment).toBe('washed')
    })

    it('fully asserts on "1/2 cup sugar"', () => {
      const input = '1/2 cup sugar'
      const r = parseIngredientString(input)
      expect(r.quantity).toBe(0.5)
      expect(r.unit).toBe('cup')
      expect(r.ingredient).toBe('sugar')
      expect(r.originalIngredientString).toBe(input)
      expect(r.minQty).toBe(0.5)
      expect(r.maxQty).toBe(0.5)
    })

    it('fully asserts on "1-2 cups pasta"', () => {
      const input = '1-2 cups pasta'
      const r = parseIngredientString(input)
      expect(r.quantity).toBe(1)
      expect(r.minQty).toBe(1)
      expect(r.maxQty).toBe(2)
      expect(r.originalIngredientString).toBe(input)
    })

    it('fully asserts on "2 eggs"', () => {
      const input = '2 eggs'
      const r = parseIngredientString(input)
      expect(r.quantity).toBe(2)
      expect(r.unit).toBeNull()
      expect(r.ingredient).toBe('eggs')
      expect(r.originalIngredientString).toBe(input)
    })
  })

  describe('P4 — internationalization (documents current behavior only)', () => {
    it('documents: German spice "Kurkuma"', () => {
      const input = '1 gram Kurkuma'
      const r = parseIngredientString(input)
      // Just document what it returns, don't assert correctness
      expect(r.originalIngredientString).toBe(input)
    })

    it('documents: German units and ingredients "Milch"', () => {
      const input = '200 ml Milch'
      const r = parseIngredientString(input)
      expect(r.originalIngredientString).toBe(input)
    })

    it('documents: French "tasse farine"', () => {
      const input = '1 tasse farine'
      const r = parseIngredientString(input)
      expect(r.originalIngredientString).toBe(input)
    })

    it('documents: Spanish "cucharadas aceite"', () => {
      const input = '2 cucharadas aceite'
      const r = parseIngredientString(input)
      expect(r.originalIngredientString).toBe(input)
    })

    it('documents: CJK characters with metric "100g 砂糖"', () => {
      const input = '100g 砂糖'
      const r = parseIngredientString(input)
      expect(r.originalIngredientString).toBe(input)
    })

    it('documents: Japanese unit "合 米"', () => {
      const input = '1合 米'
      const r = parseIngredientString(input)
      expect(r.originalIngredientString).toBe(input)
    })

    it('documents: Cyrillic "стакан муки"', () => {
      const input = '1 стакан муки'
      const r = parseIngredientString(input)
      expect(r.originalIngredientString).toBe(input)
    })
  })

  describe('edge cases — whitespace and spacing', () => {
    it('handles "1cup flour" (no space between qty and unit)', () => {
      const input = '1cup flour'
      const r = parseIngredientString(input)
      expect(r.originalIngredientString).toBe(input)
    })

    it('handles "1/2cup milk" (fraction, no space)', () => {
      const input = '1/2cup milk'
      const r = parseIngredientString(input)
      expect(r.originalIngredientString).toBe(input)
    })

    it('handles "1.5cups oats" (decimal, no space)', () => {
      const input = '1.5cups oats'
      const r = parseIngredientString(input)
      expect(r.originalIngredientString).toBe(input)
    })

    it('handles "1TBSP salt" (uppercase unit)', () => {
      const input = '1TBSP salt'
      const r = parseIngredientString(input)
      expect(r.originalIngredientString).toBe(input)
    })

    it('handles "1 Cup Sugar" (title-cased)', () => {
      const input = '1 Cup Sugar'
      const r = parseIngredientString(input)
      expect(r.originalIngredientString).toBe(input)
    })

    it('handles "1 TABLESPOON PAPRIKA" (all-caps)', () => {
      const input = '1 TABLESPOON PAPRIKA'
      const r = parseIngredientString(input)
      expect(r.originalIngredientString).toBe(input)
    })

    it('handles leading/trailing/extra whitespace', () => {
      const input = '  2 cups   rice  '
      const r = parseIngredientString(input)
      expect(r.originalIngredientString).toBe(input)
    })

    it('handles multiple internal spaces', () => {
      const input = '2  cups  rice'
      const r = parseIngredientString(input)
      expect(r.originalIngredientString).toBe(input)
    })
  })
})
