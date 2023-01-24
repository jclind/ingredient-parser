import { converter } from '@jclind/ingredient-unit-converter'

export const calculatePrice = (
  quantity: number,
  unit: string,
  price: number
): number | null => {
  if (!quantity) return price
  if (!unit) return price * quantity

  let convertedUnit
  try {
    convertedUnit = converter(quantity, unit)
  } catch (error) {
    return null
  }

  const convertedGrams = convertedUnit.quantity
  const total = convertedGrams * price
  return Math.ceil(total * 100) / 100
}
