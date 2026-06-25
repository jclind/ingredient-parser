import {
  createEnricher,
  createProxyProvider,
  nameCandidates,
  EnrichError,
} from '../enrich/enrich'
import type { Transport, TransportResponse } from '../enrich/enrich'
import { buildImageUrl } from '../enrich/spoonacular'
import { parse } from '../core/parse'

const res = (status: number, body: unknown): TransportResponse => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
})

// neutral wire shape — what the server's /v2 route returns and the provider consumes
const neutral = (overrides: Record<string, unknown> = {}) => ({
  name: 'rice',
  category: 'Pasta and Rice',
  imageFilename: 'uncooked-white-rice.png',
  possibleUnits: ['g', 'oz', 'cup'],
  nutrition: null,
  estimatedPrices: { perGramCents: 0.2, perUnitCents: 75 },
  ...overrides,
})

describe('buildImageUrl', () => {
  it('resolves filename + size to a CDN URL', () => {
    expect(buildImageUrl('rice.png', '250x250')).toBe(
      'https://spoonacular.com/cdn/ingredients_250x250/rice.png'
    )
  })
  it('defaults size and null filename → null', () => {
    expect(buildImageUrl('rice.png')).toBe('https://spoonacular.com/cdn/ingredients_100x100/rice.png')
    expect(buildImageUrl(null)).toBeNull()
  })
  it('allowlists size against path traversal', () => {
    expect(buildImageUrl('a.png', '../../../etc' as never)).toBe(
      'https://spoonacular.com/cdn/ingredients_100x100/a.png'
    )
  })
  it('rejects a filename with path separators or ".."', () => {
    expect(buildImageUrl('../../../etc/passwd')).toBeNull()
    expect(buildImageUrl('a/b.png')).toBeNull()
    expect(buildImageUrl('..\\evil.png')).toBeNull()
  })
})

describe('nameCandidates', () => {
  it('drops leading words, most-specific first', () => {
    expect(nameCandidates('boneless chicken breast')).toEqual([
      'boneless chicken breast',
      'chicken breast',
      'breast',
    ])
  })
  it('single word → itself', () => {
    expect(nameCandidates('flour')).toEqual(['flour'])
  })
  it('caps at 4 candidates for long names', () => {
    expect(nameCandidates('a b c d e f g').length).toBe(4)
  })
  it('empty → no candidates', () => {
    expect(nameCandidates('   ')).toEqual([])
  })
})

describe('createProxyProvider', () => {
  const provider = (transport: Transport) => createProxyProvider({ transport })

  it('builds the GET url and maps the body', async () => {
    let calledUrl = ''
    const t: Transport = async url => {
      calledUrl = url
      return res(200, { data: neutral() })
    }
    const r = await provider(t).lookup('white rice')
    expect(calledUrl).toContain('/v2/ingredient/white%20rice')
    expect(r?.data.name).toBe('rice')
    expect(r?.data.image).toBe(
      'https://spoonacular.com/cdn/ingredients_100x100/uncooked-white-rice.png'
    )
    expect(r?.estimatedPrices).toEqual({ perGramCents: 0.2, perUnitCents: 75 })
  })

  it('returns null on 404', async () => {
    expect(await provider(async () => res(404, {})).lookup('xyz')).toBeNull()
  })

  it('returns null when body has no ingredient', async () => {
    expect(await provider(async () => res(200, { data: null })).lookup('x')).toBeNull()
  })

  it('throws EnrichError on non-ok status', async () => {
    await expect(provider(async () => res(500, {})).lookup('x')).rejects.toThrow(
      EnrichError
    )
  })

  it('throws EnrichError on transport failure', async () => {
    const t: Transport = async () => {
      throw new Error('ECONNREFUSED')
    }
    await expect(provider(t).lookup('x')).rejects.toThrow(/Network error/)
  })

  it('resolves the image URL at the requested size', async () => {
    const p = createProxyProvider({
      imageSize: '500x500',
      transport: async () => res(200, { data: neutral() }),
    })
    const r = await p.lookup('rice')
    expect(r?.data.image).toBe(
      'https://spoonacular.com/cdn/ingredients_500x500/uncooked-white-rice.png'
    )
  })

  it('drops nutrition unless includeNutrition is set (server always sends it)', async () => {
    const withNutrients = neutral({ nutrition: { nutrients: [{ name: 'Fat' }] } })
    const off = await createProxyProvider({
      transport: async () => res(200, { data: withNutrients }),
    }).lookup('rice')
    expect(off?.data.nutrition).toBeNull()

    const on = await createProxyProvider({
      includeNutrition: true,
      transport: async () => res(200, { data: withNutrients }),
    }).lookup('rice')
    expect(on?.data.nutrition).toEqual({ nutrients: [{ name: 'Fat' }] })
  })

  it('includeRaw attaches the neutral wire object as raw', async () => {
    const n = neutral()
    const r = await createProxyProvider({
      includeRaw: true,
      transport: async () => res(200, { data: n }),
    }).lookup('rice')
    expect(r?.data.raw).toEqual(n)

    const without = await createProxyProvider({
      transport: async () => res(200, { data: n }),
    }).lookup('rice')
    expect('raw' in (without?.data ?? {})).toBe(false)
  })
})

