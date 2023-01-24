export const editIngredientString = (ingrStr: string) => {
  // Get string after first comment in ingredient string
  let ingr = ingrStr.split(',')[0]?.trim() ?? ingrStr
  let comment = ingrStr.split(',')[1]?.trim() ?? null

  const formattedIngrName = ingr
    .trim()
    .replace(/\s{2,}/g, ' ')
    .replace(/,/g, '')
    .replace(/^(fluid )/, '')
    .replace(/^(fl )/, '')
    .replace(/^(oz )/, '')
    .trim()

  return { formattedIngrName, comment }
}
