export const convertFractions = (str) => {
    const fractions = {
        '¼': '1/4',
        '½': '1/2',
        '¾': '3/4',
        '⅓': '1/3',
        '⅔': '2/3',
        '⅛': '1/8',
        '⅜': '3/8',
        '⅝': '5/8',
        '⅞': '7/8',
        '⅕': '1/5',
        '⅖': '2/5',
        '⅗': '3/5',
        '⅘': '4/5',
        '⅙': '1/6',
        '⅚': '5/6',
        '⅐': '1/7',
        '⅑': '1/9',
        '⅒': '1/10',
    };
    for (const [fraction, value] of Object.entries(fractions)) {
        const re = new RegExp(fraction, 'g');
        str = str.replace(re, value);
    }
    return str;
};