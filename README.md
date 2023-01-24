# `@jclind/ingredient-parser`

A package for parsing ingredient strings and retrieving data about the ingredient.

## About
This package is built with [recipe-ingredient-parser-v3](https://www.npmjs.com/package/recipe-ingredient-parser-v3) and also returns ingredient data along with parsing the ingredient. If you don't need the ingredient data, just the parsed ingredient, I recommend using [recipe-ingredient-parser-v3](https://www.npmjs.com/package/recipe-ingredient-parser-v3).

## Installation:
`npm install @jclind/ingredient-parser`
  
## Usage
```
import { parseIngredient } from '@jclind/ingredient-parser';

const ingredientString = '1 cup rice, washed';
const apiKey = 'YOUR_API_KEY';
parseIngredient(ingredientString, apiKey);
```
Returns an object `{parsedIngredient, ingredientData}` with the following properties/values.

`parsedIngredient`:
```
{
    quantity: 1,
    unit: 'cup',
    unitPlural: 'cups',
    symbol: 'c',
    ingredient: 'rice',
    minQty: 1,
    maxQty: 1,
    comment: 'washed'
}
```

`ingredientData:`
```
{
    _id: '63caeabf4762c87be39c3795',    
    ingredientId: 20444,
    originalName: 'rice',
    name: 'rice',
    amount: 1,
    possibleUnits: [ 'g', 'oz', 'cup' ],
    consistency: 'solid',
    shoppingListUnits: [ 'ounces', 'pounds' ],
    aisle: 'Pasta and Rice',
    image: 'uncooked-white-rice.png',
    nutrition: {
      nutrients: [Array],
      properties: [Array],
      flavonoids: [Array],
      caloricBreakdown: [Object],
      weightPerServing: [Object]
    },
    names: [ 'rice' ],
    dateAdded: 1674242751000,
    totalPriceUSACents: 75.71
}
```

## API
`parseIngredient(ingredientString: string, SPOONACULAR_API_KEY: string) => { parsedIngredient, IngredientData }` Takes an ingredient string and a spoonacular API key and returns the parsed ingredient and the ingredient data.

- `ingredientString` (string) [required] : preferably formatted as such: (quantity) (unit) (ingredient), (comment separated by a comment) i.e. 2 cups onions, diced
- `SPOONACULAR_API_KEY` (string) [required] : your unique [spoonacular](https://spoonacular.com/food-api) API key.

Note: You need to sign up for a free API key from [spoonacular website](https://spoonacular.com/food-api).

## Error Handling
If the passed ingredient isn't formatted correctly or the ingredient is unknown, an error will be returned with the original object.
With invalid text:
```
parseIngredient('Invalid Text', YOUR_API_KEY)
/*
{
  error: { message: 'No Data Found, unknown ingredient: invalid text' },
  ingredientData: null,
  parsedIngredient: {
    quantity: 0,
    unit: 'q.b.',
    unitPlural: 'q.b.',
    symbol: null,
    ingredient: 'Invalid Text',
    minQty: 0,
    maxQty: 0,
    comment: null
  }
}
*/
```
With an inavlid API_KEY:
```
parseIngredient('1 cup rice', INVALID_API_KEY)
/*
{
  error: { message: 'API Key Not Valid' },
  ingredientData: null,
  parsedIngredient: {
    quantity: 1,
    unit: 'cup',
    unitPlural: 'cups',
    symbol: 'c',
    ingredient: 'black beans',
    minQty: 1,
    maxQty: 1,
    comment: null
  }
}
*/
```

## Typescript
Typescript definitions are also included in the ingredient-parser package:
```
import { parseIngredient, ParsedIngredientType, IngredientDataType, IngredientResponseType, } from '@jclind/ingredient-parser';

const ingredientString: string = '1 cup rice, washed';
const apiKey: string = 'YOUR_API_KEY';

const parsed: IngredientResponseType = parseIngredient(ingredientString, apiKey);

const parsedIngredient: ParsedIngredientType = parsed.parsedIngredient
const ingredientData: IngredientDataType = parsed.ingredientData
```
