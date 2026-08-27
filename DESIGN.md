# ingredient-parser v2 — Design

Status: **draft / spike-backed.** The parse contract below is implemented and
passes all **249 ported v1 parser cases** (the v1 repo's 278 tests also included
`calculatePrice` and the now-obsolete consecutive-T helper tests, which are not
ported), plus the v2-specific suites — **340 tests** in total. The enrichment + price
sections are forward-looking specs for later phases.

---

## 1. Goals & non-goals

**Goals**
- Own the parsing end-to-end: no `recipe-ingredient-parser-v3`, no string-surgery
  workarounds (the consecutive-T hack, the `q.b.` leak, size-words-as-units).
- A single, config-driven unit registry — adding a unit is one entry.
- A **richer, lossless** output: keep descriptors and preparation instead of
  deleting them; expose quantity ranges and approximation as structured data.
- Clean separation between the **pure parser** (sync, offline, no deps) and the
  **enrichment client** (async, network). The parser ships and is usable alone.
- A vendor-neutral enrichment contract so Spoonacular is an implementation
  detail, not part of the public API.

**Non-goals (v2.0)**
- Multi-language parsing (English only; structure leaves room to add later).
- Multi-ingredient / full-recipe parsing in one call.
- Nutrition math beyond passing through what the provider returns.

---

## 2. Parse contract — `ParsedIngredientV2`

`parse(input: string): ParsedIngredientV2`. Throws `TypeError` on non-string input.

```ts
interface ParsedIngredientV2 {
  quantity: {
    value: number | null      // primary amount; null = no quantity present
    min: number | null         // = value when not a range
    max: number | null         // = value when not a range
    isRange: boolean           // "1-2 cups", "2 to 3 tbsp"
    isApproximate: boolean     // leading "about|approximately|approx|around|roughly"
  }
  unit: {
    name: string               // canonical singular, e.g. "tablespoon"
    plural: string             // "tablespoons"
    symbol: string | null      // "tbs"; null for count/informal units
    type: 'volume' | 'mass' | 'count' | 'informal'
    system: 'metric' | 'us' | 'imperial' | 'none'
  } | null                      // null when no unit (e.g. "3 eggs")
  ingredient: {
    name: string               // lowercased base name, descriptors/prep removed
    descriptors: string[]      // size/quality kept, not discarded: "large", "fresh"
    preparation: string[]      // normalized prep verbs: "chopped", "minced"
  }
  containerSize: {             // "1 can (15 oz)" → the measure on the label
    value: number              // PER container; multiply by quantity for the total
    unit: { name, plural, symbol, type, system }
  } | null                     // null unless the unit is a container AND a paren held a measure
  purpose:                     // the trailing phrase, normalized; null when absent
    | 'to taste' | 'as needed' | 'for garnish' | 'for serving' | 'for topping'
    | null
  comment: string | null       // raw free text after first comma + parenthetical; null when absent
  original: string             // input, byte-for-byte
}
```

### Field semantics

- **quantity.value** — `null` means "no number was written" (v2 no longer forces
  this to `0` the way v1 did). `0` means a literal `0` (or `1/0`, which is treated
  as `0` rather than `Infinity`).
- **quantity.min/max** — always populated when `value` is non-null; equal to
  `value` for a scalar, distinct for a range. `isRange` disambiguates.
