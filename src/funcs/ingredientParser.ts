import { parse } from 'recipe-ingredient-parser-v3'
import {
  IngredientData,
  IngredientResponse,
  ParsedIngredient,
} from '../../types.js'
import { calculatePrice } from './calculatePrice.js'
import { editIngredientString } from './editIngredientString.js'
import { getIngredientInfo } from './getIngredientInfo.js'

const ingredientParser = async (
  ingrString: string,
  spoonacularAPIKey: string
): Promise<IngredientResponse> => {
  const parsedIngr: ParsedIngredient = parse(ingrString, 'eng')
  const formattedIngr = editIngredientString(parsedIngr.ingredient)
  const { formattedIngrName, comment } = formattedIngr

  const updatedParsedIngr = {
    ...parsedIngr,
    ingredient: formattedIngrName,
    comment,
  }
  let ingrData = null
  try {
    ingrData = await getIngredientInfo(formattedIngrName, spoonacularAPIKey)
    console.log(ingrData)
  } catch (error) {
    return {
      error: { message: error.message },
      ingredientData: null,
      parsedIngredient: updatedParsedIngr ?? null,
    }
  }
  if (formattedIngr && ingrData) {
    const {
      estimatedCost,
      meta,
      categoryPath,
      unit,
      unitShort,
      unitLong,
      original,
      id,
      ...reducedIngrData
    } = ingrData

    const totalPrice = calculatePrice(
      parsedIngr.quantity,
      parsedIngr.unit,
      estimatedCost.value
    )

    const imgPath = `https://spoonacular.com/cdn/ingredients_100x100/${reducedIngrData.image}`
    const ingredientId = id
    const updatedIngrData: IngredientData = {
      ...reducedIngrData,
      ingredientId,
      imgPath,
      totalPriceUSACents: totalPrice,
    }

    return {
      ingredientData: updatedIngrData,
      parsedIngredient: updatedParsedIngr,
    }
  } else {
    return {
      error: {
        message:
          'Ingredient not formatted correctly or Ingredient Unknown. Please pass ingredient comments/instructions after a comma',
      },
      ingredientData: null,
      parsedIngredient: updatedParsedIngr,
    }
  }
}

export default ingredientParser
