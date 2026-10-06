// Verifies js/modules.js lists every module exactly once and every listed file exists. Used by CI.
const fs = require('fs'),
  path = require('path');
const root = path.join(__dirname, '..', 'js');
const list = require(path.join(root, 'modules.js'));
const walk = d =>
  fs
    .readdirSync(d, { withFileTypes: true })
    .flatMap(e => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const all = walk(root)
  .map(f => path.relative(root, f).split(path.sep).join('/'))
  .filter(f => f.endsWith('.js') && f !== 'modules.js');
const missing = all.filter(f => !list.includes(f)),
  absent = list.filter(f => !fs.existsSync(path.join(root, f)));
const dupes = list.filter((f, i) => list.indexOf(f) !== i);
if (missing.length || absent.length || dupes.length) {
  console.error({ missing, absent, dupes });
  process.exit(1);
}
console.log('modules ok:', list.length);
