import { parse } from 'recipe-ingredient-parser-v3'
import { ParsedIngredient } from '../../types'

// returns words that have consecutive t's with those t's removed in a string array
const removeConsecutiveTs = (
  str: string
): { original: string; modified: string }[] => {
  const regex = /t{2,}/gi
  const words: string[] = str.split(' ')
  const modifiedWords = words
    .map(word => {
      const modified = word.replace(regex, '')
      return {
        original: word,
        modified: modified,
      }
    })
    .filter(
      ({ original, modified }) => original !== modified && modified !== ''
    )

  return modifiedWords
}
const replaceModifiedWords = (
  words: { original: string; modified: string }[],
  str: string
): string => {
  let updatedStr = str
  words.forEach(({ original, modified }) => {
    updatedStr = updatedStr.replace(
      modified.toLowerCase(),
      original.toLowerCase()
    )
  })
  return updatedStr
}

type ParsedIngredientOmitType = Omit<
  ParsedIngredient,
  'originalIngredientString' | 'comment'
>

export const parseStringConsecutiveTs = (
  ingrStr: string
): ParsedIngredientOmitType => {
  const removeTTsIngrName = ingrStr.replace(/t{2,}/g, '')
  const modifiedWords = removeConsecutiveTs(ingrStr)

  if (modifiedWords.length > 0) {
    const parsedIngrNoTs: ParsedIngredientOmitType = parse(
      removeTTsIngrName,
      'eng'
    )

    const correctIngrStr: string | null = replaceModifiedWords(
      modifiedWords,
      parsedIngrNoTs.ingredient ?? ''
    )

    const parsedIngr: ParsedIngredientOmitType = {
      ...parsedIngrNoTs,
      ingredient: correctIngrStr,
    }
    return parsedIngr
  } else {
    return parse(ingrStr, 'eng')
  }
}
