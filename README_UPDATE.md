# `@jclind/ingredient-parser`

Parse natural-language ingredient strings and enrich them with nutritional and pricing data from [Spoonacular](https://spoonacular.com/food-api).

## Installation

```bash
npm install @jclind/ingredient-parser
```

## Quick Start

```ts
import { ingredientParser } from '@jclind/ingredient-parser'

const result = await ingredientParser('1 cup rice, washed', 'YOUR_API_KEY')

if ('error' in result) {
  console.error(result.error.message)
} else {
  console.log(result.parsedIngredient) // { quantity: 1, unit: 'cup', ingredient: 'rice', ... }
  console.log(result.ingredientData)   // { name: 'rice', aisle: 'Pasta and Rice', ... }
}
```

No API key? Use `parseIngredientString` for local-only parsing:

```ts
import { parseIngredientString } from '@jclind/ingredient-parser'

const parsed = parseIngredientString('1 1/2 cups flour, sifted')
// { quantity: 1.5, unit: 'cup', ingredient: 'flour', comment: 'sifted', ... }
```

---

## API

### `ingredientParser(ingrString, apiKey, options?)`

Parses an ingredient string and fetches enriched data from Spoonacular via a proxy server. Returns a `Promise<IngredientResponse>`.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `ingrString` | `string` | Yes | Ingredient string, ideally `(quantity) (unit) (ingredient), (comment)` |
| `apiKey` | `string` | Yes | Your [Spoonacular API key](https://spoonacular.com/food-api) |
| `options` | `OptionsType` | No | See [Options](#options) below |

```ts
const result = await ingredientParser('2 tbsp olive oil', 'YOUR_API_KEY')
```

---

### `parseIngredientString(ingrStr)`

Parses an ingredient string locally with no network call. Returns a `ParsedIngredient` synchronously.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `ingrStr` | `string` | Yes | Ingredient string to parse |

```ts
import { parseIngredientString } from '@jclind/ingredient-parser'

const parsed = parseIngredientString('1/2 cup butter, melted')
// {
//   quantity: 0.5,
//   unit: 'cup',
//   ingredient: 'butter',
//   comment: 'melted',
//   originalIngredientString: '1/2 cup butter, melted',
//   ...
// }
```

---

## Options

```ts
type OptionsType = {
  returnNutritionData?: boolean          // Include full nutrition breakdown (default: false)
  imageSize?: '100x100' | '250x250' | '500x500'  // Spoonacular image size (default: '100x100')
  serverUrl?: string                     // Override the default proxy server URL
}
```

### `returnNutritionData`

When `true`, the `ingredientData` object includes a `nutrition` field with a full nutrient breakdown.

```ts
const result = await ingredientParser('200g chicken breast', 'YOUR_API_KEY', {
  returnNutritionData: true,
})
// result.ingredientData.nutrition.nutrients → [{ name: 'Protein', amount: 38.5, unit: 'g', ... }]
```

### `imageSize`

Controls the resolution of `ingredientData.imagePath`. Defaults to `'100x100'`.

```ts
const result = await ingredientParser('1 cup milk', 'YOUR_API_KEY', {
  imageSize: '500x500',
})
// result.ingredientData.imagePath → 'https://spoonacular.com/cdn/ingredients_500x500/milk.png'
```

### `serverUrl`

The package routes Spoonacular requests through a proxy server. By default this is a hosted instance. Pass `serverUrl` to point at your own:

```ts
const result = await ingredientParser('1 cup rice', 'YOUR_API_KEY', {
  serverUrl: 'https://your-own-server.com',
})
```

---

## Return Types

### `IngredientResponse`

`ingredientParser` returns one of two shapes depending on whether the call succeeded:

```ts
// Success
{
  parsedIngredient: ParsedIngredient
  ingredientData: IngredientData
}

// Failure
{
  error: { message: string }
  parsedIngredient: ParsedIngredient
  ingredientData: null
}
```

Always check for `'error' in result` before accessing `ingredientData`:

```ts
const result = await ingredientParser('1 cup rice', 'YOUR_API_KEY')

if ('error' in result) {
  console.error(result.error.message)
} else {
  console.log(result.ingredientData.name)
}
```

---

### `ParsedIngredient`

Returned by both `ingredientParser` and `parseIngredientString`.

```ts
type ParsedIngredient = {
  quantity: number | null
  unit: string | null
  unitPlural: string | null
  symbol: string | null
  ingredient: string | null
  originalIngredientString: string
  minQty: number | null
  maxQty: number | null
  comment: string | null
}
```

**Example** — `'1 1/2 cups flour, sifted'`:
```ts
{
  quantity: 1.5,
  unit: 'cup',
  unitPlural: 'cups',
  symbol: 'c',
  ingredient: 'flour',
  originalIngredientString: '1 1/2 cups flour, sifted',
  minQty: 1.5,
  maxQty: 1.5,
  comment: 'sifted'
}
```

---

### `IngredientData`

Returned inside `ingredientParser` results when the ingredient is found.

```ts
{
  name: string
  ingredientId?: number
  originalName?: string
  amount?: number
  possibleUnits?: string[]
  consistency?: string
  shoppingListUnits?: string[]
  aisle?: string
  image?: string
  imagePath?: string             // Full Spoonacular CDN URL
  totalPriceUSACents?: number    // Estimated price in US cents
  nutrition?: Nutrition          // Only present if returnNutritionData: true
}
```

---

## Error Handling

### Checking for errors

`ingredientParser` does not throw for expected failure cases (unknown ingredient, bad API key). It returns an error-shaped object instead:

```ts
const result = await ingredientParser('xyzzy frobulate', 'YOUR_API_KEY')

if ('error' in result) {
  // result.error.message describes what went wrong
  // result.parsedIngredient is still populated
  // result.ingredientData is null
}
```

### Network and API errors

For network-level failures (timeout, DNS, server error), `ingredientParser` throws. Wrap calls in `try/catch`:

```ts
try {
  const result = await ingredientParser('1 cup rice', 'YOUR_API_KEY')
  if ('error' in result) { /* handle gracefully */ }
} catch (err) {
  // err.message will be one of:
  // 'API Key Not Valid'
  // 'Rate limit exceeded, please try again later'
  // 'Error Occurred, Please Try Again'
  // 'Network error, please try again'
}
```

### Error message reference

| Message | Cause |
|---|---|
| `'API Key Not Valid'` | Spoonacular rejected the API key (HTTP 401) |
| `'Rate limit exceeded, please try again later'` | Spoonacular rate limit hit (HTTP 429) |
| `'Error Occurred, Please Try Again'` | Spoonacular returned an unexpected HTTP error |
| `'Network error, please try again'` | Request timed out or no network response received |
| `'Ingredient not formatted correctly or Ingredient Unknown...'` | Ingredient could not be parsed or identified |

---

## TypeScript

Full type definitions are included. Import the types directly:

```ts
import {
  ingredientParser,
  parseIngredientString,
  IngredientResponse,
  ParsedIngredient,
  IngredientData,
  OptionsType,
} from '@jclind/ingredient-parser'

const options: OptionsType = { returnNutritionData: true, imageSize: '250x250' }
const result: IngredientResponse = await ingredientParser('1 cup rice', 'YOUR_API_KEY', options)

if (!('error' in result)) {
  const data: IngredientData = result.ingredientData
  const parsed: ParsedIngredient = result.parsedIngredient
}
```

---

## Requirements

- Node.js 14.17 or later
- A [Spoonacular API key](https://spoonacular.com/food-api) (free tier available)

---

## Changelog

### 1.2.13
- Added 8-second timeout to all HTTP requests — stalled servers no longer hang indefinitely
- Hardened network error handling: network failures, rate limits (429), and auth errors (401) now each surface a distinct, actionable error message instead of crashing with a secondary `TypeError`
- Fixed `calculatePrice` returning `null` for zero-quantity ingredients and for ingredients with unrecognised units (e.g. `'can'`, `'handful'`) — now correctly returns `0` and falls back to the unit price estimate respectively

### 1.2.12
- Fixed CommonJS build compatibility with webpack and browser bundlers (`esModuleInterop`)

### 1.2.11 and earlier
- Initial Railway proxy integration, unit normalisation improvements, security dependency updates
