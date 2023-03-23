import { calculatePrice } from './calculatePrice.js'
import { parseIngredientString } from './parseIngredientString.js'
import { getIngredientInfo } from './getIngredientInfo.js'
import {
  IngredientData,
  IngredientResponse,
  OptionsType,
  ParsedIngredient,
} from '../../types.js'

const ingredientParser = async (
  ingrString: string,
  spoonacularAPIKey: string,
  options: OptionsType
): Promise<IngredientResponse> => {
  // const parsedIngr: ParsedIngredient = parse(ingrString, 'eng')
  const parsedIngr: ParsedIngredient = parseIngredientString(ingrString)

  let ingrData = null
  try {
    ingrData = await getIngredientInfo(
      parsedIngr.ingredient || '',
      spoonacularAPIKey
    )
  } catch (error: any) {
    return {
      error: { message: error.message },
      ingredientData: null,
      parsedIngredient: parsedIngr ?? null,
    }
  }
  if (parsedIngr.ingredient && ingrData) {
    const {
      estimatedPrices,
      meta,
      categoryPath,
      unit,
      unitShort,
      unitLong,
      original,
      id,
      nutrition,
      ...reducedIngrData
    } = ingrData

    const totalPrice = calculatePrice(
      parsedIngr.quantity,
      parsedIngr.unit,
      estimatedPrices
    )

    const imagePath = `https://spoonacular.com/cdn/ingredients_100x100/${reducedIngrData.image}`
    const updatedIngrData: IngredientData = {
      ...reducedIngrData,
      imagePath,
      totalPriceUSACents: totalPrice,
      ...(options?.returnNutritionData && { nutrition }),
    }

    return {
      ingredientData: updatedIngrData,
      parsedIngredient: parsedIngr,
    }
  } else {
    return {
      error: {
        message:
          'Ingredient not formatted correctly or Ingredient Unknown. Please pass ingredient comments/instructions after a comma',
      },
      ingredientData: null,
      parsedIngredient: parsedIngr,
    }
  }
}

export default ingredientParser
