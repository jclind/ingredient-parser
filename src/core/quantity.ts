// Quantity / range extraction from the start of an ingredient string.
//
// One generic "read a number token" primitive (mixed / fraction / decimal /
// integer) is reused for both ends of a range, so a mixed-number low bound like
// "1 1/2-2" parses correctly instead of leaking "-2 ..." into the name.

export interface QuantityResult {
  value: number | null // primary value (min of a range); null when absent
  min: number | null
  max: number | null
  isRange: boolean
  isApproximate: boolean
  rest: string // text after the consumed quantity
}

/** safe fraction eval: "1/2" → 0.5, "1/0" → 0 */
function evalFraction(numerator: number, denominator: number): number {
  if (denominator === 0) return 0
  return numerator / denominator
}

/** Read one numeric token at the start: mixed number, fraction, or decimal/int. */
function readNumber(s: string): { value: number; len: number } | null {
  // A value that overflows to Infinity (e.g. a 309+ digit token) is not a usable
  // quantity → return null so it degrades to "no quantity" rather than Infinity.
  const mk = (value: number, len: number) =>
    Number.isFinite(value) ? { value, len } : null

  let m = s.match(/^(\d+)\s+(\d+)\/(\d+)/) // mixed number: "1 1/2"
  if (m) {
    return mk(parseInt(m[1], 10) + evalFraction(parseInt(m[2], 10), parseInt(m[3], 10)), m[0].length)
  }
  m = s.match(/^(\d+)\/(\d+)/) // fraction: "1/2", "1/0"
  if (m) {
    return mk(evalFraction(parseInt(m[1], 10), parseInt(m[2], 10)), m[0].length)
  }
  m = s.match(/^(\d*\.\d+|\d+)/) // decimal or integer, incl. leading-dot ".5"
  if (m) return mk(parseFloat(m[1]), m[0].length)
  return null
}

export function parseQuantity(input: string): QuantityResult {
  let rest = input.trim()
  let isApproximate = false

  // leading approximation qualifiers ("about 1 cup", "roughly 2 tbsp")
  const approx = rest.match(/^(about|approximately|approx\.?|around|roughly)\s+/i)
  if (approx) {
    isApproximate = true
    rest = rest.slice(approx[0].length)
  }

  const first = readNumber(rest)
  if (!first) {
    // No number → an "about"/"roughly" qualifier has nothing to approximate.
    return { value: null, min: null, max: null, isRange: false, isApproximate: false, rest }
  }
  const after = rest.slice(first.len)

  // range separator: hyphen / en/em dash, or " to " — followed by a 2nd number
  const sep = after.match(/^\s*(?:[-–—]|to\b)\s*/i)
  if (sep) {
    const second = readNumber(after.slice(sep[0].length))
    if (second) {
      return {
        value: first.value,
        min: first.value,
        max: second.value,
        isRange: true,
        isApproximate,
        rest: after.slice(sep[0].length + second.len).trim(),
      }
    }
  }

  return {
    value: first.value,
    min: first.value,
    max: first.value,
    isRange: false,
    isApproximate,
    rest: after.trim(),
  }
}
