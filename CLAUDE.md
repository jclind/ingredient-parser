# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build   # compile TypeScript → dist/ (runs rimraf dist && tsc)
npm test        # run all Jest tests
npx jest src/__tests__/parseIngredientString.test.ts   # run a single test file
npx jest -t "description text"   # run tests matching a name pattern
```

The package publishes only the `dist/` folder, so always run `npm run build` before publishing.

## Architecture

This is a TypeScript npm package (`@jclind/ingredient-parser`) that parses a natural-language ingredient string and enriches it with nutritional/pricing data from the Spoonacular API via a proxy server.

### Data Flow

```
parseIngredient(ingrString, apiKey, options)
  ├─ parseIngredientString()          → ParsedIngredient (local, sync)
  │    ├─ convertFractions()           pre-processes unicode/text fractions
  │    ├─ range quantity extraction      detects "1-2 cups", "2 to 3" patterns
  │    ├─ informal quantity pre-processing  handles "a pinch of", "handful" patterns
  │    ├─ parseStringConsecutiveTs()   wraps recipe-ingredient-parser-v3
  │    │    └─ removes consecutive "tt" sequences before parsing to fix
  │    │       a known bug in the upstream parser (e.g. "butter" → "bu er")
  │    ├─ unit normalization           converts units via unitNormalizations map
  │    ├─ unit post-processing          extracts unrecognized units (sprig, handful, dash, etc.)
  │    ├─ "fluid ounce" fix           overrides upstream parser's normalization
  │    └─ descriptor stripping         removes "fresh", "freshly", "chopped", etc.
  │
  └─ getIngredientInfo()              → IngredientData (async, network)
       └─ parseAndEnrich()            POSTs to the proxy server (/parse)
            └─ proxy hits Spoonacular on the server side with the API key
```

The proxy server URL defaults to `https://ingredient-parser-service-production-2635.up.railway.app` (configured in `src/api/http.ts`) and can be overridden via `options.serverUrl`. The `searchIngredient` / `getIngredientInformation` helpers in `src/api/requests.ts` call Spoonacular directly but are used only by the now-bypassed `getSpoonacularIngrData.ts` path.

### Exports

`index.ts` exports two public entry points:

- `ingredientParser(ingrString, apiKey, options?)` — full async pipeline (parsed + enriched)
- `parseIngredientString(ingrStr)` — sync-only local parsing, no network call

All shared types live in `types.ts` and are re-exported from the package root.

### Price Calculation

`calculatePrice` (called inside `ingredientParser`) converts the parsed unit to grams via `@jclind/ingredient-unit-converter`, then multiplies by `estimatedGramPrice`. Falls back to `estimatedSingleUnitPrice × quantity` when the unit is unrecognized or unconvertible.

## Recent Improvements (May 2026)

### Group 1: Quick Wins
1. **Type safety guard** - Added input validation to throw `TypeError` for null, undefined, or non-string inputs
2. **Extended modifier word stripping** - Added "freshly", "finely", "roughly", "coarsely", "grated", "chopped" to wordsToRemove array
3. **Unit recognition via post-processing** - Added detection for units that upstream parser doesn't recognize:
   - sprig/sprigs, strip/strips, sheet/sheets
   - dessertspoon/dessertspoons, handful/handfuls, dash/dashes
   - bay leaf/bay leaves
   - Includes plural-to-singular normalization
4. **Division by zero handling** - Wrapped upstream parser call in try-catch to return degraded result for "1/0 cups milk"
5. **"fluid ounce" fix** - Added post-processing to detect when input contains "fl oz" or "fluid ounce" and override the unit

### Group 2: Range Quantities
1. **Range extraction** - Added parsing for quantity ranges before comment/parentheses processing:
   - Hyphen ranges: "1-2 cups", "1–2 cups" (supports en dash)
   - "to" ranges: "2 to 3 tablespoons"
   - Extracts minQty and maxQty from patterns
   - Replaces range with minQty for upstream parsing
   - Preserves upstream parser's minQty/maxQty when no range found

### Group 3: Informal Quantities
1. **Pre-processing for informal quantities** - Added patterns that upstream parser doesn't handle well:
   - "a pinch of salt" → quantity: 1, unit: "pinch", ingredient: "salt"
   - "pinch of hot sauce" → quantity: 1, unit: "pinch", ingredient: "hot sauce"
   - "handful spinach" → quantity: 1, unit: "handful", ingredient: "spinach"
   - "a handful of raisins" → quantity: 1, unit: "handful", ingredient: "raisins"
2. **Implementation details**:
   - Added regex patterns to detect informal quantities before upstream parser
   - Extracts quantity, unit, and ingredient from matched patterns
   - Applies descriptor word stripping to ingredient names
   - Returns early, skipping upstream parser for these cases
   - Sets minQty/maxQty to match quantity

## Test Coverage

### Test Files
- `calculatePrice.test.ts` — Price calculation tests
- `convertFractions.test.ts` — Unicode fraction conversion tests
- `parseIngredientString.test.ts` — Main parsing tests (267 tests total)
- `parseIngredientString.edge.test.ts` — Adversarial input tests
- `parseStringConsecutiveTs.test.ts` — Consecutive-T word fix tests

### Test Categories
- **P0**: Adversarial/edge cases (null, undefined, special chars, injection attempts, long strings)
- **P1**: Tricky real-world inputs (parentheticals, inverted formats, informal quantities)
- **P2**: Extended quantity/unit/comment coverage (ranges, more unit types, modifiers)
- **P3**: Field-specific tests (symbol, unitPlural, originalIngredientString)
- **P4**: Internationalization (documents current behavior for non-English inputs)

### Test Results
- **Before improvements**: 16 failing tests
- **After all groups**: 267 passing tests (100% pass rate)

## Known Bugs Documented in Tests

- **Unicode fractions adjacent to digits**: `2½` → expected `2 1/2` but currently `21/2` (parsed as 10.5)
- **Size descriptors as units**: `3 large eggs` → unit is `"large"` instead of `null`
- **Zero quantity in calculatePrice**: quantity `0` returns fallback price instead of `0`

## Key Files

- `src/funcs/parseIngredientString.ts` — Main parsing logic with all improvements
- `src/funcs/parseStringConsecutiveTs.ts` — Fixes consecutive-T bug, exports ParsedIngredientOmitType
- `src/funcs/convertFractions.ts` — Converts unicode fractions to ASCII
- `src/funcs/calculatePrice.ts` — Calculates price from unit and nutrition data
- `src/api/http.ts` — HTTP clients for Spoonacular and Railway proxy
- `src/api/requests.ts` — API request functions
- `types.ts` — Shared TypeScript types
