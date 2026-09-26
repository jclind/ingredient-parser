# @jclind/ingredient-parser-v2

A TypeScript package for parsing ingredient strings and retrieving structured ingredient data from the Spoonacular API — now with **real Kroger retail pricing**.

Built on top of [recipe-ingredient-parser-v3](https://www.npmjs.com/package/recipe-ingredient-parser-v3). If you only need ingredient parsing without ingredient metadata, nutrition, or API lookups, you may prefer using that package directly.

---

## What's new in v2: Kroger pricing

v1 returned `totalPriceUSACents` from Spoonacular's *estimated* cost. v2 keeps everything v1 did and adds a new client factory, `createIngredientParser`, that fetches the **real shelf price** for the ingredient from the Kroger-banner store nearest a zip code, and only falls back to the Spoonacular estimate when Kroger can't match.

- **Same input/output contract** as v1. Spoonacular still supplies all metadata
  (image, aisle, nutrition, `possibleUnits`). Kroger only changes where
  `totalPriceUSACents` comes from.
- **Graceful fallback.** No store in range, no product match, or any Kroger
  error → the Spoonacular estimate is used, exactly like v1.
- **Additive output fields** so you can tell what happened: `priceSource`
  (`'kroger' | 'spoonacular'`), `store`, and `matchedProduct`.
- **Cached per store + day** in the proxy server's MongoDB so repeat lookups
  don't re-hit Kroger.

```ts
import { createIngredientParser } from '@jclind/ingredient-parser-v2'

const parser = createIngredientParser({
  spoonacularAPIKey: process.env.SPOONACULAR_API_KEY!,
  kroger: {
    clientId: process.env.KROGER_CLIENT_ID!,
    clientSecret: process.env.KROGER_CLIENT_SECRET!,
  },
  zipCode: '45202', // resolved to the nearest store once, then reused
})

const result = await parser.parse('2 cups onions, diced')
// result.ingredientData.totalPriceUSACents → real price for 2 cups from Kroger
// result.ingredientData.priceSource        → 'kroger' (or 'spoonacular' on fallback)
// result.ingredientData.store              → 'Ralphs'
// result.ingredientData.matchedProduct     → 'Kroger Yellow Onion'
```

### `createIngredientParser(config)`

| Config field        | Type                 | Required | Description |
|---------------------|----------------------|----------|-------------|
| `spoonacularAPIKey` | `string`             | Yes      | Still required — supplies ingredient metadata. |
| `kroger`            | `{ clientId, clientSecret, baseUrl? }` | No | Kroger Developer API credentials. Omit to behave exactly like v1. |
| `zipCode`           | `string`             | No*      | Zip whose nearest Kroger-banner store sets prices. |
| `locationId`        | `string`             | No*      | Pin a specific Kroger store instead of resolving from `zipCode`. |
| `serverUrl`         | `string`             | No       | Override the metadata/cache proxy server URL. |
| `krogerCacheTtlMs`  | `number`             | No       | Freshness window for a cached Kroger price. Default 24h. |

\* When `kroger` is set, provide a `zipCode` **or** a `locationId`.

`createIngredientParser` returns a client with one method:

```ts
parser.parse(
  ingredientString: string,
  options?: {
    returnNutritionData?: boolean
    imageSize?: '100x100' | '250x250' | '500x500'
    fresh?: boolean   // bypass the Kroger price cache for this call
  }
): Promise<IngredientResponse>   // identical shape to ingredientParser()
```

### How the Kroger price becomes `totalPriceUSACents`

Kroger returns a package price plus a pack size (e.g. `$3.49`, `18 ct`). The
package is reduced to a per-base-unit price, then bridged to your recipe
quantity using the same `@jclind/ingredient-unit-converter` path v1 already used
for Spoonacular — so `totalPriceUSACents` means exactly what it did before.
Volume↔weight conversions use a water-like density approximation; count-only
products (e.g. eggs) are priced per each.

### Getting Kroger credentials

Register a free app at <https://developer.kroger.com> for a `clientId` /
`clientSecret`. The package requests the `product.compact` scope via the
client-credentials grant; no per-user OAuth is needed.

The new MongoDB collection used for caching Kroger prices is documented in the
[server README](../ingredient-parser-server/README.md#kroger-price-cache-v2).

---

## v1 API (unchanged)

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
