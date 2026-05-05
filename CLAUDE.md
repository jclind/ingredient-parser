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

### Data flow

```
parseIngredient(ingrString, apiKey, options)
  ├─ parseIngredientString()          → ParsedIngredient (local, sync)
  │    ├─ convertFractions()           pre-processes unicode/text fractions
  │    ├─ parseStringConsecutiveTs()   wraps recipe-ingredient-parser-v3
  │    │    └─ removes consecutive "tt" sequences before parsing to fix
  │    │       a known bug in the upstream parser (e.g. "butter" → "bu er")
  │    └─ unit normalization + descriptor stripping ("small", "fresh", …)
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

### Price calculation

`calculatePrice` (called inside `ingredientParser`) converts the parsed unit to grams via `@jclind/ingredient-unit-converter`, then multiplies by `estimatedGramPrice`. Falls back to `estimatedSingleUnitPrice × quantity` when the unit is unrecognized or unconvertible.

### Tests

Tests live in `src/__tests__/` and cover the pure/local functions only (`calculatePrice`, `convertFractions`, `parseIngredientString`, `parseStringConsecutiveTs`). The async network layer has no tests.
