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
import { ingredientParser } from '@jclind/ingredient-parser'

const result = await ingredientParser('1 cup rice, washed', 'YOUR_API_KEY', {
  returnNutritionData: true,
})

console.log(result)
```

## API

### `ingredientParser(ingredientString, apiKey, options?)`

Parses an ingredient string and returns both the parsed ingredient data and ingredient metadata retrieved from Spoonacular.

```ts
import { ingredientParser } from '@jclind/ingredient-parser'

ingredientParser(
  ingredientString: string,
  apiKey: string,
  options?: {
    returnNutritionData?: boolean
    imageSize?: '100x100' | '250x250' | '500x500'
    serverUrl?: string
  }
): Promise<IngredientResponse>
```

| Parameter          | Type     | Required | Description                                             |
| ------------------ | -------- | -------- | ------------------------------------------------------- |
| `ingredientString` | `string` | Yes      | Ingredient string formatted like `2 cups onions, diced` |
| `apiKey`           | `string` | Yes      | Your Spoonacular API key                                |
| `options`          | `object` | No       | Additional parsing options                              |

#### Options

| Option                | Type                                    | Default     | Description                                                   |
| --------------------- | --------------------------------------- | ----------- | ------------------------------------------------------------- |
| `returnNutritionData` | `boolean`                               | `false`     | Includes Spoonacular nutrition data in `ingredientData`       |
| `imageSize`           | `'100x100' \| '250x250' \| '500x500'`  | `'100x100'` | Size of the ingredient image returned in `imagePath`          |
| `serverUrl`           | `string`                                | —           | Override the default proxy server URL used to call Spoonacular |

---

### `parseIngredientString(ingredientString)`

Parses an ingredient string locally without any network calls. Use this when you only need quantity, unit, and ingredient name extraction.

```ts
import { parseIngredientString } from '@jclind/ingredient-parser'

parseIngredientString(ingredientString: string): ParsedIngredient
```

```ts
parseIngredientString('1 cup rice, washed')
// {
//   quantity: 1,
//   unit: 'cup',
//   unitPlural: 'cups',
//   symbol: 'c',
//   ingredient: 'rice',
//   originalIngredientString: '1 cup rice, washed',
//   minQty: 1,
//   maxQty: 1,
//   comment: 'washed'
// }
```

---

## Response Structure

`ingredientParser` returns a discriminated union. On success, `ingredientData` is always present. On error, `error` is present and `ingredientData` is `null`.

```ts
// Success
{
  parsedIngredient: ParsedIngredient
  ingredientData: IngredientData
  id?: string
}

// Error
{
  error: { message: string }
  parsedIngredient: ParsedIngredient
  ingredientData: null
  id?: string
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
    nutrients: [...],
    properties: [...],
    flavonoids: [...],
    caloricBreakdown: {...},
    weightPerServing: {...}
  },
  totalPriceUSACents: 75.71
}
```

---

## Error Handling

The function returns an error object (and `ingredientData: null`) when the ingredient cannot be identified or the API key is invalid. `parsedIngredient` is always populated.

### Unknown Ingredient

```ts
const result = await ingredientParser('Invalid Text', 'YOUR_API_KEY')

/*
{
  error: { message: 'Ingredient not formatted correctly or Ingredient Unknown. Please pass ingredient comments/instructions after a comma' },
  ingredientData: null,
  parsedIngredient: {
    quantity: null,
    unit: null,
    unitPlural: null,
    symbol: null,
    ingredient: 'Invalid Text',
    originalIngredientString: 'Invalid Text',
    minQty: null,
    maxQty: null,
    comment: null
  }
}
*/
```

### Invalid API Key

```ts
const result = await ingredientParser('1 cup rice', 'INVALID_KEY')

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

---

## TypeScript

This package ships with full TypeScript definitions. No additional `@types` package required.

```ts
import {
  ingredientParser,
  parseIngredientString,
  ParsedIngredient,
  IngredientData,
  IngredientResponse,
} from '@jclind/ingredient-parser'

const result: IngredientResponse = await ingredientParser(
  '1 cup rice, washed',
  'YOUR_API_KEY'
)

if ('error' in result) {
  console.error(result.error.message)
} else {
  const parsed: ParsedIngredient = result.parsedIngredient
  const data: IngredientData = result.ingredientData
}
```

---

## Notes

- A valid Spoonacular API key is required for ingredient lookups via `ingredientParser`.
- `parseIngredientString` works offline with no API key.
- Nutrition data is optional and disabled by default to reduce API usage.
- `parsedIngredient` is always populated, even when the API call fails.

## Issues & Contributing

Found a bug or have a feature request? [Open an issue](https://github.com/jclind/ingredient-parser/issues) on GitHub. PRs are welcome.
