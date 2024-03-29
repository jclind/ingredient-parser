"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseIngredientString = void 0;
// import { ParsedIngredient } from '../../index.js'
const convertFractions_js_1 = require("./convertFractions.js");
const parseStringConsecutiveTs_js_1 = require("./parseStringConsecutiveTs.js");
const parseIngredientString = (ingrStr) => {
    var _a, _b;
    // Define regular expressions for text inside parentheses and text before the first comma
    const parenRegex = /(\(.*?\))/;
    const commaRegex = /^(.*?)(?=,)/;
    // Extract the text inside the parentheses and the text before the first comma using regular expressions
    const parenthesesStr = (_b = (_a = ingrStr.match(parenRegex)) === null || _a === void 0 ? void 0 : _a[1]) !== null && _b !== void 0 ? _b : '';
    const textWithoutParenthesesStr = ingrStr.replace(parenthesesStr, '');
    // Find the index of the first ',' character
    const commaIndex = textWithoutParenthesesStr.indexOf(',');
    let ingrText;
    let comment;
    // If there is no comma in the string don't include a comment
    if (commaIndex !== -1) {
        ingrText = (0, convertFractions_js_1.convertFractions)(textWithoutParenthesesStr
            .substring(0, commaIndex)
            .replace(parenRegex, '')
            .trim());
        comment = (textWithoutParenthesesStr
            .replace(parenRegex, '')
            .substring(commaIndex + 1) +
            ' ' +
            parenthesesStr).trim();
    }
    else {
        ingrText = (0, convertFractions_js_1.convertFractions)(ingrStr.replace(parenRegex, '').trim());
        comment = parenthesesStr.trim();
    }
    const prepIngrText = ingrText.replace(/\b(lb|lbs|tablespoon|tablespoon)\b/gi, match => {
        if (match === 'lb') {
            return 'pound';
        }
        else if (match === 'lbs') {
            return 'pounds';
        }
        else if (match === 'tablespoon') {
            return 'tbsp';
        }
        else {
            return 'tbsp';
        }
    });
    const parsedIngrRes = (0, parseStringConsecutiveTs_js_1.parseStringConsecutiveTs)(prepIngrText);
    if (!parsedIngrRes.ingredient) {
        return Object.assign(Object.assign({}, parsedIngrRes), { originalIngredientString: ingrStr, comment });
    }
    const wordsToRemove = ['small', 'medium', 'large', 'fresh', 'canned'];
    const regex = new RegExp('\\b(' + wordsToRemove.join('|') + ')\\b', 'gi');
    const formattedIngrName = parsedIngrRes.ingredient
        .trim()
        .replace(/\s{2,}/g, ' ') // Replace multiple whitespace characters with a single space
        .replace(/,/g, '') // Remove commas
        .replace(/^(fluid|fl|oz) /, '') // Remove "fluid ", "fl ", or "oz " at the beginning of the string
        .replace(regex, '')
        .trim();
    return Object.assign(Object.assign({}, parsedIngrRes), { ingredient: formattedIngrName, originalIngredientString: ingrStr, comment });
};
exports.parseIngredientString = parseIngredientString;