- **unit.type / system** — new in v2. Enables downstream conversion and pricing
  to reason about a unit without a hardcoded name list (e.g. "is this convertible
  to grams?" → `type === 'mass' || 'volume'`).
- **ingredient.descriptors** — size + quality words pulled out of the name:
  `small, medium, large, fresh, dried, canned`. Preserved so a consumer can keep
  them for display or pricing (bone-in vs boneless) while still matching the base
  name. Hyphenated compounds (`sun-dried`, `extra-virgin`) stay in the name.
- **ingredient.preparation** — prep verbs, normalized and deduped. **Inline**
  (before the noun) only `grated`/`chopped` are pulled out, because a pre-noun
  word is usually part of the grocery identity (`diced tomatoes`, `minced garlic`
  are canonical items — stripping them breaks lookup). **In the comment** (after
  a comma) the full prep vocabulary applies, because there the word is an
  instruction (`tomatoes, diced` = dice the tomatoes). This inline/comment
  asymmetry is intentional, not an oversight.
- **containerSize** (2.2.0) — a container ("1 can", "2 jars") is packaging, not
  an amount, and nobody sells "one can" as a priceable item. When a parenthetical
  carries a mass or volume it is recorded here so pricing can use the real
  measure. Read as the size of **one** container: `"2 cans (14.5 oz each)"` and
  the far more common `"2 cans (14.5 oz)"` both mean 14.5 oz per can. The measure
  stays in `comment` as well, deliberately — `comment` is documented as the raw
  text, the legacy projection has no `containerSize` to fall back on, and a cook
  shopping for the recipe wants to see the can size.
- **purpose** (2.2.0) — the trailing phrase that used to be stripped and thrown
  away. It carries the one fact that separates "no amount exists" from "the
  author forgot one", which is exactly what pricing needs to decide between $0.00
  and "unknown". Spellings are folded onto one canonical form each (`to serve` →
  `for serving`; `as required`/`as desired` → `as needed`).
- **comment** — everything after the first comma plus any parenthetical content,
  joined and trimmed; `null` when absent. (The legacy projection maps this back
  to `''` to preserve the v1 contract.)

### Inverted form

`"juice of 1 lemon"` / `"zest of 2 oranges"` →
`quantity.value: 1`, `ingredient.name: "lemon"`, `preparation: ["juice"]`.
The leading `juice|zest|rind|peel of` is lifted into `preparation` and the
remainder is parsed normally.

---

## 3. Unit registry

Single source of truth (`core/units.ts`): an array of `UnitDef` records, each
with `name`, `plural`, `symbol`, `type`, `system`, and `aliases[]`. A derived
alias table is sorted longest-first so multi-word units (`fluid ounce`,
`bay leaf`) and longer abbreviations win over their prefixes. `UNIT_MODIFIERS`
(`heaped`, `scant`, `level`, …) are skipped when locating the unit.

This replaces, in one place: v1's `unitNormalizations`, `unrecognizedUnits`,
`unitSingular`, the `"fl oz"` override, the `q.b.` normalization, and the upstream
parser's `engUnits` / `engPluralUnits` / `engNameToSymbol` tables.

---

## 4. Legacy projection (`legacy/parseIngredientString`)

A thin adapter that maps `ParsedIngredientV2` → the flat v1 `ParsedIngredient`,
provided for migration and as the spike's acceptance gate.

| v1 field | v2 source |
|---|---|
| `quantity` | `quantity.value ?? 0` |
| `unit` | `unit?.name ?? null` |
| `unitPlural` | `unit?.plural ?? null` |
| `symbol` | `unit?.symbol ?? null` |
| `ingredient` | `ingredient.name` |
| `minQty` | `quantity.min ?? 0` |
| `maxQty` | `quantity.max ?? 0` |
| `comment` | `comment ?? ''` |
| `originalIngredientString` | `original` |

---

## 5. Enrichment contract (IMPLEMENTED)

`createEnricher(options)(parsed)` returns vendor-neutral data, mapped from
whatever provider is configured, with a quantity-aware `price`. No `any`
passthrough; a single optional `raw` escape hatch. The proxy is reached through
an injectable `Transport` (fetch-compatible), so the flow is unit-tested with a
fake — no live server needed. Spoonacular mapping is isolated in one file
(`enrich/spoonacular.ts`) so swapping providers is local.

**Name fallback chain.** The real proxy is an exact-match cache, so a richer
parsed name ("boneless chicken breast") misses while the base noun
("chicken breast") hits. On a miss the enricher retries with progressively
shorter names — dropping leading modifier words, most-specific first
("boneless chicken breast" → "chicken breast" → "breast") — and takes the first
hit (capped at 4 attempts). Verified live: this turns prior misses into
gram-accurate prices. Disable with `nameFallbacks: false`; the candidate list is
the pure, exported `nameCandidates(name)`.

```ts
interface IngredientData {
  name: string
  category: string | null        // was Spoonacular `aisle`
  image: string | null           // full URL, resolved
  possibleUnits: string[]
  nutrition: Nutrition | null    // only when requested
  price: Price | null
  raw?: unknown                  // provider response, opt-in
}
```

**Note on the proxy boundary:** ingredient *metadata* (name/category/nutrition/
per-name price estimates) is cached server-side per name; `price` is computed
**client-side** because it depends on the parsed quantity/unit (which the proxy
doesn't see).

**Phase 1 (DONE):** vendor mapping moved server-side. The client calls the
server's `GET /v2/ingredient/:name`, which returns the neutral wire shape
(`NeutralIngredient`: `name`, `category`, `imageFilename`, `possibleUnits`,
`nutrition`, `estimatedPrices:{perGramCents,perUnitCents}}`). The client only
resolves the image URL at its chosen `imageSize` and applies `includeNutrition`.
The v1 raw route is untouched, so v1 clients keep working — one server, versioned
response shape. **Phase 2 (pending):** server fills cache misses from Spoonacular
(holds the key) so the client never needs it.

### 5.1 Price — with provenance (the key richness win)

v1 returned a bare `totalPriceUSACents` number with no way to know how it was
derived. v2:

```ts
interface Price {
  cents: number                  // estimated total for the parsed quantity
  basis:                         // gram-accurate | single-unit fallback | genuinely free
    | 'gram' | 'unit-estimate' | 'free'
  grams: number | null           // grams used when basis === 'gram'
  perGramCents: number | null
  confidence: 'high' | 'low'     // 'low' when the unit wasn't convertible
}
```

`basis: 'gram'` when the parsed unit converts to grams (via the unit converter);
`'unit-estimate'` when it doesn't and we fall back to `perUnit × quantity`.
No silent `Math.ceil`; rounding is explicit and documented.

`price` is `null` when neither path can answer honestly. Two gates decide that,
both added in 2.1.0 after a volume-measured ingredient shipped at 1/236th of its
real cost:

- **The unit-estimate fallback only applies to units that count discrete items**
  (`count`, `informal`, or no unit at all). A per-item price is an answer to
  "what does one of these cost?", so applying it to a mass or volume measure is a
  category error rather than a rough estimate. `1 1/3 cup salsa` came out at
  $0.01 against a real $1.23.
- **A `perUnitCents` equal to `perGramCents` is treated as absent.** Providers
  derive it from a "cost of amount = 1" lookup whose unit is the ingredient's own
  default, and for bulk goods that default is a gram, so the per-gram price comes
  back wearing a per-item label. Across a 20-ingredient probe the equality was
  exact for every bulk ingredient and never held for a countable one.

Callers should render a null price as "no price" and offer the user a way to
supply one, not as $0.00.

### 5.2 Free — the zero that means zero (2.2.0)

The gates above create a problem: `usablePrice` treats a provider price of `0` as
"no data", so there is no way to say "this genuinely costs nothing" with a
number. `basis: 'free'` (always `cents: 0`, `confidence: 'high'`) is that signal.
Callers render it as a plain $0.00 — not an estimate, and not the "needs price"
nag.

Two independent triggers, deliberately kept apart:

- **By name.** An exact-match allowlist of water you get from a tap, plus ice.
  Exact-match because a word rule on `water` would zero coconut water, sparkling
  water, tonic water and rose water, all of which you buy (and `watermelon`,
  `water chestnuts`, `watercress` for good measure). Free wins over an available
  per-gram price, because the provider's price for "water" is for the bottled
  kind and 4 cups of tap water at 95c is worse than no price at all.
- **By purpose.** The phrase **and** the absence of any measure. Both halves
  matter. `1 tsp salt to taste` has a real amount and is priced normally; a bare
  `flour` has an *unknown* cost, and zeroing it would understate the recipe,
  which is the same failure the 2.1.0 gates exist to prevent. Only `to taste` and
  `as needed` qualify — a garnish is a small amount of a real ingredient, not an
  absent one.

**The free verdict does not depend on a successful lookup.** `createEnricher`
decides it before the provider can, and a free row survives a miss with a
synthetic result. This is not hypothetical: the proxy has no `water` entry under
any spelling, so the whole path would otherwise be unreachable. The lookup still
runs first, because the metadata (a thumbnail) is worth having; it just isn't
allowed to decide the price.

---

## 6. Architecture decisions

- **Proxy-only.** The client never holds a Spoonacular key. It calls a single
  proxy endpoint that parses+enriches+caches server-side. This removes the
  client-side `getSpoonacularIngrData` path, the direct `spoonacularHttp` client,
  and the `apiKey` argument — and resolves v1's documented-vs-actual drift.
- **Provider abstraction.** Enrichment sits behind an interface; Spoonacular is
  one impl. Leaves room for USDA FoodData Central (nutrition) / Open Food Facts.
- **Build.** Dual ESM + CJS (IMPLEMENTED): `tsc` emits `dist/cjs` and `dist/esm`,
  each tagged via a generated `package.json` `type`, wired through the root
  `exports` map (`import`→esm, `require`→cjs). Native `fetch` (injectable
  `Transport`) — no axios. Both formats verified to load.
- **Packaging.** `parse`, `ingredientParser`, the enrichment client, and the
  legacy adapter are all exported from the root.

---

## 7. Known limitations (audited, not yet handled)

Surfaced by code review; documented rather than fixed because they are rare,
malformed, or the safe fix is non-obvious. None throw; all degrade predictably.

- **Descending ranges** (`"5-2 cups"`) are accepted as-is (`min:5, max:2`); no
  validation/swap. Real recipe ranges are ascending.
- **Negative quantities** (`"-2 cups"`) → `value: null`, and `-2` stays in the
  name. Negatives aren't meaningful for ingredients.
- **Scientific notation** (`"1e3 cups"`) parses the leading `1`, not `1000`;
  a malformed multi-dot number (`"1.2.3 cups"`) parses `1.2` and leaves `.3` in
  the name.
- **Vulgar fraction glued to a trailing digit** (`"½2 cups"`) is converted to
  `"1/2 2"` and mis-read. Malformed input.
- **Compound inverted forms** (`"zest and juice of 1 lime"`) — only a single
  leading `juice|zest|rind|peel of` is lifted; the compound phrase isn't split.
- **Unit-then-comma-then-name** (`"8 oz., drained beans"`) → the comma split
  routes `beans` into the comment, leaving an empty name. Needs name/comment
  disambiguation beyond the first-comma heuristic.
- **Attached punctuation** (`"1 tsp.salt"`, no space) → the alias requires a
  trailing space/end, so `tsp.salt` is not split.
- **Stray leading article** (`"1/2 a lemon"` → name `"a lemon"`). Cosmetic.
- **Empty `ingredient.name`** is a valid output for genuinely incomplete lines
  (`"2 cups"`, `"2 cloves"`, gibberish); callers should treat `""` as "no
  ingredient identified." (Self-naming units like `bay leaf` are exempt — see §2.)

Fixed since the first review (no longer limitations): leading-dot decimals
(`".5 cup"`), multiple parentheticals leaking into the name, `bay leaf` → empty
name, and `isApproximate` being set with no number.

## 8. Versioning

Published as a new major (`@jclind/ingredient-parser` v2, or a new name). The
flat v1 shape remains available via `legacy/parseIngredientString` for one major
to ease migration, then is deprecated.

Released so far:

- **2.0.0** — the from-scratch rewrite.
- **2.1.0** — the pricing gates in §5. Decline rather than guess when a measure
  can't be priced honestly.
- **2.2.0** — the coverage the gates exposed: spice/herb densities, container
  sizes (§2 `containerSize`), and the free basis (§5.2, §2 `purpose`). All
  additive; `calculatePrice`'s context argument is optional.
