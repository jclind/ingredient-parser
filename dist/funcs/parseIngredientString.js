import { parse } from 'recipe-ingredient-parser-v3';
import { convertFractions } from './convertFractions.js';
export const parseIngredientString = (ingrStr) => {
    // Define regular expressions for text inside parentheses and text before the first comma
    const parenRegex = /\((.*?)\)/;
    const commaRegex = /^(.*?)(?=,)/;
    // Find the index of the first ',' character
    const commaIndex = ingrStr.indexOf(',');
    // Extract the text inside the parentheses and the text before the first comma using regular expressions
    const parenthesesStr = ingrStr.match(parenRegex)?.[1] ?? '';
    const textInParenthesesStr = parenthesesStr ? ` (${parenthesesStr})` : '';
    let ingrText;
    let comment;
    // If there is no comma in the string don't include a comment
    if (commaIndex !== -1) {
        ingrText = convertFractions(ingrStr.substring(0, commaIndex).replace(parenRegex, ''));
        comment = (ingrStr.replace(parenRegex, '').substring(commaIndex + 1) +
            textInParenthesesStr).trim();
    }
    else {
        ingrText = convertFractions(ingrStr.replace(parenRegex, '').trim());
        comment = textInParenthesesStr.trim();
    }
    console.log(ingrText, comment, parenthesesStr);
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
