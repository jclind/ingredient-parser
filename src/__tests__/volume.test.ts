import { volumeToMl, lookupDensity, makeDensityToGrams } from '../enrich/volume'
import type { UnitLike } from '../enrich/price'

const cup: UnitLike = { name: 'cup', type: 'volume' }
const tbsp: UnitLike = { name: 'tablespoon', type: 'volume' }
const teaspoon: UnitLike = { name: 'teaspoon', type: 'volume' }
const gram: UnitLike = { name: 'gram', type: 'mass' }
const can: UnitLike = { name: 'can', type: 'count' }

describe('volumeToMl', () => {
  it('converts known volume units', () => {
    expect(volumeToMl(1, 'cup')).toBeCloseTo(236.588)
    expect(volumeToMl(2, 'tablespoon')).toBeCloseTo(29.5736)
    expect(volumeToMl(1, 'liter')).toBe(1000)
  })
  it('null for unknown unit', () => {
    expect(volumeToMl(1, 'sprig')).toBeNull()
  })
})

describe('lookupDensity', () => {
  it('matches a term anywhere in the name', () => {
    expect(lookupDensity('all-purpose flour')).toBe(0.53)
    expect(lookupDensity('extra-virgin olive oil')).toBe(0.92)
    expect(lookupDensity('whole milk')).toBe(1.03)
  })

  it('matches whole words, not raw substrings', () => {
    // "boiling water".includes("oil") is true, so this used to return oil's
    // 0.92 and price boiling water like cooking oil.
    expect(lookupDensity('boiling water')).toBe(1.0)
    // and the mirror image: "watermelon" must not resolve to water.
    expect(lookupDensity('watermelon')).toBeNull()
  })

  it('prefers the longest matching term, whatever the table order', () => {
    expect(lookupDensity('brown sugar')).toBe(0.72)
    expect(lookupDensity('granulated sugar')).toBe(0.85)
    expect(lookupDensity('peanut butter')).toBe(1.08) // over 'butter' and 'peanut'
    expect(lookupDensity('cream cheese')).toBe(0.98) // over 'cream'
    // 'buttermilk' was unreachable under substring matching: 'butter' hit first
    // and claimed it at 0.911.
    expect(lookupDensity('buttermilk')).toBe(1.03)
  })

  it('handles plurals', () => {
    expect(lookupDensity('rolled oats')).toBe(0.38)
    expect(lookupDensity('chopped carrots')).toBe(0.54)
    expect(lookupDensity('chocolate chips')).toBe(0.72)
  })

  it('resolves the ingredients the original 13-entry table missed', () => {
    // The exact list from the prod smoke that filed the bug. Every one of these
    // fell through to the unit estimate and got priced ~236x low.
    const missed = [
      'salsa',
      'yogurt',
      'shredded cheese',
      'black beans',
      'diced tomatoes',
      'onion',
      'corn',
      'rolled oats',
      'breadcrumbs',
      'chopped walnuts',
      'chocolate chips',
      'soy sauce',
    ]
    for (const name of missed) {
      expect(lookupDensity(name)).not.toBeNull()
    }
  })

  it('null for unknown ingredient', () => {
    expect(lookupDensity('parsley')).toBeNull()
  })

  it('prices milled spices, the category the table used to end before', () => {
    // Straight from the 1.0.1 prod smoke: the table stopped at `salt`, so every
    // `1 tsp <spice>` in every savory recipe read "needs price".
    const spices = [
      'black pepper',
      'ground black pepper',
      'peppercorns',
      'chili powder',
      'ground cumin',
      'smoked paprika',
      'cinnamon',
      'garlic powder',
      'onion powder',
      'ground turmeric',
      'cayenne pepper',
      'red pepper flakes',
      'nutmeg',
      'allspice',
      'ground cloves',
      'cardamom',
      'ground ginger',
      'mustard powder',
      'curry powder',
    ]
    for (const name of spices) {
      expect(lookupDensity(name)).toBe(0.5)
    }
  })

  it('catches spice blends off the bare `seasoning` and `spice` words', () => {
    expect(lookupDensity('taco seasoning')).toBe(0.5)
    expect(lookupDensity('cajun seasoning')).toBe(0.5)
    expect(lookupDensity('pumpkin pie spice')).toBe(0.5)
    expect(lookupDensity('five-spice powder')).toBe(0.5)
  })

  it('dried leaf herbs are a third the weight of powder', () => {
    for (const name of ['oregano', 'thyme', 'marjoram', 'tarragon', 'bay leaf']) {
      expect(lookupDensity(name)).toBe(0.17)
    }
    // The plural spelling isn't reachable from `bay leaf` + the matcher's `s?`.
    expect(lookupDensity('bay leaves')).toBe(0.17)
    // A leafy blend has to beat the bare `seasoning` term, or it prices 3x high.
    expect(lookupDensity('italian seasoning')).toBe(0.17)
    expect(lookupDensity('poultry seasoning')).toBe(0.17)
    expect(lookupDensity('herbes de provence')).toBe(0.17)
  })

  it('leaves herbs that are as often fresh as dried unpriced', () => {
    // `parse()` strips both "dried" and "fresh", so these arrive here as the
    // bare noun and nothing says which one it is. Dried is ~0.17, fresh chopped
    // ~0.25 — guessing is wrong by half in one direction, so we decline.
    for (const name of ['basil', 'parsley', 'cilantro', 'dill', 'mint', 'sage', 'rosemary']) {
      expect(lookupDensity(name)).toBeNull()
    }
  })

  it('the bare spice terms do not swallow their homographs', () => {
    // `pepper` at 0.5 must not claim a sweet pepper, and `ginger` must not claim
    // a soda. Each is spelled out in its own group, and longest term wins.
    expect(lookupDensity('red bell pepper')).toBe(0.63)
    expect(lookupDensity('chopped green peppers')).toBe(0.63)
    expect(lookupDensity('ginger ale')).toBe(1.0)
    // ...but crushed red pepper is a spice again, being longer still.
    expect(lookupDensity('crushed red pepper')).toBe(0.5)
    // Word boundaries keep the short terms out of unrelated nouns.
    expect(lookupDensity('pepperoni')).toBeNull()
    expect(lookupDensity('gingerbread')).toBeNull()
    // 'allspice' must not be read as the `spice` term (it's the same 0.5 either
    // way, but the boundary is the thing under test).
    expect(lookupDensity('allspice')).toBe(0.5)
  })

  it('a teaspoon of spice weighs what a teaspoon of spice weighs', () => {
    // Sanity-check the density against the real world rather than itself:
    // a level tsp of ground cinnamon is ~2.5 g, a tsp of dried oregano ~1 g.
    const tsp = (name: string) => makeDensityToGrams(name)(1, teaspoon)?.grams
    expect(tsp('cinnamon')).toBeCloseTo(2.46, 2)
    expect(tsp('oregano')).toBeCloseTo(0.84, 2)
  })
})

describe('makeDensityToGrams', () => {
  it('mass units convert exactly regardless of ingredient', () => {
    expect(makeDensityToGrams('anything')(100, gram)).toEqual({ grams: 100, exact: true })
  })
  it('volume + known density → estimated grams (exact: false)', () => {
    const r = makeDensityToGrams('all-purpose flour')(1, cup)
    expect(r?.exact).toBe(false)
    expect(r?.grams).toBeCloseTo(236.588 * 0.53) // ~125.4 g, the canonical cup-of-flour
  })
  it('volume tablespoon of oil', () => {
    const r = makeDensityToGrams('olive oil')(1, tbsp)
    expect(r?.grams).toBeCloseTo(14.7868 * 0.92)
  })
  it('volume + unknown density → null', () => {
    expect(makeDensityToGrams('parsley')(1, cup)).toBeNull()
  })
  it('count units → null', () => {
    expect(makeDensityToGrams('beans')(1, can)).toBeNull()
  })
})
