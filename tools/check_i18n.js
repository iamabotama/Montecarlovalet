#!/usr/bin/env node
/* Language table checks (run in CI and before translating).
   Errors (exit 1):
     - code uses a key that English (i18n/en.js) does not have
     - a language has a key English does not have, or its {placeholders} / list shape differ
     - player-facing text written straight into code instead of a language table
       (mark a deliberate internal id with a trailing  // i18n-ignore  comment)
   Report only: English keys nothing uses, and per-language completeness (missing keys fall back to English). */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..', 'js');
const I18N_DIR = path.join(ROOT, 'i18n');
// Files whose literals are not player-facing language text.
const SKIP_LINT = new Set(['ui/debug.js', 'screens/debug_menu.js', 'data/vehicles.js', 'modules.js']);
const IDS = new Set(['ABCDEFGHIJ']);
const isId = s => IDS.has(s) || /^MCV-/.test(s); // font family names

const walk = d =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap(e => {
    const p = path.join(d, e.name);
    return e.isDirectory() ? walk(p) : e.name.endsWith('.js') ? [p] : [];
  });

// 1. load the language tables
const ctx = { console, navigator: undefined, document: undefined };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(I18N_DIR, 'i18n.js'), 'utf8') + '\nthis.LANGS = LANGS;', ctx);
for (const f of fs.readdirSync(I18N_DIR).filter(f => f !== 'i18n.js' && f.endsWith('.js')))
  vm.runInContext(fs.readFileSync(path.join(I18N_DIR, f), 'utf8'), ctx, { filename: f });
const LANGS = ctx.LANGS;
const EN = LANGS.en && LANGS.en.table;
if (!EN) throw new Error('i18n/en.js missing');

const errors = [];
const holes = s =>
  [...String(s).matchAll(/\{(\w+)\}/g)]
    .map(m => m[1])
    .sort()
    .join(',');

// 2. scan code: keys used, dynamic key prefixes, raw text
const used = new Set();
const prefixes = new Set();
const STR = /(['"`])((?:(?!\1)[^\\\n]|\\.)*)\1/g;
const KEY = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_]+)+$/;
for (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  if (rel.startsWith('i18n/')) continue;
  fs.readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, c => c.replace(/[^\n]/g, ' ')) // blank out block comments, keep line numbers
    .split('\n')
    .forEach((line, i) => {
      const code = line.trim();
      if (code.startsWith('//') || code.startsWith('*') || code.startsWith('/*')) return;
      // 'goal.' + id  -> every goal.* key may be used
      for (const m of line.matchAll(/(['"])([a-z][A-Za-z0-9]*(?:\.[A-Za-z0-9_]*)*)\1\s*\+/g))
        if (m[2].includes('.')) prefixes.add(m[2]);
      for (const m of line.matchAll(STR)) {
        const s = m[2];
        if (KEY.test(s)) used.add(s);
        if (SKIP_LINT.has(rel) || line.includes('i18n-ignore') || isId(s) || /console\./.test(line)) continue;
        const looksLikeText = /[A-Z]{3,}/.test(s.replace(/\$\{[^}]*\}/g, '')) || /^[A-Z][a-z]+ [A-Za-z]/.test(s);
        if (looksLikeText) errors.push(`raw text in code: ${rel}:${i + 1}: '${s}'`);
      }
    });
}
// a local variable named t would hide the translate function t()
let acorn = null;
try {
  acorn = require('acorn');
} catch (e) {
  console.log('  (acorn not installed: skipping the hidden-t() check; npm i --no-save acorn)');
}
if (acorn) {
  const { findShadowedT } = require('./shadow_check.js');
  for (const file of walk(ROOT)) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    if (rel.startsWith('i18n/')) continue;
    for (const at of findShadowedT(acorn, fs.readFileSync(file, 'utf8'), rel))
      errors.push(`t() is hidden by a local variable named t: ${at} (rename the local)`);
  }
}
const NAMESPACES = new Set(Object.keys(EN).map(k => k.split('.')[0]));
for (const k of used)
  if (NAMESPACES.has(k.split('.')[0]) && !(k in EN) && !prefixes.has(k)) errors.push(`code uses unknown key: ${k}`);

// 3. other languages vs English
const report = [];
for (const L of Object.values(LANGS)) {
  if (L.code === 'en') continue;
  let missing = 0;
  for (const k of Object.keys(EN)) {
    if (!(k in L.table)) {
      missing++;
      continue;
    }
    const a = EN[k],
      b = L.table[k];
    if (Array.isArray(a) !== Array.isArray(b))
      errors.push(`${L.code}: ${k} should be ${Array.isArray(a) ? 'a list' : 'text'}`);
    else if (!Array.isArray(a) && holes(a) !== holes(b).replace('h24', 'h') && holes(a) !== holes(b))
      errors.push(`${L.code}: ${k} placeholders {${holes(b)}} should be {${holes(a)}}`);
  }
  for (const k of Object.keys(L.table)) if (!(k in EN)) errors.push(`${L.code}: unknown key ${k}`);
  // CJK faces are subset fonts: every character the table uses must be in fonts/<file>.chars.txt
  if (L.face !== 'latin') {
    const list = path.join(ROOT, '..', 'fonts', `fusion-pixel-${L.face}.chars.txt`);
    const have = fs.existsSync(list) ? new Set(fs.readFileSync(list, 'utf8')) : new Set();
    const text = [L.name, ...Object.values(L.table).flat()].join('');
    const lack = [...new Set(text)].filter(c => c.trim() && !have.has(c));
    if (lack.length)
      errors.push(`${L.code}: ${lack.length} character(s) not in its font (${lack.slice(0, 12).join('')}...): run python3 tools/build_fonts.py`);
  }
  const n = Object.keys(EN).length;
  report.push(`${L.code} (${L.name}): ${n - missing}/${n} keys translated`);
}

// 4. unused English keys (a key counts as used if code names it, or builds it from a literal prefix)
const isUsed = k => used.has(k) || [...prefixes].some(p => k.startsWith(p));
const unused = Object.keys(EN).filter(k => !isUsed(k));

console.log(`i18n: ${Object.keys(EN).length} English keys, ${Object.keys(LANGS).length} language(s)`);
report.forEach(r => console.log('  ' + r));
if (unused.length) console.log(`  unused English keys (${unused.length}): ${unused.join(', ')}`);
if (errors.length) {
  errors.forEach(e => console.error('ERROR ' + e));
  process.exit(1);
}
console.log('i18n ok');
