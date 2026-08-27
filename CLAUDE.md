# CLAUDE.md

Guidance for Claude Code when working in this repo. See `DESIGN.md` for the full contract and rationale.

## What this is

`@jclind/ingredient-parser` — a ground-up rewrite of the v1 line (the sibling `../ingredient-parser`, still on branch `main` at 1.3.4). It parses a natural-language ingredient string into structured data and optionally enriches it with vendor-neutral metadata + a price with provenance. This repo is branch `2.x` and publishes the **2.x** line of the same npm package; Prepify pins it exactly in `server/package.json`.

The npm `latest` dist-tag sat on 1.3.4 until 2.1.0 moved it (2.0.0 was published without moving it). Check `npm view @jclind/ingredient-parser version` before assuming what a bare install gets.

Key difference from v1: **no `recipe-ingredient-parser-v3` dependency.** Parsing is a from-scratch single-pass tokenizer, which removed v1's whole tower of regex workarounds (the consecutive-T hack, size-words-as-units, the Italian `q.b.` leak).

## Commands

```bash
npm test                  # jest — 417 tests across 9 suites
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
One pass: normalize (unicode fractions → ascii, lowercase, length-cap) → join hyphenated descriptors → strip trailing purpose phrase (**recorded** as `purpose`, not discarded) → split comment (all parens + first comma) → inverted-form lift (`juice of 1 lemon`) → informal-or-quantity → unit match → container-size lift → descriptor/preparation extraction.

- `core/quantity.ts` — one `readNumber` primitive (mixed/fraction/decimal/leading-dot) reused for both ends of a range.
- `core/units.ts` — **config-driven unit registry** (`UNITS`). Add a unit = one entry. Longest-alias-first matching; `UNIT_MODIFIERS` skipped; `SELF_NAMING_UNITS` (e.g. `bay leaf`) name themselves.
- `core/descriptors.ts` — size/quality → `descriptors[]`; prep verbs → `preparation[]`. Inline prep stripping is deliberately conservative (pre-noun words like `diced tomatoes` are product identity); the full prep vocabulary applies in comments. This asymmetry is intentional.
- `core/fractions.ts` — unicode fraction conversion.

### Output contract (`ParsedIngredientV2`)
`quantity:{value,min,max,isRange,isApproximate}`, `unit:{name,plural,symbol,type,system}|null`, `ingredient:{name,descriptors[],preparation[]}`, `containerSize:{value,unit}|null`, `purpose:string|null`, `comment:string|null`, `original`. `value`/`comment` are `null` when absent (v1 forced them to `0`/`''`).

### Enrichment (`src/enrich/`)
- Proxy-only: the client holds no API key. `createProxyProvider` calls the server's **`GET /v2/ingredient/:name`**, which returns the vendor-neutral shape (`NeutralIngredient`). The server owns vendor mapping.
- The client only resolves the image URL at its `imageSize` (`buildImageUrl`) and applies `includeNutrition`.
- **Name fallback chain:** on a miss, retry with progressively shorter names (drop leading words, most-specific first, cap 4) via `nameCandidates`. Disable with `nameFallbacks:false`. This exists because the proxy is an exact-match cache.
- **Price is computed client-side** (`enrich/price.ts`) because it depends on the parsed quantity/unit. `Price` carries provenance: `basis:'gram'|'unit-estimate'|'free'`, `grams`, `perGramCents`, `confidence:'high'|'low'`. Mass→grams is exact (high); volume→grams uses a density table (`enrich/volume.ts`, low); unconvertible → unit-estimate. Plug a converter via `opts.toGrams`. Everything past `toGrams` is a context object (`{container, purpose, name}`), so the next parsed fact doesn't add a positional argument.
- **The unit-estimate fallback is gated** (2.1.0). It applies only to units that count discrete items, and a `perUnitCents` equal to `perGramCents` is discarded as a disguised per-gram price. Everything else gets `price: null`, which callers must render as "no price", never $0.00. See DESIGN.md §5. Before this, `1 1/3 cup salsa` priced at $0.01.
- **A container is priced by its label, not as an item** (2.2.0). `CONTAINER_UNITS` (`can`, `jar`, `bottle`, `package`, `bag`, `box`, `tin`, `carton`, `container`) plus a parenthetical measure → `containerSize`, which pricing multiplies by the count. Per container, not a total. Without this a can of a bulk good declined, since its per-unit price is the disguised per-gram one the gate above discards.
- **`basis:'free'` is the zero that means zero** (2.2.0, `enrich/free.ts`). Since a provider `0` means "no data", a real zero needs its own basis. Two triggers: an exact-match name allowlist (tap water, ice — never coconut/sparkling/tonic/rose water) and the *phrase* `to taste`/`as needed` **together with** no measure. Never trigger on a missing quantity alone: a bare `flour` is unknown, not free. Decided in `createEnricher` before the lookup, so a free row survives a miss — the proxy has no `water` entry at all.
- **The density table matches whole words, longest term first** (`enrich/volume.ts`). Not substring, not table order: `"boiling water"` contains `oil`, and `"peanut butter"` has to beat `butter`. Add entries to whichever group reads best; precedence takes care of itself.
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
- `src/enrich/price.ts` / `volume.ts` / `free.ts` — pricing, density conversion, free-by-name/purpose
- `src/enrich/types.ts` — vendor-neutral contract
- `src/ingredientParser.ts` — top-level parse+enrich
- `DESIGN.md` — full contract, decisions, known limitations
