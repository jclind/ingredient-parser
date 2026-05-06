"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseIngredientString = void 0;
const convertFractions_js_1 = require("./convertFractions.js");
const parseStringConsecutiveTs_js_1 = require("./parseStringConsecutiveTs.js");
const parseIngredientString = (ingrStr) => {
    var _a, _b, _c;
    // Input validation
    if (typeof ingrStr !== 'string' || ingrStr === null || ingrStr === undefined) {
        throw new TypeError('parseIngredientString expects a string input');
    }
    // Store original input before any modifications
    const originalInput = ingrStr;
    // Extract range quantities (e.g., "1-2 cups", "2 to 3 cups")
    let minQty = null;
    let maxQty = null;
    const hyphenRangeMatch = ingrStr.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
    const toRangeMatch = ingrStr.match(/(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)/i);
    if (hyphenRangeMatch) {
        minQty = parseFloat(hyphenRangeMatch[1]);
        maxQty = parseFloat(hyphenRangeMatch[2]);
        // Replace the range with minQty for parsing
        ingrStr = ingrStr.replace(hyphenRangeMatch[0], String(minQty));
    }
    else if (toRangeMatch) {
        minQty = parseFloat(toRangeMatch[1]);
        maxQty = parseFloat(toRangeMatch[2]);
        // Replace the range with minQty for parsing
        ingrStr = ingrStr.replace(toRangeMatch[0], String(minQty));
    }
    // Store extracted ranges for later use
    const extractedMinQty = minQty;
    const extractedMaxQty = maxQty;
    // Pre-processing: handle informal quantity patterns ("a pinch of", "handful", "dash")
    // These patterns aren't well-handled by the upstream parser
    const informalQtyPatterns = [
        {
            // "a pinch of salt"
            regex: /^a\s+(pinch|dash|handful)\s+of\s+(.+)$/i,
            extract: (match) => ({
                quantity: 1,
                unit: match[1].toLowerCase(),
                ingredient: match[2].trim(),
            })
        },
        {
            // "pinch of salt", "dash of hot sauce"
            regex: /^(pinch|dash|handful)\s+of\s+(.+)$/i,
            extract: (match) => ({
                quantity: 1,
                unit: match[1].toLowerCase(),
                ingredient: match[2].trim(),
            })
        },
        {
            // "handful spinach" (no "of")
            regex: /^(pinch|dash|handful)\s+(.+)$/i,
            extract: (match) => ({
                quantity: 1,
                unit: match[1].toLowerCase(),
                ingredient: match[2].trim(),
            })
        },
    ];
    for (const pattern of informalQtyPatterns) {
        const match = ingrStr.match(pattern.regex);
        if (match) {
            const { quantity, unit, ingredient } = pattern.extract(match);
            // Apply descriptor stripping to ingredient
            const wordsToRemove = ['small', 'medium', 'large', 'fresh', 'canned', 'freshly', 'finely', 'roughly', 'coarsely', 'grated', 'chopped'];
            const regex = new RegExp('\\b(' + wordsToRemove.join('|') + ')\\b', 'gi');
            const cleanedIngredient = ingredient.replace(regex, '').trim();
            return {
                quantity,
                unit,
                unitPlural: unit + 's',
                symbol: null,
                ingredient: cleanedIngredient,
                originalIngredientString: originalInput,
                minQty: quantity,
                maxQty: quantity,
                comment: '',
            };
        }
    }
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
    const unitNormalizations = {
        tablespoons: 'tbsp',
        tablespoon: 'tbsp',
        teaspoons: 'teaspoon',
        milliliters: 'milliliter',
        millilitres: 'milliliter',
        kilograms: 'kilogram',
        ounces: 'ounce',
        pounds: 'pound',
        grams: 'gram',
        tsps: 'teaspoon',
        tsp: 'teaspoon',
        lbs: 'pounds',
        oz: 'ounce',
        kg: 'kilogram',
        ml: 'milliliter',
        lb: 'pound',
        g: 'gram',
        // Additional unit recognitions
        sprigs: 'sprig',
        sprig: 'sprig',
        'bay leaves': 'bay leaf',
        'bay leaf': 'bay leaf',
        sheets: 'sheet',
        sheet: 'sheet',
        tblsp: 'tablespoon',
        dessertspoon: 'dessertspoon',
        dessertspoons: 'dessertspoon',
        'fl oz': 'fluid ounce',
        'fluid oz': 'fluid ounce',
    };
    const unitPattern = new RegExp('\\b(' + Object.keys(unitNormalizations).join('|') + ')\\b', 'gi');
    const prepIngrText = ingrText.replace(unitPattern, match => { var _a; return (_a = unitNormalizations[match.toLowerCase()]) !== null && _a !== void 0 ? _a : match; });
    let parsedIngrRes;
    try {
        parsedIngrRes = (0, parseStringConsecutiveTs_js_1.parseStringConsecutiveTs)(prepIngrText);
    }
    catch (_d) {
        // Return degraded result for malformed input (e.g., division by zero)
        return {
            quantity: 0,
            unit: null,
            unitPlural: null,
            symbol: null,
            ingredient: ingrStr.replace(/[^a-zA-Z\s]/g, '').trim(),
            minQty: null,
            maxQty: null,
            originalIngredientString: originalInput,
            comment,
        };
    }
    // Post-processing: check if ingredient name starts with an unrecognized unit
    // The upstream parser doesn't recognize some units, so we extract them manually
    const unrecognizedUnits = [
        'sprig', 'sprigs',
        'strip', 'strips',
        'sheet', 'sheets',
        'dessertspoon', 'dessertspoons',
        'handful', 'handfuls',
        'dash', 'dashes',
        'bay leaf', 'bay leaves',
    ];
    const unrecognizedUnitPattern = new RegExp('^(' + unrecognizedUnits.join('|') + ')\\b', 'i');
    if (parsedIngrRes.ingredient && parsedIngrRes.unit === null) {
        const unitMatch = parsedIngrRes.ingredient.match(unrecognizedUnitPattern);
        if (unitMatch) {
            let unit = unitMatch[1].toLowerCase();
            // Normalize plural forms to singular
            const unitSingular = {
                sprigs: 'sprig',
                strips: 'strip',
                sheets: 'sheet',
                dessertspoons: 'dessertspoon',
                handfuls: 'handful',
                dashes: 'dash',
                'bay leaves': 'bay leaf',
            };
            parsedIngrRes.unit = (_c = unitSingular[unit]) !== null && _c !== void 0 ? _c : unit;
            parsedIngrRes.ingredient = parsedIngrRes.ingredient
                .replace(unrecognizedUnitPattern, '')
                .trim();
        }
    }
    // Post-processing: handle "fl oz" / "fluid ounce" which upstream parser normalizes to "ounce"
    if (parsedIngrRes.unit === 'ounce' &&
        (originalInput.toLowerCase().includes('fl oz') ||
            originalInput.toLowerCase().includes('fluid ounce'))) {
        parsedIngrRes.unit = 'fluid ounce';
        // Also fix the symbol
        parsedIngrRes.symbol = 'fl oz';
    }
    if (!parsedIngrRes.ingredient) {
        return Object.assign(Object.assign({}, parsedIngrRes), { originalIngredientString: originalInput, comment });
    }
    const wordsToRemove = ['small', 'medium', 'large', 'fresh', 'canned', 'freshly', 'finely', 'roughly', 'coarsely', 'grated', 'chopped'];
    const regex = new RegExp('\\b(' + wordsToRemove.join('|') + ')\\b', 'gi');
    const descriptorSet = new Set(wordsToRemove.map(w => w.toLowerCase()));
    const unit = parsedIngrRes.unit && descriptorSet.has(parsedIngrRes.unit.toLowerCase())
        ? null
        : parsedIngrRes.unit;
    const formattedIngrName = parsedIngrRes.ingredient
        .trim()
        .replace(/\s{2,}/g, ' ') // Replace multiple whitespace characters with a single space
        .replace(/,/g, '') // Remove commas
        .replace(/^(fluid|fl|oz) /, '') // Remove "fluid ", "fl ", or "oz " at the beginning of the string
        .replace(regex, '')
        .trim();
    return Object.assign(Object.assign({}, parsedIngrRes), { unit, ingredient: formattedIngrName, originalIngredientString: originalInput, comment, minQty: extractedMinQty !== null && extractedMinQty !== void 0 ? extractedMinQty : parsedIngrRes.minQty, maxQty: extractedMaxQty !== null && extractedMaxQty !== void 0 ? extractedMaxQty : parsedIngrRes.maxQty });
};
exports.parseIngredientString = parseIngredientString;
