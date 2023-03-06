//@ts-ignore
import { converter } from '@jclind/ingredient-unit-converter';
export const calculatePrice = (quantity, unit, price) => {
    if (!quantity)
        return price.estimatedSingleUnitPrice;
    if (!unit)
        return price.estimatedSingleUnitPrice * quantity;
    let convertedUnit;
    try {
        convertedUnit = converter(quantity, unit);
    }
    catch (error) {
        return null;
    }
    if (!convertedUnit || convertedUnit.error)
        return price.estimatedSingleUnitPrice * quantity;
    const convertedGrams = Number(convertedUnit.quantity);
    const total = convertedGrams * price.estimatedGramPrice;
    return Math.ceil(total * 100) / 100;
};
