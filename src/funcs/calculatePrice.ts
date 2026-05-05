import { converter } from '@jclind/ingredient-unit-converter'

export const calculatePrice = (
  quantity: number | null,
  unit: string | null,
  price: { estimatedSingleUnitPrice?: number; estimatedGramPrice?: number }
): number | null => {
  const gramPrice = price.estimatedGramPrice ?? 0
  const unitPrice = price.estimatedSingleUnitPrice ?? 0

  if (quantity === null) return unitPrice || null
  if (quantity === 0) return 0
  if (!unit) return (unitPrice * quantity) || null

  let convertedUnit
  try {
    convertedUnit = converter(quantity, unit)
  } catch (error) {
    return (unitPrice * quantity) || null
  }

  if (!convertedUnit || 'error' in convertedUnit)
    return (unitPrice * quantity) || null

  const convertedGrams = Number(convertedUnit.quantity)
  const total: number = convertedGrams * gramPrice
  return Math.ceil(total * 100) / 100
}