describe('createEnricher', () => {
  it('attaches a gram-accurate price for "200 g chicken"', async () => {
    const enrich = createEnricher({
      transport: async () => res(200, { data: neutral({ name: 'chicken' }) }),
    })
    const data = await enrich(parse('200 g chicken'))
    expect(data?.name).toBe('chicken')
    expect(data?.price).toMatchObject({ basis: 'gram', grams: 200, confidence: 'high' })
    expect(data?.price?.cents).toBeCloseTo(40) // 200 * 0.2
  })

  it('density-estimated gram price for a known volume ingredient (low confidence)', async () => {
    const enrich = createEnricher({
      transport: async () => res(200, { data: neutral() }),
    })
    // "rice" has a density entry → cups convert to grams, but estimated.
    const data = await enrich(parse('2 cups rice'))
    expect(data?.price).toMatchObject({ basis: 'gram', confidence: 'low' })
    expect(data?.price?.grams).toBeGreaterThan(0)
  })

  it('unit-estimate fallback when volume ingredient has no known density', async () => {
    const enrich = createEnricher({
      transport: async () => res(200, { data: neutral() }),
    })
    const data = await enrich(parse('2 cups parsley'))
    expect(data?.price).toMatchObject({ basis: 'unit-estimate', confidence: 'low' })
  })

  it('opts.toGrams overrides the default density converter', async () => {
    const enrich = createEnricher({
      transport: async () => res(200, { data: neutral() }),
      toGrams: () => null, // force unit-estimate everywhere
    })
    const data = await enrich(parse('2 cups rice'))
    expect(data?.price?.basis).toBe('unit-estimate')
  })

  it('returns null when the parsed name is empty (no lookup)', async () => {
    let called = false
    const enrich = createEnricher({
      transport: async () => {
        called = true
        return res(200, { data: neutral() })
      },
    })
    expect(await enrich(parse('2 cups'))).toBeNull()
    expect(called).toBe(false)
  })

  it('falls back to a base name when the full name misses (descriptor stripping)', async () => {
    // Cache only has the base noun, like the real proxy.
    const tried: string[] = []
    const transport = async (url: string) => {
      const name = decodeURIComponent(url.split('/ingredient/')[1])
      tried.push(name)
      return name === 'chicken breast'
        ? res(200, { data: { name: 'chicken breast', estimatedPrices: { perGramCents: 0.9 } } })
        : res(200, { data: null })
    }
    const enrich = createEnricher({ transport })
    const data = await enrich(parse('1.5 lbs boneless chicken breast'))
    expect(tried).toEqual(['boneless chicken breast', 'chicken breast'])
    expect(data?.name).toBe('chicken breast')
    expect(data?.price?.basis).toBe('gram') // pounds → grams, exact
  })

  it('prefers the most specific hit (no needless fallback)', async () => {
    const tried: string[] = []
    const transport = async (url: string) => {
      tried.push(decodeURIComponent(url.split('/ingredient/')[1]))
      return res(200, { data: { name: 'extra-virgin olive oil', estimatedPrices: { perUnitCents: 80 } } })
    }
    const enrich = createEnricher({ transport })
    await enrich(parse('2 tbsp extra-virgin olive oil'))
    expect(tried).toEqual(['extra-virgin olive oil']) // stopped at first hit
  })

  it('nameFallbacks: false looks up only the exact name', async () => {
    const tried: string[] = []
    const transport = async (url: string) => {
      tried.push(decodeURIComponent(url.split('/ingredient/')[1]))
      return res(200, { data: null })
    }
    const enrich = createEnricher({ transport, nameFallbacks: false })
    expect(await enrich(parse('1 cup boneless chicken breast'))).toBeNull()
    expect(tried).toEqual(['boneless chicken breast'])
  })

  it('uses an injected provider directly', async () => {
    const enrich = createEnricher({
      provider: {
        lookup: async () => ({
          data: { name: 'salt', category: null, image: null, possibleUnits: [], nutrition: null },
          estimatedPrices: { perUnitCents: 5 },
        }),
      },
    })
    const data = await enrich(parse('a pinch of salt'))
    expect(data?.name).toBe('salt')
    expect(data?.price?.cents).toBe(5)
  })
})
