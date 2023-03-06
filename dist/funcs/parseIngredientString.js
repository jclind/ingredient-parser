import { parse } from 'recipe-ingredient-parser-v3';
import { convertFractions } from './convertFractions.js';
export const parseIngredientString = (ingrStr) => {
    // Define regular expressions for text inside parentheses and text before the first comma
    const parenRegex = /\((.*?)\)/;
    const commaRegex = /^(.*?)(?=,)/;
    // Find the index of the first ',' character
    const commaIndex = ingrStr.indexOf(',');
    // Extract the text inside the parentheses and the text before the first comma using regular expressions
    const textInParentheses = ingrStr.match(parenRegex)?.[1] ?? '';
    const comment = ingrStr
        .replace(parenRegex, '')
        .substring(commaIndex + 1)
        .trim() + ` (${textInParentheses})`;
    const ingrText = convertFractions(ingrStr.match(commaRegex)?.[1] ?? '');
    const parsedIngrRes = parse(ingrText, 'eng');
    if (!parsedIngrRes.ingredient) {
        return { ...parsedIngrRes, originalIngredientString: ingrStr, comment };
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
    return {
        ...parsedIngrRes,
        ingredient: formattedIngrName,
        originalIngredientString: ingrStr,
        comment,
    };
};
