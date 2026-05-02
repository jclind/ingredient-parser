import { convertFractions } from '../funcs/convertFractions'

describe('convertFractions', () => {
  describe('all 18 supported unicode fractions', () => {
    it.each([
      ['¼', '1/4'],
      ['½', '1/2'],
      ['¾', '3/4'],
      ['⅓', '1/3'],
      ['⅔', '2/3'],
      ['⅛', '1/8'],
      ['⅜', '3/8'],
      ['⅝', '5/8'],
      ['⅞', '7/8'],
      ['⅕', '1/5'],
      ['⅖', '2/5'],
      ['⅗', '3/5'],
      ['⅘', '4/5'],
      ['⅙', '1/6'],
      ['⅚', '5/6'],
      ['⅐', '1/7'],
      ['⅑', '1/9'],
      ['⅒', '1/10'],
    ])('converts %s → %s', (unicode, ascii) => {
      expect(convertFractions(unicode)).toBe(ascii)
    })
  })

  describe('embedded in recipe strings', () => {
    it('converts a leading fraction', () => {
      expect(convertFractions('½ cup milk')).toBe('1/2 cup milk')
    })

    it('converts a fraction in the middle of a string', () => {
      expect(convertFractions('add ¾ tsp salt')).toBe('add 3/4 tsp salt')
    })

    it('converts multiple fractions in one string', () => {
      expect(convertFractions('add ½ and ¼ of each')).toBe('add 1/2 and 1/4 of each')
    })

    it('converts a mixed number where there is a space between the digit and fraction', () => {
      expect(convertFractions('1 ¼ cups flour')).toBe('1 1/4 cups flour')
      expect(convertFractions('2 ⅓ cups water')).toBe('2 1/3 cups water')
    })
  })

  describe('passthrough cases', () => {
    it('leaves ASCII fractions unchanged', () => {
      expect(convertFractions('1/2 cup milk')).toBe('1/2 cup milk')
    })

    it('leaves a plain string with no fractions unchanged', () => {
      expect(convertFractions('2 cups flour')).toBe('2 cups flour')
    })

    it('returns an empty string unchanged', () => {
      expect(convertFractions('')).toBe('')
    })
  })

  // BUG: when a digit is immediately adjacent to a unicode fraction (no space),
  // the fraction is substituted without inserting a separator, so '2½' becomes
  // '21/2' instead of '2 1/2'. The upstream parser then reads '21/2' as 10.5.
  // Fix: insert a space before the fraction symbol when preceded by a digit.
  describe('digit adjacent to fraction symbol (FAILING — known bug)', () => {
    it('handles 2½ → 2 1/2', () => {
      expect(convertFractions('2½ cups sugar')).toBe('2 1/2 cups sugar')
    })

    it('handles 3⅓ → 3 1/3', () => {
      expect(convertFractions('3⅓ cups flour')).toBe('3 1/3 cups flour')
    })

    it('handles 1¾ → 1 3/4', () => {
      expect(convertFractions('1¾ tsp vanilla')).toBe('1 3/4 tsp vanilla')
    })
  })
})
