import { parse } from '../core/parse'

describe('parse — v2 rich output', () => {
  describe('quantity structure', () => {
    it('null value when no quantity present', () => {
      expect(parse('butter').quantity.value).toBeNull()
    })

    it('literal zero stays zero', () => {
      expect(parse('0 cups flour').quantity.value).toBe(0)
    })

    it('1/0 is treated as 0, not Infinity', () => {
      expect(parse('1/0 cups milk').quantity.value).toBe(0)
    })

    it('range exposes min/max/isRange', () => {
      const q = parse('1-2 cups pasta').quantity
      expect(q).toMatchObject({ value: 1, min: 1, max: 2, isRange: true })
    })

    it('"to" range', () => {
      const q = parse('2 to 3 tablespoons capers').quantity
      expect(q).toMatchObject({ value: 2, min: 2, max: 3, isRange: true })
    })

    it('approximation flag', () => {
      expect(parse('about 1 cup oats').quantity.isApproximate).toBe(true)
      expect(parse('1 cup oats').quantity.isApproximate).toBe(false)
    })

    it('mixed number', () => {
      expect(parse('1 1/2 cups broth').quantity.value).toBe(1.5)
    })
  })

  describe('unit object', () => {
    it('carries type + system', () => {
      expect(parse('2 tbsp butter').unit).toMatchObject({
        name: 'tablespoon',
        plural: 'tablespoons',
        symbol: 'tbs',
        type: 'volume',
        system: 'us',
      })
    })

    it('null unit for count nouns', () => {
      expect(parse('3 eggs').unit).toBeNull()
    })

    it('metric mass', () => {
      expect(parse('100 grams chocolate').unit).toMatchObject({
        name: 'gram',
        type: 'mass',
        system: 'metric',
      })
    })

    it('multi-word unit "bay leaf"', () => {
      expect(parse('2 bay leaves').unit?.name).toBe('bay leaf')
    })
  })

  describe('descriptors preserved (not discarded)', () => {
    it('keeps size descriptor', () => {
      const r = parse('3 large eggs')
      expect(r.ingredient.name).toBe('eggs')
      expect(r.ingredient.descriptors).toContain('large')
      expect(r.unit).toBeNull()
    })

    it('keeps quality descriptor', () => {
      const r = parse('1 cup fresh basil')
      expect(r.ingredient.name).toBe('basil')
      expect(r.ingredient.descriptors).toContain('fresh')
    })

    it('does not strip identity-changing words like "ground"', () => {
      expect(parse('2 lbs ground beef').ingredient.name).toBe('ground beef')
    })

    it('keeps hyphenated compounds intact', () => {
      expect(parse('1 tbsp extra-virgin olive oil').ingredient.name).toBe(
        'extra-virgin olive oil'
      )
    })
  })

  describe('preparation extraction', () => {
    it('from inline word', () => {
      expect(parse('1 cup freshly grated parmesan').ingredient.preparation).toContain(
        'grated'
      )
    })

    it('from comment', () => {
      const r = parse('1 onion, finely chopped')
      expect(r.ingredient.name).toBe('onion')
      expect(r.comment).toBe('finely chopped')
      expect(r.ingredient.preparation).toContain('chopped')
    })

    it('multiple prep verbs from comment', () => {
      expect(parse('2 tomatoes, seeded and diced').ingredient.preparation).toEqual(
        expect.arrayContaining(['seeded', 'diced'])
      )
    })

    it('deduped across inline + comment', () => {
      const prep = parse('1 cup grated cheese, grated').ingredient.preparation
      expect(prep.filter(p => p === 'grated')).toHaveLength(1)
    })
  })

  describe('inverted form', () => {
    it('"juice of 1 lemon"', () => {
      const r = parse('juice of 1 lemon')
      expect(r.quantity.value).toBe(1)
      expect(r.ingredient.name).toBe('lemon')
      expect(r.ingredient.preparation).toContain('juice')
    })

    it('"zest of 2 oranges"', () => {
      const r = parse('zest of 2 oranges')
      expect(r.quantity.value).toBe(2)
      expect(r.ingredient.name).toBe('oranges')
      expect(r.ingredient.preparation).toContain('zest')
    })
  })

  describe('audit-fix regressions', () => {
    it('mixed-number low bound in a range parses (was "-2 cups flour")', () => {
      const r = parse('1 1/2-2 cups flour')
      expect(r.quantity).toMatchObject({ value: 1.5, min: 1.5, max: 2, isRange: true })
      expect(r.unit?.name).toBe('cup')
      expect(r.ingredient.name).toBe('flour')
    })

    it('informal path runs comment + purpose cleanup (was name "salt, to taste")', () => {
      expect(parse('a pinch of salt, to taste').ingredient.name).toBe('salt')
    })

    it('informal path lifts parenthetical to comment', () => {
      const r = parse('a pinch of salt (about 1/4 tsp)')
      expect(r.ingredient.name).toBe('salt')
      expect(r.comment).toBe('about 1/4 tsp')
    })

    it('informal unit with no ingredient ("a pinch")', () => {
      const r = parse('a pinch')
      expect(r.unit?.name).toBe('pinch')
      expect(r.ingredient.name).toBe('')
    })

    it('strips connective "of" after a real unit', () => {
      expect(parse('1 liter of milk').ingredient.name).toBe('milk')
    })

    it('skips a run of stacked unit modifiers', () => {
      expect(parse('1 heaped level tablespoon flour').unit?.name).toBe('tablespoon')
    })

    it('comment is null (not "") when absent', () => {
      expect(parse('1 cup flour').comment).toBeNull()
    })

    it('leading-dot decimals parse (M1: was dropping qty + unit)', () => {
      const r = parse('.5 cup sugar')
      expect(r.quantity.value).toBe(0.5)
      expect(r.unit?.name).toBe('cup')
      expect(r.ingredient.name).toBe('sugar')
    })

    it('extracts every parenthetical into the comment (M2)', () => {
      const r = parse('1 cup flour (sifted) (packed)')
      expect(r.ingredient.name).toBe('flour')
      expect(r.comment).toBe('sifted packed')
    })

    it('does not leak a later parenthetical into the name (M2)', () => {
      expect(parse('1 onion (about 1 cup) (diced)').ingredient.name).toBe('onion')
    })

    it('self-naming unit becomes the ingredient (M3: bay leaf)', () => {
      expect(parse('2 bay leaves').ingredient.name).toBe('bay leaf')
      expect(parse('1 bay leaf').ingredient.name).toBe('bay leaf')
    })

    it('leaves a genuinely-incomplete count line empty (not over-correcting)', () => {
      expect(parse('2 cloves').ingredient.name).toBe('')
    })

    it('isApproximate is false when there is no number (L4)', () => {
      expect(parse('about salt').quantity.isApproximate).toBe(false)
    })

    it('leading article + unit → quantity 1 (v1-parity: "a cup of sugar")', () => {
      const r = parse('a cup of sugar')
      expect(r.quantity.value).toBe(1)
      expect(r.unit?.name).toBe('cup')
      expect(r.ingredient.name).toBe('sugar')
    })

    it('"a tablespoon of olive oil"', () => {
      const r = parse('a tablespoon of olive oil')
      expect(r.unit?.name).toBe('tablespoon')
      expect(r.ingredient.name).toBe('olive oil')
    })

    it('does not treat a bare "a <noun>" as a unit', () => {
      expect(parse('a banana').unit).toBeNull()
      expect(parse('a banana').ingredient.name).toContain('banana')
    })

    it('a giant numeric token degrades to null quantity (not Infinity)', () => {
      const r = parse('9'.repeat(400) + ' cups flour')
      expect(r.quantity.value).toBeNull()
      expect(Number.isFinite(r.quantity.value as number) || r.quantity.value === null).toBe(true)
    })

    it('bounds work on adversarial unbalanced-paren input (no O(n^2) hang)', () => {
      const input = '('.repeat(60000)
      const t = Date.now()
      const r = parse(input)
      expect(Date.now() - t).toBeLessThan(150)
      expect(r.original).toBe(input) // full input still preserved
    })
  })

  describe('contract invariants', () => {
    it('preserves original byte-for-byte', () => {
      const input = '  2 CUPS  Rice, RINSED  '
      expect(parse(input).original).toBe(input)
    })

    it('throws TypeError on non-string', () => {
      expect(() => parse(null)).toThrow(TypeError)
      expect(() => parse(42)).toThrow(TypeError)
    })

    it('does not throw on empty / gibberish', () => {
      expect(() => parse('')).not.toThrow()
      expect(() => parse('!!! $$$')).not.toThrow()
    })
  })

  // "1 can (15 oz) black beans" priced as one can and declined, while
  // "15 oz black beans" priced fine. The size on the label was parsed and then
  // left in the comment as prose.
  describe('containerSize — the measure on a container label', () => {
    it('lifts the parenthetical measure off a can', () => {
      const r = parse('1 can (15 oz) black beans, drained and rinsed')
      expect(r.quantity.value).toBe(1)
      expect(r.unit?.name).toBe('can')
      expect(r.containerSize).toEqual({
        value: 15,
        unit: expect.objectContaining({ name: 'ounce', type: 'mass' }),
      })
    })

    it('keeps the measure in the comment too, so display is unchanged', () => {
      const r = parse('1 can (15 oz) black beans, drained and rinsed')
      expect(r.comment).toContain('15 oz')
      expect(r.ingredient.name).toBe('black beans')
    })

    it('handles the parenthetical-before-unit phrasing', () => {
      const r = parse('1 (15 ounce) can black beans')
      expect(r.containerSize?.value).toBe(15)
      expect(r.containerSize?.unit.name).toBe('ounce')
    })

    it('reads "15 ounce can" inside the parens', () => {
      const r = parse('1 (15 ounce can) black beans')
      expect(r.containerSize?.value).toBe(15)
      expect(r.containerSize?.unit.name).toBe('ounce')
    })

    it('is per container, not a total — "2 cans (14.5 oz each)"', () => {
      const r = parse('2 cans (14.5 oz each) diced tomatoes')
      expect(r.quantity.value).toBe(2)
      expect(r.containerSize?.value).toBe(14.5)
    })

    it('reads a bare plural the same way ("2 cans (14.5 oz)")', () => {
      const r = parse('2 cans (14.5 oz) diced tomatoes')
      expect(r.containerSize?.value).toBe(14.5)
    })

    it('handles an approximate size', () => {
      const r = parse('1 package (about 10 oz) frozen spinach')
      expect(r.containerSize?.value).toBe(10)
    })

    it('takes volume measures as well as mass', () => {
      const r = parse('1 bottle (12 fl oz) beer')
      expect(r.unit?.name).toBe('bottle')
      expect(r.containerSize?.unit.name).toBe('fluid ounce')
    })

    it('works across the container vocabulary', () => {
      for (const word of ['jar', 'bottle', 'tin', 'carton', 'container', 'box', 'bag']) {
        const r = parse(`1 ${word} (16 oz) salsa`)
        expect(r.unit?.name).toBe(word)
        expect(r.containerSize?.value).toBe(16)
        // the container word must not leak into the name, which is the string
        // the enricher looks up
        expect(r.ingredient.name).toBe('salsa')
      }
    })

    it('is null when the unit is not a container', () => {
      expect(parse('1 large onion (about 200 g), diced').containerSize).toBeNull()
      expect(parse('2 cups (500 ml) milk').containerSize).toBeNull()
    })

    it('is null when the container has no size', () => {
      expect(parse('1 can black beans').containerSize).toBeNull()
    })

    it('ignores parentheticals that are prose, not measures', () => {
      expect(parse('1 can (optional) black beans').containerSize).toBeNull()
      expect(parse('1 can (drained) black beans').containerSize).toBeNull()
      expect(parse('1 can (or 2 if you like heat) chipotles').containerSize).toBeNull()
    })

    it('ignores a count measure in the parens', () => {
      // "(2 cloves)" is not a size, and pricing 1 x 2 cloves would be wrong
      expect(parse('1 jar (2 cloves) garlic').containerSize).toBeNull()
    })

    it('rejects a zero or missing quantity in the parens', () => {
      expect(parse('1 can (0 oz) black beans').containerSize).toBeNull()
      expect(parse('1 can (oz) black beans').containerSize).toBeNull()
    })
  })
})
