import { ParsedIngredient } from '../../types.js'
import { convertFractions } from './convertFractions.js'
import { parseStringConsecutiveTs, type ParsedIngredientOmitType } from './parseStringConsecutiveTs.js'

export const parseIngredientString = (ingrStr: string): ParsedIngredient => {
  // Input validation
  if (typeof ingrStr !== 'string' || ingrStr === null || ingrStr === undefined) {
    throw new TypeError('parseIngredientString expects a string input')
  }

  // Define regular expressions for text inside parentheses and text before the first comma
  const parenRegex = /(\(.*?\))/
  const commaRegex = /^(.*?)(?=,)/

  // Extract the text inside the parentheses and the text before the first comma using regular expressions
  const parenthesesStr = ingrStr.match(parenRegex)?.[1] ?? ''

  const textWithoutParenthesesStr = ingrStr.replace(parenthesesStr, '')
  // Find the index of the first ',' character
  const commaIndex = textWithoutParenthesesStr.indexOf(',')

  let ingrText: string
  let comment: string

  // If there is no comma in the string don't include a comment
  if (commaIndex !== -1) {
    ingrText = convertFractions(
      textWithoutParenthesesStr
        .substring(0, commaIndex)
        .replace(parenRegex, '')
        .trim()
    )
    comment = (
      textWithoutParenthesesStr
        .replace(parenRegex, '')
        .substring(commaIndex + 1) +
      ' ' +
      parenthesesStr
    ).trim()
  } else {
    ingrText = convertFractions(ingrStr.replace(parenRegex, '').trim())
    comment = parenthesesStr.trim()
  }

  const unitNormalizations: Record<string, string> = {
    tablespoons: 'tbsp',
    tablespoon: 'tbsp',
    teaspoons: 'teaspoon',
    milliliters: 'milliliter',
    millilitres: 'milliliter',
    kilograms: 'kilogram',
    ounces: 'ounce',
    pounds: 'pound',
    grams: 'gram',
    tsps: 'teaspoon',
    tsp: 'teaspoon',
    lbs: 'pounds',
    oz: 'ounce',
    kg: 'kilogram',
    ml: 'milliliter',
    lb: 'pound',
    g: 'gram',
    // Additional unit recognitions
    sprigs: 'sprig',
    sprig: 'sprig',
    'bay leaves': 'bay leaf',
    'bay leaf': 'bay leaf',
    sheets: 'sheet',
    sheet: 'sheet',
    tblsp: 'tablespoon',
    dessertspoon: 'dessertspoon',
    dessertspoons: 'dessertspoon',
    'fl oz': 'fluid ounce',
    'fluid oz': 'fluid ounce',
  }
  const unitPattern = new RegExp(
    '\\b(' + Object.keys(unitNormalizations).join('|') + ')\\b',
    'gi'
  )
  const prepIngrText = ingrText.replace(
    unitPattern,
    match => unitNormalizations[match.toLowerCase()] ?? match
  )

  let parsedIngrRes: ParsedIngredientOmitType
  try {
    parsedIngrRes = parseStringConsecutiveTs(prepIngrText)
  } catch {
    // Return degraded result for malformed input (e.g., division by zero)
    return {
      quantity: 0,
      unit: null,
      unitPlural: null,
      symbol: null,
      ingredient: ingrStr.replace(/[^a-zA-Z\s]/g, '').trim(),
      minQty: null,
      maxQty: null,
      originalIngredientString: ingrStr,
      comment,
    }
  }

  // Post-processing: check if ingredient name starts with an unrecognized unit
  // The upstream parser doesn't recognize some units, so we extract them manually
  const unrecognizedUnits = [
    'sprig', 'sprigs',
    'strip', 'strips',
    'sheet', 'sheets',
    'dessertspoon', 'dessertspoons',
    'handful', 'handfuls',
    'dash', 'dashes',
    'bay leaf', 'bay leaves',
  ]
  const unrecognizedUnitPattern = new RegExp(
    '^(' + unrecognizedUnits.join('|') + ')\\b',
    'i'
  )

  if (parsedIngrRes.ingredient && parsedIngrRes.unit === null) {
    const unitMatch = parsedIngrRes.ingredient.match(unrecognizedUnitPattern)
    if (unitMatch) {
      let unit = unitMatch[1].toLowerCase()
      // Normalize plural forms to singular
      const unitSingular: Record<string, string> = {
        sprigs: 'sprig',
        strips: 'strip',
        sheets: 'sheet',
        dessertspoons: 'dessertspoon',
        handfuls: 'handful',
        dashes: 'dash',
        'bay leaves': 'bay leaf',
      }
      parsedIngrRes.unit = unitSingular[unit] ?? unit
      parsedIngrRes.ingredient = parsedIngrRes.ingredient
        .replace(unrecognizedUnitPattern, '')
        .trim()
    }
  }

  // Post-processing: handle "fl oz" / "fluid ounce" which upstream parser normalizes to "ounce"
  if (parsedIngrRes.unit === 'ounce' &&
      (ingrStr.toLowerCase().includes('fl oz') ||
       ingrStr.toLowerCase().includes('fluid ounce'))) {
    parsedIngrRes.unit = 'fluid ounce'
    // Also fix the symbol
    parsedIngrRes.symbol = 'fl oz'
  }

  if (!parsedIngrRes.ingredient) {
    return { ...parsedIngrRes, originalIngredientString: ingrStr, comment }
  }

  const wordsToRemove = ['small', 'medium', 'large', 'fresh', 'canned', 'freshly', 'finely', 'roughly', 'coarsely', 'grated', 'chopped']
  const regex = new RegExp('\\b(' + wordsToRemove.join('|') + ')\\b', 'gi')

  const descriptorSet = new Set(wordsToRemove.map(w => w.toLowerCase()))
  const unit =
    parsedIngrRes.unit && descriptorSet.has(parsedIngrRes.unit.toLowerCase())
      ? null
      : parsedIngrRes.unit

  const formattedIngrName = parsedIngrRes.ingredient
    .trim()
    .replace(/\s{2,}/g, ' ') // Replace multiple whitespace characters with a single space
    .replace(/,/g, '') // Remove commas
    .replace(/^(fluid|fl|oz) /, '') // Remove "fluid ", "fl ", or "oz " at the beginning of the string
    .replace(regex, '')

    .trim()

  return {
    ...parsedIngrRes,
    unit,
    ingredient: formattedIngrName,
    originalIngredientString: ingrStr,
    comment,
  }
}
