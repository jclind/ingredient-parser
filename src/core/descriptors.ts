// Descriptor & preparation handling.
//
// v1 deleted these words and threw them away. v2 SEPARATES them: they come out
// of the ingredient name into structured arrays, so a consumer can keep "fresh"
// / "bone-in" for display or pricing and get a normalized prep list, while still
// looking the base name up.
//
// Single vocabulary, used for both inline (in the name) and comment text — so
// "minced garlic" and "garlic, minced" produce the same `preparation: ['minced']`.

// Size + quality words → ingredient.descriptors. Removed from the name.
export const DESCRIPTOR_WORDS = ['small', 'medium', 'large', 'fresh', 'dried', 'canned']

// Prep verbs stripped from the name when they appear INLINE (before the noun).
// Kept deliberately tiny. A word before the noun is usually part of the product
// identity ("diced tomatoes", "minced garlic" are canonical grocery items), so
// stripping it would break ingredient lookup. Only the two words v1 stripped
// inline are removed here; everything else stays in the name.
export const INLINE_PREP_VERBS = ['grated', 'chopped']

// Prep verbs recognized in COMMENT text (after a comma). Here the word is an
// instruction, not part of the name ("tomatoes, diced" = dice the tomatoes), so
// the full vocabulary applies. Excludes identity-changing words like "ground".
export const COMMENT_PREP_VERBS = [
  'chopped',
  'diced',
  'minced',
  'sliced',
  'grated',
  'shredded',
  'crushed',
  'mashed',
  'cubed',
  'julienned',
  'melted',
  'softened',
  'sifted',
  'beaten',
  'whisked',
  'drained',
  'rinsed',
  'peeled',
  'seeded',
  'cored',
  'trimmed',
  'toasted',
  'crumbled',
  'halved',
  'quartered',
  'zested',
  'juiced',
  'packed',
  'divided',
]

// Adverbs that modify a prep verb. Stripped from the name (inline) but not
// themselves recorded as a preparation (the verb they modify is).
export const PREP_ADVERBS = ['freshly', 'finely', 'roughly', 'coarsely', 'thinly', 'thickly', 'lightly']

/** hyphenated descriptors that may appear comma-separated before a noun */
export const HYPHENATED_DESCRIPTORS = [
  'bone-in',
  'boneless',
  'skin-on',
  'skinless',
  'free-range',
  'cage-free',
  'grass-fed',
  'wild-caught',
  'pasture-raised',
]

// Match a word that is NOT part of a hyphenated compound ("sun-dried",
// "extra-virgin" stay intact). Built only from hardcoded constants.
const buildInlineRe = (words: string[]) =>
  new RegExp('(?<!-)\\b(' + words.join('|') + ')\\b(?!-)', 'gi')

const DESCRIPTOR_RE = buildInlineRe(DESCRIPTOR_WORDS)
const INLINE_PREP_RE = buildInlineRe(INLINE_PREP_VERBS)
const PREP_ADVERB_RE = buildInlineRe(PREP_ADVERBS)
// global, reused across calls (no per-call allocation)
const COMMENT_PREP_RE = new RegExp('\\b(' + COMMENT_PREP_VERBS.join('|') + ')\\b', 'gi')

export interface SplitName {
  name: string
  descriptors: string[]
  preparation: string[]
}

/**
 * Pull descriptor + prep words out of a name, returning the cleaned name plus
 * the two structured lists.
 */
export function extractDescriptors(raw: string): SplitName {
  const descriptors: string[] = []
  const preparation: string[] = []

  const name = raw
    .replace(DESCRIPTOR_RE, m => {
      descriptors.push(m.toLowerCase())
      return ''
    })
    .replace(INLINE_PREP_RE, m => {
      preparation.push(m.toLowerCase())
      return ''
    })
    .replace(PREP_ADVERB_RE, '') // stripped from name, not recorded
    .replace(/\s{2,}/g, ' ')
    .trim()

  return { name, descriptors, preparation }
}

/** Classify recognized prep verbs in raw comment text (does not mutate it). */
export function preparationFromComment(comment: string | null): string[] {
  if (!comment) return []
  return (comment.toLowerCase().match(COMMENT_PREP_RE) ?? []).map(w => w.toLowerCase())
}

/**
 * Join comma-separated hyphenated descriptors so the comma-split heuristic
 * doesn't chop the name: "bone-in, skin-on chicken" → "bone-in skin-on chicken"
 */
export function joinHyphenatedDescriptors(text: string): string {
  const pattern = HYPHENATED_DESCRIPTORS.join('|')
  const re = new RegExp(`\\b(${pattern}),\\s+(?=(?:${pattern})\\b)`, 'gi')
  return text.replace(re, '$1 ')
}

/** Strip trailing purpose phrases ("for garnish", "to taste", ...). */
export function stripTrailingPurpose(text: string): string {
  const re =
    /[,\s]+(for\s+(the\s+)?(garnish|serving|topping)|to\s+(garnish|serve|taste))\s*$/i
  return text.replace(re, '')
}

/** dedupe preserving first-seen order */
export function dedupe(items: string[]): string[] {
  return [...new Set(items)]
}
