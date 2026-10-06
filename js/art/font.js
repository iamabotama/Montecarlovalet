'use strict';
/* 3x5 bitmap font: drawText, textW, wrapText. */

/* ------------------------------ 3x5 FONT ------------------------------ */
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
  return s.length ? (s.length * 4 - 1) * scale : 0;
}
function drawText(ctx, s, x, y, color = PAL.white, opt = {}) {
  s = String(s).toUpperCase();
  const sc = opt.scale || 1;
  const w = textW(s, sc);
  if (opt.align === 'center') x -= Math.floor(w / 2);
  else if (opt.align === 'right') x -= w;
  x = Math.round(x);
  y = Math.round(y);
  if (opt.shadow) drawText(ctx, s, x + sc, y + sc, opt.shadow, { scale: sc });
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch !== ' ') ctx.drawImage(glyphCanvas(ch, color), x + i * 4 * sc, y, 3 * sc, 5 * sc);
  }
  return w;
}
function wrapText(s, max) {
  const words = s.split(' ');
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
