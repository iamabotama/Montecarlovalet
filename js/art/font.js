'use strict';
/* Text: drawText, textW, wrapText.
   Faces are pixel fonts rendered on the 16-bit grid and thresholded to hard pixels, cached per string,
   colour, size and face. Each language names its face in i18n/<code>.js (default 'latin'):
     latin  Press Start 2P (SIL OFL) at 8 detail px: a fixed 4 game px per character. Latin + Cyrillic.
     zh/ja/ko  Fusion Pixel 10px (SIL OFL), subset to the characters the game uses (tools/build_fonts.py).
   Until a face has loaded: latin falls back to the 3x5 bitmap capitals below (same 4 px advance, so
   layout is identical); CJK faces fall back to the system font. */
const FACES = {
  latin: { family: 'MCV-PS2P', url: 'fonts/PressStart2P-Regular.ttf', px: 8, advance: 4, dy: 0.5 },
  zh: { family: 'MCV-FP-zh', url: 'fonts/fusion-pixel-zh.ttf', px: 10, dy: 0, fallback: 'sans-serif' },
  ja: { family: 'MCV-FP-ja', url: 'fonts/fusion-pixel-ja.ttf', px: 10, dy: 0, fallback: 'sans-serif' },
  ko: { family: 'MCV-FP-ko', url: 'fonts/fusion-pixel-ko.ttf', px: 10, dy: 0, fallback: 'sans-serif' },
};
for (const f of Object.values(FACES)) f.ready = false;
const FONT = FACES.latin; // the default face (tests and boot read FONT.ready)
const faceFor = code => FACES[(LANGS[code] && LANGS[code].face) || 'latin'] || FACES.latin;
// Load a face once; resolves true when usable. Safe to call repeatedly.
function loadFace(face) {
  if (face.loading) return face.loading;
  if (typeof FontFace === 'undefined') return Promise.resolve(false);
  face.loading = new FontFace(face.family, `url(${face.url})`)
    .load()
    .then(f => {
      document.fonts.add(f);
      face.ready = true;
      return true;
    })
    .catch(() => false);
  return face.loading;
}
const loadFont = () => loadFace(FONT);
const ensureLanguageFont = code => loadFace(faceFor(code));
/* ------------------------------ 3x5 FALLBACK FONT ------------------------------ */
const GLYPHS = {
  A: 'xxx x.x xxx x.x x.x',
  B: 'xx. x.x xx. x.x xx.',
  C: 'xxx x.. x.. x.. xxx',
  D: 'xx. x.x x.x x.x xx.',
  E: 'xxx x.. xx. x.. xxx',
  F: 'xxx x.. xx. x.. x..',
  G: 'xxx x.. x.x x.x xxx',
  H: 'x.x x.x xxx x.x x.x',
  I: 'xxx .x. .x. .x. xxx',
  J: '..x ..x ..x x.x xxx',
  K: 'x.x x.x xx. x.x x.x',
  L: 'x.. x.. x.. x.. xxx',
  M: 'x.x xxx xxx x.x x.x',
  N: 'xx. x.x x.x x.x x.x',
  O: 'xxx x.x x.x x.x xxx',
  P: 'xxx x.x xxx x.. x..',
  Q: 'xxx x.x x.x xxx ..x',
  R: 'xx. x.x xx. x.x x.x',
  S: 'xxx x.. xxx ..x xxx',
  T: 'xxx .x. .x. .x. .x.',
  U: 'x.x x.x x.x x.x xxx',
  V: 'x.x x.x x.x x.x .x.',
  W: 'x.x x.x xxx xxx x.x',
  X: 'x.x x.x .x. x.x x.x',
  Y: 'x.x x.x .x. .x. .x.',
  Z: 'xxx ..x .x. x.. xxx',
  0: '.x. x.x x.x x.x .x.',
  1: '.x. xx. .x. .x. xxx',
  2: 'xx. ..x .x. x.. xxx',
  3: 'xx. ..x .x. ..x xx.',
  4: 'x.x x.x xxx ..x ..x',
  5: 'xxx x.. xx. ..x xx.',
  6: '.xx x.. xxx x.x xxx',
  7: 'xxx ..x .x. .x. .x.',
  8: 'xxx x.x xxx x.x xxx',
  9: 'xxx x.x xxx ..x xx.',
  '.': '... ... ... ... .x.',
  ',': '... ... ... .x. x..',
  '!': '.x. .x. .x. ... .x.',
  '?': 'xx. ..x .x. ... .x.',
  $: '.xx xx. .x. .xx xx.',
  '@': 'xxx x.x xxx x.. .xx',
  '#': 'x.x xxx x.x xxx x.x',
  '%': 'x.x ..x .x. x.. x.x',
  '&': '.x. x.x .x. x.x .xx',
  ':': '... .x. ... .x. ...',
  '-': '... ... xxx ... ...',
  '+': '... .x. xxx .x. ...',
  '>': 'x.. .x. ..x .x. x..',
  '<': '..x .x. x.. .x. ..x',
  '/': '..x ..x .x. x.. x..',
  "'": '.x. .x. ... ... ...',
  '"': 'x.x x.x ... ... ...',
  '(': '.x. x.. x.. x.. .x.',
  ')': '.x. ..x ..x ..x .x.',
  '*': '... x.x .x. x.x ...',
  '=': '... xxx ... xxx ...',
  _: '... ... ... ... xxx',
  '[': 'xx. x.. x.. x.. xx.',
  ']': '.xx ..x ..x ..x .xx',
  '^': '.x. x.x ... ... ...',
  '~': '... .x. xxx .x. ...',
  ' ': '... ... ... ... ...',
};
const glyphCache = new Map();
function glyphCanvas(ch, color) {
  const key = ch + color;
  let c = glyphCache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = 3;
  c.height = 5;
  const g = c.getContext('2d');
  g.fillStyle = color;
  const rows = (GLYPHS[ch] || GLYPHS['?']).split(' ');
  for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) if (rows[y][x] === 'x') g.fillRect(x, y, 1, 1);
  glyphCache.set(key, c);
  return c;
}
// Width in game px. Fixed-advance faces (and the bitmap fallback) are pure arithmetic; others are measured.
const widthCache = new Map();
let measureCtx = null;
function textW(s, scale = 1, lang) {
  s = String(s);
  if (!s.length) return 0;
  const face = faceFor(lang || I18N.code);
  if (face.advance) return (s.length * face.advance - 1) * scale;
  const fam = face.ready ? face.family : face.fallback;
  const key = fam + '|' + scale + '|' + s;
  let w = widthCache.get(key);
  if (w === undefined) {
    if (widthCache.size > 4000) widthCache.clear();
    measureCtx = measureCtx || document.createElement('canvas').getContext('2d');
    measureCtx.font = face.px * scale + 'px "' + fam + '"';
    w = Math.ceil(measureCtx.measureText(s).width) * HI_PX - HI_PX * scale; // drop the trailing gap
    widthCache.set(key, w);
  }
  return w;
}
// One string as a hard-edged image on the detail grid. Alpha is thresholded so no soft edges survive scaling.
const runCache = new Map();
function textRun(s, color, scale, face) {
  const fam = face.ready ? face.family : face.fallback;
  const key = fam + '|' + scale + '|' + color + '|' + s;
  let run = runCache.get(key);
  if (run) return run;
  if (runCache.size > 2000) runCache.clear(); // money/timers make new strings every second
  const px = face.px * scale;
  const c = document.createElement('canvas');
  c.width = Math.max(1, s.length * px);
  c.height = px + 2 * scale; // room for descenders and accents
  const g = c.getContext('2d');
  g.font = px + 'px "' + fam + '"';
  g.textBaseline = 'top';
  g.fillStyle = color;
  g.fillText(s, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height);
  for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] > 110 ? 255 : 0;
  g.putImageData(d, 0, 0);
  runCache.set(key, c);
  return c;
}
/* Text wider than its slot (opt.maxW) is still drawn, but recorded here so tests/layout_test.py can list
   translations that need shortening. */
