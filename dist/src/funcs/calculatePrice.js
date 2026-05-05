"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePrice = void 0;
const ingredient_unit_converter_1 = require("@jclind/ingredient-unit-converter");
const calculatePrice = (quantity, unit, price) => {
    var _a, _b;
    const gramPrice = (_a = price.estimatedGramPrice) !== null && _a !== void 0 ? _a : 0;
    const unitPrice = (_b = price.estimatedSingleUnitPrice) !== null && _b !== void 0 ? _b : 0;
    if (quantity === null)
        return unitPrice || null;
    if (quantity === 0)
        return 0;
    if (!unit)
        return (unitPrice * quantity) || null;
    let convertedUnit;
    try {
        convertedUnit = (0, ingredient_unit_converter_1.converter)(quantity, unit);
    }
    catch (error) {
        return (unitPrice * quantity) || null;
    }
    if (!convertedUnit || 'error' in convertedUnit)
        return (unitPrice * quantity) || null;
    const convertedGrams = Number(convertedUnit.quantity);
    const total = convertedGrams * gramPrice;
    return Math.ceil(total * 100) / 100;
};
exports.calculatePrice = calculatePrice;
