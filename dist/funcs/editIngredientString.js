export const editIngredientString = (ingrStr) => {
    // Get string after first comment in ingredient string
    let ingr = ingrStr.split(',')[0]?.trim() ?? ingrStr;
    let comment = ingrStr.split(',')[1]?.trim() ?? '';
    const wordsToRemove = ['small', 'medium', 'large', 'fresh', 'canned'];
    const regex = new RegExp('\\b(' + wordsToRemove.join('|') + ')\\b', 'gi');
    const formattedIngrName = ingr
        .trim()
        .replace(/\s{2,}/g, ' ')
        .replace(/,/g, '')
        .replace(/^(fluid )/, '')
        .replace(/^(fl )/, '')
        .replace(/^(oz )/, '')
        .replace(regex, '')
        .trim();
    return { formattedIngrName, comment };
};
