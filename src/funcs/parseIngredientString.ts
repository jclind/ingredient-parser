import { ParsedIngredient } from '@jclind/ingredient-parser'
import { parse } from 'recipe-ingredient-parser-v3'
// import { ParsedIngredient } from '../../index.js'
import { convertFractions } from './convertFractions.js'

export const parseIngredientString = (ingrStr: string): ParsedIngredient => {
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

  const prepIngrText = ingrText.replace(/\b(lb|lbs)\b/g, match => {
    // Replace lb or lbs with pound or pounds respectively
    if (match === 'lb') {
      return 'pound'
    } else {
      return 'pounds'
    }
  })

  const parsedIngrRes: Omit<
    ParsedIngredient,
    'originalIngredientString' | 'comment'
  > = parse(prepIngrText, 'eng')

  if (!parsedIngrRes.ingredient) {
    return { ...parsedIngrRes, originalIngredientString: ingrStr, comment }
  }

  const wordsToRemove = ['small', 'medium', 'large', 'fresh', 'canned']
  const regex = new RegExp('\\b(' + wordsToRemove.join('|') + ')\\b', 'gi')

  const formattedIngrName = parsedIngrRes.ingredient
    .trim()
    .replace(/\s{2,}/g, ' ') // Replace multiple whitespace characters with a single space
    .replace(/,/g, '') // Remove commas
    .replace(/^(fluid|fl|oz) /, '') // Remove "fluid ", "fl ", or "oz " at the beginning of the string
    .replace(regex, '')

    .trim()

  return {
    ...parsedIngrRes,
    ingredient: formattedIngrName,
    originalIngredientString: ingrStr,
    comment,
  }
}
