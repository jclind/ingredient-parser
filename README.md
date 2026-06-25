# @jclind/ingredient-parser

Parse natural-language ingredient strings into structured data, and (optionally) enrich them with vendor-neutral metadata and an estimated price with provenance.

**v2** is a ground-up rewrite: the parser is a from-scratch tokenizer with **no `recipe-ingredient-parser-v3` dependency**, the output is richer and lossless (descriptors and preparation are kept, not discarded), and enrichment is key-free on the client. See the [Differences from v1](#differences-from-v1) section to migrate.

## Install

```bash
npm install @jclind/ingredient-parser      # v2.x
npm install @jclind/ingredient-parser@1    # pin the previous v1 line
```

## Quick start

**Parse only** — synchronous, offline, zero dependencies, no key:

```ts
import { parse } from '@jclind/ingredient-parser'

parse('1 1/2 cups all-purpose flour, sifted')
// {
//   quantity:  { value: 1.5, min: 1.5, max: 1.5, isRange: false, isApproximate: false },
//   unit:      { name: 'cup', plural: 'cups', symbol: 'c', type: 'volume', system: 'us' },
//   ingredient:{ name: 'all-purpose flour', descriptors: [], preparation: ['sifted'] },
//   comment:   'sifted',
//   original:  '1 1/2 cups all-purpose flour, sifted'
// }
```

**Parse + enrich** — async; looks the ingredient up via the proxy and attaches a price. No API key in the client:

```ts
import { ingredientParser } from '@jclind/ingredient-parser'

const { parsed, data } = await ingredientParser('200 g chicken breast')
// parsed.ingredient.name === 'chicken breast'
// data?.price === { cents: 178, basis: 'gram', grams: 200, perGramCents: 0.89, confidence: 'high' }
// data is null if the ingredient can't be looked up.
```

## API

### `parse(input: string): ParsedIngredientV2`
The core parser. Throws `TypeError` for non-string input; never throws for any string.

### `ingredientParser(input: string, options?: EnricherOptions): Promise<{ parsed, data }>`
Parses, then enriches via the proxy. `parsed` is always present; `data` is `null` when the ingredient isn't found. Network/proxy failures throw `EnrichError` — wrap in `try/catch` if you need to handle those.

### `createEnricher(options?)` / `createProxyProvider(options?)`
Lower-level building blocks if you want to enrich an already-parsed object or inject a custom provider/transport. `nameCandidates(name)` exposes the fallback chain.

### `parseIngredientString(input: string): ParsedIngredient` (legacy)
A v1-compatible adapter that projects the rich result to the **flat v1 shape** (`quantity`/`unit`/`unitPlural`/`symbol`/`ingredient`/`minQty`/`maxQty`/`comment`/`originalIngredientString`). Use this to migrate from v1 with minimal code changes.

### `calculatePrice` / `defaultToGrams` / `buildImageUrl` / `UNITS`
Exported utilities; `UNITS` is the full unit registry.

## Options (`EnricherOptions`)

| Option | Type | Default | Description |
|---|---|---|---|
| `serverUrl` | `string` | hosted proxy | Override the proxy base URL |
| `imageSize` | `'100x100' \| '250x250' \| '500x500'` | `'100x100'` | Image CDN size |
| `includeNutrition` | `boolean` | `false` | Include the nutrition block |
| `includeRaw` | `boolean` | `false` | Attach the raw provider response |
| `nameFallbacks` | `boolean` | `true` | On a miss, retry with progressively shorter names |
| `toGrams` | `ToGrams` | mass + density | Custom unit→grams converter for pricing |
| `transport` | `Transport` | `fetch` | Inject a fetch-compatible transport (for tests) |

## Output

### `ParsedIngredientV2`
```ts
{
  quantity: { value: number|null, min: number|null, max: number|null, isRange: boolean, isApproximate: boolean }
  unit: { name, plural, symbol: string|null, type: 'volume'|'mass'|'count'|'informal', system } | null
  ingredient: { name: string, descriptors: string[], preparation: string[] }
  comment: string | null
  original: string
}
```

### `Price` (provenance, the key richness over v1's bare number)
```ts
{
  cents: number
  basis: 'gram' | 'unit-estimate'   // gram-accurate vs single-unit fallback
  grams: number | null
  perGramCents: number | null
  confidence: 'high' | 'low'        // 'high' = exact mass conversion; 'low' = density-estimated / unit fallback
}
```

## Differences from v1

v2 is a deliberate breaking change. It was validated with a **differential audit of 57,697 inputs** run through both parsers; on realistic inputs v2 is equal-or-better on every case. The notable differences:

**Richer / lossless output (the main reason to upgrade)**
- Structured `quantity` object with `min`/`max`/`isRange`/`isApproximate` instead of three flat fields.
- `unit` is an object with `type` + `system` (enables conversion/pricing logic) instead of a bare string.
- Descriptors (`fresh`, `large`, …) and preparation (`chopped`, `minced`, …) are **kept** in `ingredient.descriptors[]` / `preparation[]` rather than silently stripped and lost.
- `Price` carries provenance (`basis`/`confidence`/`grams`) instead of a single opaque cents number.
- Enrichment is **key-free on the client** (the proxy holds the Spoonacular key).

**Bug fixes over v1** (verified in the differential)
- `3 large eggs` → `unit: null` (v1 returned `unit: "large"`).
- `2 bay leaves` → ingredient `"bay leaf"` (v1 returned `""`).
- `juice of 1 lemon` → `"lemon"` (v1 returned `"juice of lemon"`).
- `about 1 cup oats` → `"oats"` (v1 left `"about oats"`).
- `a cup of sugar` → `{ qty: 1, unit: "cup", ingredient: "sugar" }` (v1 mangled the name to `"a of sugar"`).
- Correct plurals: `pinch` → `"pinches"` (v1 `"pinchs"`); `strip`/`sprig` get plurals (v1 returned `null`).
- No more consecutive-T corruption, no Italian `q.b.` leak.

**Intentional contract changes** (update consumers accordingly)
- **`comment`** holds the parenthetical *content* (`"14 oz"`), not the literal `"(14 oz)"`. In the rich API it is `null` when absent (the legacy adapter maps it back to `''`).
- **Fractions keep full precision**: `1/3` → `0.3333…` (v1 rounded to `0.33`). More accurate for scaling/pricing — but if anything downstream expected 2-decimal values, account for it.
- **Migration path:** use `parseIngredientString` for the flat v1 shape during transition.

## Known limitations

Documented edge cases (negative quantities, scientific notation, malformed multi-dot numbers, etc.) are catalogued in the project's design notes. None throw; all degrade predictably.

## License

ISC
