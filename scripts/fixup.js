// Tag each build output with its module type so Node resolves them correctly
// under a single top-level "type": "commonjs" package.
const fs = require('fs')
fs.writeFileSync('dist/cjs/package.json', JSON.stringify({ type: 'commonjs' }, null, 2) + '\n')
fs.writeFileSync('dist/esm/package.json', JSON.stringify({ type: 'module' }, null, 2) + '\n')
console.log('fixup: wrote dist/cjs/package.json (commonjs) and dist/esm/package.json (module)')
