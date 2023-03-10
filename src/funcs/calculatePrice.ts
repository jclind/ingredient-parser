import { converter } from '@jclind/ingredient-unit-converter'

export const calculatePrice = (
  quantity: number | null,
  unit: string | null,
  price: { estimatedSingleUnitPrice: number; estimatedGramPrice: number }
): number | null => {
  if (!quantity) return price.estimatedSingleUnitPrice
  if (!unit) return price.estimatedSingleUnitPrice * quantity

  let convertedUnit
  try {
    convertedUnit = converter(quantity, unit)
  } catch (error) {
    return null
  }

  if (!convertedUnit || 'error' in convertedUnit)
    return price.estimatedSingleUnitPrice * quantity

  const convertedGrams = Number(convertedUnit.quantity)
  const total: number = convertedGrams * price.estimatedGramPrice
  return Math.ceil(total * 100) / 100
}
