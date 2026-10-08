'use strict';
/* Text: drawText, textW, wrapText.
   Primary face: Press Start 2P (fonts/, SIL Open Font License) at 8 detail px = 4 game px per character,
   rendered on the 16-bit grid and thresholded to hard pixels, cached per string + colour + size.
   Until it has loaded (or if it can't), the original 3x5 bitmap capitals below are used. Both faces
   advance 4 game px per character, so layout (textW) is identical either way. */
const FONT = { family: 'MCV-PS2P', url: 'fonts/PressStart2P-Regular.ttf', px: 8, ready: false };
function loadFont() {
  if (typeof FontFace === 'undefined') return Promise.resolve(false);
  const face = new FontFace(FONT.family, `url(${FONT.url})`);
  return face
    .load()
    .then(f => {
      document.fonts.add(f);
      FONT.ready = true;
      return true;
    })
    .catch(() => false);
}

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
function textW(s, scale = 1) {
  s = String(s);
  return s.length ? (s.length * 4 - 1) * scale : 0;
}
// One string as a hard-edged image on the detail grid. Alpha is thresholded so no soft edges survive scaling.
const runCache = new Map();
function textRun(s, color, scale) {
  const key = scale + '|' + color + '|' + s;
  let run = runCache.get(key);
  if (run) return run;
  if (runCache.size > 2000) runCache.clear(); // money/timers make new strings every second
  const px = FONT.px * scale;
  const c = document.createElement('canvas');
  c.width = Math.max(1, s.length * px);
  c.height = px + 2 * scale; // room for descenders and accents
  const g = c.getContext('2d');
  g.font = px + 'px "' + FONT.family + '"';
  g.textBaseline = 'top';
  g.fillStyle = color;
  g.fillText(s, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height);
  for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] > 110 ? 255 : 0;
  g.putImageData(d, 0, 0);
  runCache.set(key, c);
  return c;
}
function drawText(ctx, s, x, y, color = PAL.white, opt = {}) {
  s = String(s);
  if (!FONT.ready) s = s.toUpperCase(); // the fallback face only has capitals
  const sc = opt.scale || 1;
  const w = textW(s, sc);
  if (opt.align === 'center') x -= Math.floor(w / 2);
  else if (opt.align === 'right') x -= w;
  x = Math.round(x);
  y = Math.round(y);
  if (FONT.ready) {
    // 8px caps = 4 game px; nudge down half a game px so they sit centred where the 5px caps were.
    // Drop shadow = one font pixel at this scale (a whole game pixel detaches from the thinner strokes).
    const run = (col, dx) => {
      const c = textRun(s, col, sc);
      ctx.drawImage(c, x + dx, y + dx + 0.5 * sc, c.width * HI_PX, c.height * HI_PX);
    };
    if (opt.shadow) run(opt.shadow, sc * HI_PX);
    run(color, 0);
    return w;
  }
  if (opt.shadow) drawText(ctx, s, x + sc, y + sc, opt.shadow, { scale: sc });
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch !== ' ') ctx.drawImage(glyphCanvas(ch, color), x + i * 4 * sc, y, 3 * sc, 5 * sc);
  }
  return w;
}
function wrapText(s, max) {
  const words = String(s).split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= max) cur += ' ' + w;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}
