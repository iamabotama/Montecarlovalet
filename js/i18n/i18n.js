'use strict';
/* Languages. Every word the player reads lives in a language table (i18n/en.js is the master;
   other languages copy its keys). Nothing is translated at run time - tables are plain data.

     t(key, values)   the text now, in the current language: t('toast.crewFull', { n: 3 })
     tl(key, values)  a lazy reference for data files, which load before a language is chosen.
                      It turns into current-language text wherever it is drawn, joined or String()-ed.
     tlist(key)       an array value (bubble lines, manager quips) in the current language

   Placeholders are {name}; values may themselves be tl() references. A key missing from the current
   language falls back to English, then to the key itself (so a gap is visible, never a crash).
   tools/check_i18n.js (run in CI) lists missing/unused keys and raw text left in the code. */
const LANGS = {};
const I18N = { code: 'en' };
// opts.face: the pixel font this language needs (art/font.js FACES), default 'latin'.
function defineLanguage(code, name, table, opts = {}) {
  LANGS[code] = { code, name, table, face: opts.face || 'latin' };
}
function lookup(key) {
  const cur = LANGS[I18N.code];
  if (cur && key in cur.table) return cur.table[key];
  const en = LANGS.en;
  return en && key in en.table ? en.table[key] : undefined;
}
const fillText = (s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m)) : s);
function t(key, values) {
  const s = lookup(key);
  return s === undefined ? key : fillText(String(s), values);
}
const hasText = key => lookup(key) !== undefined;
function tlist(key) {
  const a = lookup(key);
  return Array.isArray(a) ? a : [t(key)];
}
class TextRef {
  constructor(key, values) {
    this.key = key;
    this.values = values;
  }
  toString() {
    return t(this.key, this.values);
  }
  get length() {
    return this.toString().length;
  }
}
const tl = (key, values) => new TextRef(key, values);
// Saved choice, else the first device language we have a table for, else English.
function chooseLanguage(saved) {
  if (saved && LANGS[saved]) return saved;
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  for (const l of nav.languages || (nav.language ? [nav.language] : [])) {
    const c = String(l).slice(0, 2).toLowerCase();
    if (LANGS[c]) return c;
  }
  return 'en';
}
function setLanguage(code) {
  I18N.code = LANGS[code] ? code : 'en';
  if (typeof document !== 'undefined') document.documentElement.lang = I18N.code;
}
const languageList = () => Object.values(LANGS).map(l => ({ code: l.code, name: l.name }));
