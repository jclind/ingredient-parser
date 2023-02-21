import { converter } from '@jclind/ingredient-unit-converter';
export const calculatePrice = (quantity, unit, price) => {
    console.log(quantity, unit, price);
    if (!quantity)
        return price;
    if (!unit)
        return price * quantity;
    let convertedUnit;
    try {
        convertedUnit = converter(quantity, unit);
    }
    catch (error) {
        return null;
    }
    if (!convertedUnit || convertedUnit.error)
        return price * quantity;
    const convertedGrams = Number(convertedUnit.quantity);
    const total = convertedGrams * price;
    return Math.ceil(total * 100) / 100;
};
//# sourceMappingURL=calculatePrice.js.map