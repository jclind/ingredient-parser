// Top-level convenience: parse a string and enrich it in one call.
//
// The v2 equivalent of v1's `ingredientParser(str, apiKey, options)` — but with
// no API key (proxy-only) and no `'error' in result` union. `parsed` is always
// present (offline, never fails for a string); `data` is `null` when the
// ingredient can't be looked up or isn't found. Network/proxy failures throw
// `EnrichError`, so wrap in try/catch if you need to handle those.

import { parse } from './core/parse.js'
import { createEnricher, type EnricherOptions } from './enrich/enrich.js'
import type { ParsedIngredientV2 } from './core/types.js'
import type { IngredientData } from './enrich/types.js'

export interface IngredientResult {
  parsed: ParsedIngredientV2
  data: IngredientData | null
}

export async function ingredientParser(
  input: string,
  options?: EnricherOptions
): Promise<IngredientResult> {
  const parsed = parse(input)
  const enrich = createEnricher(options)
  const data = await enrich(parsed)
  return { parsed, data }
}
