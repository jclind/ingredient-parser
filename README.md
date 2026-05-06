# @jclind/ingredient-parser

[![npm version](https://img.shields.io/npm/v/@jclind/ingredient-parser)](https://www.npmjs.com/package/@jclind/ingredient-parser)
[![license](https://img.shields.io/npm/l/@jclind/ingredient-parser)](https://github.com/jclind/ingredient-parser/blob/main/LICENSE)

A TypeScript package for parsing ingredient strings and retrieving structured ingredient data from the Spoonacular API.

Built on top of [recipe-ingredient-parser-v3](https://www.npmjs.com/package/recipe-ingredient-parser-v3). If you only need ingredient parsing without ingredient metadata, nutrition, or API lookups, you may prefer using that package directly.

## Installation

```sh
npm install @jclind/ingredient-parser
```

## Quick Start

```ts
import { parseIngredient } from '@jclind/ingredient-parser'

const ingredientString = '1 cup rice, washed'
const apiKey = 'YOUR_API_KEY'

const result = await parseIngredient(ingredientString, apiKey, {
  returnNutritionData: true,
})

console.log(result)
```

## API

### `parseIngredient(ingredientString, SPOONACULAR_API_KEY, options?)`

Parses an ingredient string and returns both the parsed ingredient data and ingredient metadata retrieved from Spoonacular.

```ts
import { parseIngredient } from '@jclind/ingredient-parser'

parseIngredient(
  ingredientString: string,
  SPOONACULAR_API_KEY: string,
  options?: {
    returnNutritionData?: boolean
  }
): Promise<IngredientResponseType>
```

| Parameter             | Type     | Required | Description                                             |
| --------------------- | -------- | -------- | ------------------------------------------------------- |
| `ingredientString`    | `string` | Yes      | Ingredient string formatted like `2 cups onions, diced` |
| `SPOONACULAR_API_KEY` | `string` | Yes      | Your Spoonacular API key                                |
| `options`             | `object` | No       | Additional parsing options                              |

### Options

| Option                | Type      | Default | Description                                             |
| --------------------- | --------- | ------- | ------------------------------------------------------- |
| `returnNutritionData` | `boolean` | `false` | Includes Spoonacular nutrition data in `ingredientData` |

---

## Response Structure

Returns an object with the following shape:

```ts
{
  id: string
  parsedIngredient: ParsedIngredientType
  ingredientData: IngredientDataType | null
  error?: {
    message: string
  }
}
```

---

### `parsedIngredient`

```ts
{
  quantity: 1,
  unit: 'cup',
  unitPlural: 'cups',
  symbol: 'c',
  ingredient: 'rice',
  originalIngredientString: '1 cup rice, washed',
  minQty: 1,
  maxQty: 1,
  comment: 'washed'
}
```

---

### `ingredientData`

```ts
{
  _id: '63caeabf4762c87be39c3795',
  ingredientId: 20444,
  originalName: 'rice',
  name: 'rice',
  amount: 1,
  possibleUnits: ['g', 'oz', 'cup'],
  consistency: 'solid',
  shoppingListUnits: ['ounces', 'pounds'],
  aisle: 'Pasta and Rice',
  image: 'uncooked-white-rice.png',
  imagePath: 'https://spoonacular.com/cdn/ingredients_100x100/uncooked-white-rice.png',
  nutrition?: {
    nutrients: [Array],
    properties: [Array],
    flavonoids: [Array],
    caloricBreakdown: [Object],
    weightPerServing: [Object]
  },
  dateAdded: 1674242751000,
  totalPriceUSACents: 75.71
}
```

## Error Handling

If the ingredient cannot be identified or the API key is invalid, the function returns an error object while still including the parsed ingredient structure.

### Unknown Ingredient

```ts
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
    originalIngredientString: 'Invalid Text',
    minQty: 0,
    maxQty: 0,
    comment: null
  }
}
*/
```

### Invalid API Key

```ts
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
    ingredient: 'rice',
    originalIngredientString: '1 cup rice',
    minQty: 1,
    maxQty: 1,
    comment: null
  }
}
*/
```

## TypeScript

This package ships with full TypeScript definitions. No additional `@types` package required.

```ts
import {
  parseIngredient,
  ParsedIngredientType,
  IngredientDataType,
  IngredientResponseType,
} from '@jclind/ingredient-parser'

const ingredientString: string = '1 cup rice, washed'
const apiKey: string = 'YOUR_API_KEY'

const parsed: IngredientResponseType = await parseIngredient(
  ingredientString,
  apiKey,
)

const parsedIngredient: ParsedIngredientType = parsed.parsedIngredient

const ingredientData: IngredientDataType | null = parsed.ingredientData
```

## Notes

- A valid Spoonacular API key is required for ingredient lookups.
- Ingredient parsing is powered by `recipe-ingredient-parser-v3`.
- Nutrition data is optional and disabled by default to reduce API usage.
- Parsed ingredient results are returned even when ingredient lookup fails.

## Issues & Contributing

Found a bug or have a feature request? [Open an issue](https://github.com/jclind/ingredient-parser/issues) on GitHub. PRs are welcome.
