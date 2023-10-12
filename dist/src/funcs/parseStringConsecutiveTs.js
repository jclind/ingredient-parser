"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseStringConsecutiveTs = void 0;
const recipe_ingredient_parser_v3_1 = require("recipe-ingredient-parser-v3");
// returns words that have consecutive t's with those t's removed in a string array
const removeConsecutiveTs = (str) => {
    const regex = /t{2,}/gi;
    const words = str.split(' ');
    const modifiedWords = words
        .map(word => {
        const modified = word.replace(regex, '');
        return {
            original: word,
            modified: modified,
        };
    })
        .filter(({ original, modified }) => original !== modified && modified !== '');
    return modifiedWords;
};
const replaceModifiedWords = (words, str) => {
    let updatedStr = str;
    words.forEach(({ original, modified }) => {
        updatedStr = updatedStr.replace(modified, original);
    });
    return updatedStr;
};
const parseStringConsecutiveTs = (ingrStr) => {
    var _a;
    // const ingrStrToLower = ingrStr.toLowerCase()
    const removeTTsIngrName = ingrStr.replace(/t{2,}/g, '');
    const modifiedWords = removeConsecutiveTs(ingrStr);
    console.log(modifiedWords);
    if (modifiedWords.length > 0) {
        const parsedIngrNoTs = (0, recipe_ingredient_parser_v3_1.parse)(removeTTsIngrName, 'eng');
        console.log(parsedIngrNoTs);
        const correctIngrStr = replaceModifiedWords(modifiedWords, (_a = parsedIngrNoTs.ingredient) !== null && _a !== void 0 ? _a : '');
        const parsedIngr = Object.assign(Object.assign({}, parsedIngrNoTs), { ingredient: correctIngrStr });
        return parsedIngr;
    }
    else {
        return (0, recipe_ingredient_parser_v3_1.parse)(ingrStr, 'eng');
    }
};
exports.parseStringConsecutiveTs = parseStringConsecutiveTs;
