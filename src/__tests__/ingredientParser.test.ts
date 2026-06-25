import { ingredientParser } from '../ingredientParser'
import type { TransportResponse } from '../enrich/enrich'

const res = (status: number, body: unknown): TransportResponse => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
})

// neutral wire shape returned by the server's /v2 route
const NEUTRAL_FLOUR = {
  name: 'flour',
  category: 'Baking',
  imageFilename: 'flour.png',
  possibleUnits: [],
  nutrition: null,
  estimatedPrices: { perGramCents: 0.1, perUnitCents: 50 },
}

describe('ingredientParser (parse + enrich)', () => {
  it('returns both parsed and enriched data', async () => {
    const r = await ingredientParser('2 cups all-purpose flour, sifted', {
      // server has only the base name; client falls back from "all-purpose flour"
      transport: async () => res(200, { data: NEUTRAL_FLOUR }),
    })
    expect(r.parsed.ingredient.name).toBe('all-purpose flour')
    expect(r.parsed.ingredient.preparation).toContain('sifted')
    expect(r.data?.name).toBe('flour')
    // cups of flour → density-estimated grams
    expect(r.data?.price).toMatchObject({ basis: 'gram', confidence: 'low' })
  })

  it('parsed is present even when the ingredient is not found', async () => {
    const r = await ingredientParser('1 cup unicorn dust', {
      transport: async () => res(200, { data: null }),
    })
    expect(r.parsed.quantity.value).toBe(1)
    expect(r.data).toBeNull()
  })

  it('propagates EnrichError on proxy failure', async () => {
    await expect(
      ingredientParser('1 cup flour', { transport: async () => res(500, {}) })
    ).rejects.toThrow(/proxy request failed/)
  })
})