const TEXT_OVERFLOW = new Map(); // string -> { w, maxW }
// opt: align 'center'|'right', scale, shadow colour, lang (draw in another language's face, e.g. its own
// name), maxW (the slot width in game px, for overflow reporting)
function drawText(ctx, s, x, y, color = PAL.white, opt = {}) {
  s = String(s);
  const face = faceFor(opt.lang || I18N.code);
  const bitmap = face.advance && !face.ready; // latin face not loaded yet: 3x5 capitals
  if (bitmap) s = s.toUpperCase();
  const sc = opt.scale || 1;
  const w = textW(s, sc, opt.lang);
  if (opt.maxW && w > opt.maxW && TEXT_OVERFLOW.size < 500) TEXT_OVERFLOW.set(s, { w, maxW: opt.maxW });
  if (opt.align === 'center') x -= Math.floor(w / 2);
  else if (opt.align === 'right') x -= w;
  x = Math.round(x);
  y = Math.round(y);
  if (!bitmap) {
    // Latin 8px caps = 4 game px, nudged down half a game px to sit where the 5px caps were.
    // Drop shadow = one font pixel at this scale (a whole game pixel detaches from the thinner strokes).
    const run = (col, dx) => {
      const c = textRun(s, col, sc, face);
      ctx.drawImage(c, x + dx, y + dx + face.dy * sc, c.width * HI_PX, c.height * HI_PX);
    };
    if (opt.shadow) run(opt.shadow, sc * HI_PX);
    run(color, 0);
    return w;
  }
  if (opt.shadow) drawText(ctx, s, x + sc, y + sc, opt.shadow, { scale: sc, lang: opt.lang });
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch !== ' ') ctx.drawImage(glyphCanvas(ch, color), x + i * 4 * sc, y, 3 * sc, 5 * sc);
  }
  return w;
}
/* Greedy word wrap to maxW game px. Chinese and Japanese have no spaces, so each ideograph/kana is its
   own breakable unit (closing punctuation stays attached to the character before it). Korean, like
   European languages, breaks at spaces. */
const WRAP_UNITS =
  /\s+|[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF][\u3001\u3002\uFF0C\uFF01\uFF1F\uFF09\uFF1A\u300D\u300F\u2026\u30FC]*|[^\s\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]+/g;
function wrapText(s, maxW, lang) {
  const lines = [];
  let cur = '',
    gap = false;
  for (const u of String(s).match(WRAP_UNITS) || []) {
    if (/^\s/.test(u)) {
      gap = !!cur;
      continue;
    }
    const next = cur + (gap ? ' ' : '') + u;
    if (!cur || textW(next, 1, lang) <= maxW) cur = next;
    else {
      lines.push(cur);
      cur = u;
    }
    gap = false;
  }
  if (cur) lines.push(cur);
  return lines;
}
