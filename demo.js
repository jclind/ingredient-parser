/* eslint-disable no-console */
// Smoke test / live demo for @jclind/ingredient-parser-v2.
//
//   npm run demo            → parse + enrich using a built-in fake proxy (offline)
//   npm run demo -- --live  → enrich against the real Railway proxy (needs network)
//
// (Run `npm run build` first, or just use `npm run demo` which builds for you.)

const { parse, ingredientParser } = require('./dist/cjs/index.js')

const LIVE = process.argv.includes('--live')

// ---- a tiny fake proxy so the demo runs with zero network ------------------
// Entries are in the v2 NEUTRAL wire shape (what /v2/ingredient/:name returns).
const n = (name, category, imageFilename, perGramCents, perUnitCents) => ({
  name, category, imageFilename, possibleUnits: [], nutrition: null,
  estimatedPrices: { perGramCents, perUnitCents },
})
const FAKE_DB = {
  flour: n('flour', 'Baking', 'flour.png', 0.1, 50),
  'chicken breast': n('chicken breast', 'Meat', 'chicken-breast.png', 0.9, 300),
  'olive oil': n('olive oil', 'Oil, Vinegar, Salad Dressing', 'olive-oil.png', 1.2, 80),
  butter: n('butter', 'Milk, Eggs, Other Dairy', 'butter-sliced.jpg', 0.8, 120),
  eggs: n('eggs', 'Milk, Eggs, Other Dairy', 'egg.png', 0.3, 25),
  salt: n('salt', 'Spices and Seasonings', 'salt.jpg', 0.02, 3),
  'lemon juice': n('lemon juice', 'Produce', 'lemon-juice.jpg', 0.15, 40),
}
// Fuzzy-ish lookup (the real proxy does a search): match a DB key that is
// contained in the queried name, longest key first.
const fakeTransport = async url => {
  const query = decodeURIComponent(url.split('/ingredient/')[1] || '')
  const key = Object.keys(FAKE_DB)
    .sort((a, b) => b.length - a.length)
    .find(k => query.includes(k))
  const data = key ? FAKE_DB[key] : null
  // Mirror the real server: always HTTP 200, `data: null` on a miss (never 404).
  return { ok: true, status: 200, json: async () => ({ data }) }
}

const enrichOpts = LIVE ? {} : { transport: fakeTransport }

const SAMPLES = [
  '1 1/2 cups all-purpose flour, sifted',
  '1.5 lbs boneless chicken breast, cubed',
  '2 tbsp extra-virgin olive oil',
  '3 large eggs',
  'a pinch of salt',
  '200 g butter, softened',
  'about 2 to 3 tablespoons fresh lemon juice',
]

const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n)

async function main() {
  console.log(`\n=== ingredient-parser-v2 demo (${LIVE ? 'LIVE proxy' : 'offline fake proxy'}) ===\n`)

  console.log('── 1. PARSE (offline, no network) ──\n')
  for (const s of SAMPLES) {
    const r = parse(s)
    const q = r.quantity.isRange ? `${r.quantity.min}–${r.quantity.max}` : r.quantity.value
    console.log(pad(`"${s}"`, 44))
    console.log(
      `   qty=${pad(String(q), 6)} unit=${pad(r.unit ? r.unit.name : '∅', 12)} name="${r.ingredient.name}"`
    )
    if (r.ingredient.descriptors.length) console.log(`   descriptors: [${r.ingredient.descriptors}]`)
    if (r.ingredient.preparation.length) console.log(`   preparation: [${r.ingredient.preparation}]`)
    if (r.comment) console.log(`   comment: "${r.comment}"`)
    console.log()
  }

  console.log('── 2. PARSE + ENRICH + PRICE (with provenance) ──\n')
  for (const s of SAMPLES) {
    try {
      const { parsed, data } = await ingredientParser(s, enrichOpts)
      if (!data) {
        console.log(pad(`"${s}"`, 44), '→ no match')
        continue
      }
      const p = data.price
      const price = p ? `${p.cents.toFixed(2)}¢ (${p.basis}, ${p.confidence}${p.grams ? `, ${p.grams.toFixed(0)}g` : ''})` : 'n/a'
      console.log(pad(`"${s}"`, 44))
      console.log(`   → ${pad(data.name, 18)} aisle=${data.category || '∅'}`)
      console.log(`   → price: ${price}`)
      console.log()
    } catch (err) {
      console.log(pad(`"${s}"`, 44), `→ ERROR: ${err.message}`)
    }
  }
}

main()
