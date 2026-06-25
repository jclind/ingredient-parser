# CLAUDE.md

Guidance for Claude Code when working in this repo. See `DESIGN.md` for the full contract and rationale.

## What this is

`@jclind/ingredient-parser-v2` — a ground-up rewrite of `@jclind/ingredient-parser` (the sibling `../ingredient-parser`). It parses a natural-language ingredient string into structured data and optionally enriches it with vendor-neutral metadata + a price with provenance. Status: `0.1.0-alpha` (unpublished).

Key difference from v1: **no `recipe-ingredient-parser-v3` dependency.** Parsing is a from-scratch single-pass tokenizer, which removed v1's whole tower of regex workarounds (the consecutive-T hack, size-words-as-units, the Italian `q.b.` leak).

## Commands

```bash
npm test                  # jest — 337 tests across 8 suites
npx jest src/__tests__/parseV2.test.ts        # one file
npx jest -t "fallback"    # by name pattern
npm run build             # dual ESM+CJS → dist/cjs + dist/esm (rimraf + tsc x2 + fixup)
npm run demo              # parse+enrich with a built-in fake proxy (offline)
npm run demo -- --live    # enrich against the real Railway proxy (needs the /v2 route deployed)
```

**Dependency note:** `node_modules` is symlinked from `../ingredient-parser` (shared toolchain). If tests fail with missing deps, run `npm install` here or recreate the symlink.

## Architecture

Two independent halves; the second uses the first:

```
ingredientParser(input, options)              # top-level convenience
  ├─ parse(input)                  → ParsedIngredientV2   (sync, offline, no deps)
  └─ createEnricher(options)(parsed) → IngredientData|null (async, network)
```

### Parse pipeline (`src/core/parse.ts`)
One pass: normalize (unicode fractions → ascii, lowercase, length-cap) → join hyphenated descriptors → strip trailing purpose phrases → split comment (all parens + first comma) → inverted-form lift (`juice of 1 lemon`) → informal-or-quantity → unit match → descriptor/preparation extraction.

- `core/quantity.ts` — one `readNumber` primitive (mixed/fraction/decimal/leading-dot) reused for both ends of a range.
- `core/units.ts` — **config-driven unit registry** (`UNITS`). Add a unit = one entry. Longest-alias-first matching; `UNIT_MODIFIERS` skipped; `SELF_NAMING_UNITS` (e.g. `bay leaf`) name themselves.
- `core/descriptors.ts` — size/quality → `descriptors[]`; prep verbs → `preparation[]`. Inline prep stripping is deliberately conservative (pre-noun words like `diced tomatoes` are product identity); the full prep vocabulary applies in comments. This asymmetry is intentional.
- `core/fractions.ts` — unicode fraction conversion.

### Output contract (`ParsedIngredientV2`)
`quantity:{value,min,max,isRange,isApproximate}`, `unit:{name,plural,symbol,type,system}|null`, `ingredient:{name,descriptors[],preparation[]}`, `comment:string|null`, `original`. `value`/`comment` are `null` when absent (v1 forced them to `0`/`''`).

### Enrichment (`src/enrich/`)
- Proxy-only: the client holds no API key. `createProxyProvider` calls the server's **`GET /v2/ingredient/:name`**, which returns the vendor-neutral shape (`NeutralIngredient`). The server owns vendor mapping.
- The client only resolves the image URL at its `imageSize` (`buildImageUrl`) and applies `includeNutrition`.
- **Name fallback chain:** on a miss, retry with progressively shorter names (drop leading words, most-specific first, cap 4) via `nameCandidates`. Disable with `nameFallbacks:false`. This exists because the proxy is an exact-match cache.
- **Price is computed client-side** (`enrich/price.ts`) because it depends on the parsed quantity/unit. `Price` carries provenance: `basis:'gram'|'unit-estimate'`, `grams`, `perGramCents`, `confidence:'high'|'low'`. Mass→grams is exact (high); volume→grams uses a density table (`enrich/volume.ts`, low); unconvertible → unit-estimate. Plug a converter via `opts.toGrams`.
- `enrich/types.ts` — vendor-neutral `IngredientData` (no `any`; opt-in `raw` holds the neutral object).

### Legacy adapter (`src/legacy/parseIngredientString.ts`)
Projects `ParsedIngredientV2` → the flat v1 `ParsedIngredient`. Lets the ported v1 test suite run as a regression gate and eases migration.

## Conventions / gotchas

- Source imports use explicit `.js` extensions (ESM-style); the dual build relies on this. Jest strips them via `moduleNameMapper`.
- The server miss response is **HTTP 200 with `data:null`** (never 404). The provider's 404 branch is defensive only.
- `--live` needs the server's `/v2` route deployed to Railway (Phase 1 server change). Until then, `--live` misses everything; offline `npm run demo` is the reliable smoke test.
- Server-side Spoonacular fallback / cache population is **not yet implemented** (Phase 2). Today the cache is warmed by the v1 client.
- Known parser limitations are catalogued in `DESIGN.md §7`.

## Key files
- `src/core/parse.ts` — parser orchestrator
- `src/core/units.ts` — unit registry (single source of truth)
- `src/enrich/enrich.ts` — provider + enricher + name-fallback
- `src/enrich/price.ts` / `volume.ts` — pricing + density conversion
- `src/enrich/types.ts` — vendor-neutral contract
- `src/ingredientParser.ts` — top-level parse+enrich
- `DESIGN.md` — full contract, decisions, known limitations
