import { parse } from 'recipe-ingredient-parser-v3'
import { ParsedIngredient } from '../types/types.js'
import { getIngredientInfo } from './getIngredientInfo.js'

const editIngredientString = (ingrStr: string) => {
  // Get string after first comment in ingredient string
  let ingr = ingrStr.split(',')[0]?.trim() ?? ingrStr
  let comment = ingrStr.split(',')[1]?.trim() ?? null

  const formattedIngrName = ingr
    .trim()
    .replace(/\s{2,}/g, ' ')
    .replace(/,/g, '')
    .replace(/^(fluid )/, '')
    .replace(/^(fl )/, '')
    .replace(/^(oz )/, '')
    .trim()

  return { formattedIngrName, comment }
}

const ingredientParser = async (
  ingrString: string,
  spoonacularAPIKey: string
): Promise<any> => {
  const parsedIngr: ParsedIngredient = parse(ingrString, 'eng')
  const formattedIngr = editIngredientString(parsedIngr.ingredient)
  const { formattedIngrName, comment } = formattedIngr

  const updatedParsedIngr = {
    ...parsedIngr,
    ingredient: formattedIngrName,
    comment,
  }
  if (formattedIngr) {
    const ingrData = await getIngredientInfo(
      formattedIngrName,
      spoonacularAPIKey
    )
    return { ...ingrData, parsedIngredient: updatedParsedIngr }
  } else {
    return {
      error:
        'Ingredient not formatted correctly. Please pass ingredient comments/instructions after a comma',
      parsedIngredient: updatedParsedIngr,
    }
  }
}

export default ingredientParser
