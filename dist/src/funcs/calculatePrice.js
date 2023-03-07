"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePrice = void 0;
//@ts-ignore
const ingredient_unit_converter_1 = require("@jclind/ingredient-unit-converter");
const calculatePrice = (quantity, unit, price) => {
    if (!quantity)
        return price.estimatedSingleUnitPrice;
    if (!unit)
        return price.estimatedSingleUnitPrice * quantity;
    let convertedUnit;
    try {
        convertedUnit = (0, ingredient_unit_converter_1.converter)(quantity, unit);
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
exports.calculatePrice = calculatePrice;
