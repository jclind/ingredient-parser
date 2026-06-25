// Unicode → ASCII fraction conversion.
//
// Ported verbatim from v1 (it already handles the digit-adjacent case, e.g.
// "2½" → "2 1/2", despite the v1 CLAUDE.md describing that as a known bug).
// Kept as its own module so the unit registry / quantity parser stay clean.

const FRACTIONS: Record<string, string> = {
  '¼': '1/4',
  '½': '1/2',
  '¾': '3/4',
  '⅓': '1/3',
  '⅔': '2/3',
  '⅛': '1/8',
  '⅜': '3/8',
  '⅝': '5/8',
  '⅞': '7/8',
  '⅕': '1/5',
  '⅖': '2/5',
  '⅗': '3/5',
  '⅘': '4/5',
  '⅙': '1/6',
  '⅚': '5/6',
  '⅐': '1/7',
  '⅑': '1/9',
  '⅒': '1/10',
}

export const convertFractions = (str: string): string => {
  for (const [fraction, value] of Object.entries(FRACTIONS)) {
    // digit-adjacent first: "2½" → "2 1/2"
    str = str.replace(new RegExp(`(\\d)${fraction}`, 'g'), `$1 ${value}`)
    // standalone: "½" → "1/2"
    str = str.replace(new RegExp(fraction, 'g'), value)
  }
  return str
}
