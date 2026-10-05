'use strict';
/* ------------------------------ PALETTE ------------------------------ */
// PICO-8 16 + 16 extended (asphalt greys and secret-palette tones). Fixed; everything uses it.
const PAL = {
  ink: '#000000', navy: '#1d2b53', plum: '#7e2553', green: '#008751', brown: '#ab5236', dgrey: '#5f574f',
  lgrey: '#c2c3c7', white: '#fff1e8', red: '#ff004d', orange: '#ffa300', yellow: '#ffec27', lime: '#00e436',
  blue: '#29adff', lav: '#83769c', pink: '#ff77a8', peach: '#ffccaa',
  night: '#111d35', asph: '#2b2b36', asph2: '#363644', asph3: '#4a4a5a', wine: '#422136', teal: '#125359',
  rust: '#742f29', khaki: '#a28879', cream: '#f3ef7d', crimson: '#be1250', tang: '#ff6c24', leaf: '#a8e72e',
  emer: '#00b543', royal: '#065ab5', mauve: '#754665', olive: '#6b6a4a',
};

/* ------------------------------ UTILS ------------------------------ */
const rnd = (a, b) => a + Math.random() * (b - a);
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const TIERS = ['beater', 'standard', 'premium', 'whale', 'ultra', 'limo'];
const isWhale = t => t === 'whale' || t === 'ultra';
function weightedIndex(ws) { let s = 0; for (const w of ws) s += w; let r = Math.random() * s; for (let i = 0; i < ws.length; i++) { r -= ws[i]; if (r < 0) return i; } return ws.length - 1; }
function fmtMoney(n) { n = Math.round(n); return '$' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function fmtClock(h) { const hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60); const ap = hh >= 12 ? 'PM' : 'AM'; let d = hh % 12; if (d === 0) d = 12; return d + ':' + (mm < 10 ? '0' : '') + mm + ap; }
function pathLen(pts) { let l = 0; for (let i = 1; i < pts.length; i++) l += Math.abs(pts[i][0] - pts[i - 1][0]) + Math.abs(pts[i][1] - pts[i - 1][1]); return l; }
function dedupe(pts) { const o = []; for (const p of pts) { const q = o[o.length - 1]; if (!q || q[0] !== p[0] || q[1] !== p[1]) o.push([p[0], p[1]]); } return o; }

/* ------------------------------ 3x5 FONT ------------------------------ */
const GLYPHS = {
  A: 'xxx x.x xxx x.x x.x', B: 'xx. x.x xx. x.x xx.', C: 'xxx x.. x.. x.. xxx', D: 'xx. x.x x.x x.x xx.',
  E: 'xxx x.. xx. x.. xxx', F: 'xxx x.. xx. x.. x..', G: 'xxx x.. x.x x.x xxx', H: 'x.x x.x xxx x.x x.x',
  I: 'xxx .x. .x. .x. xxx', J: '..x ..x ..x x.x xxx', K: 'x.x x.x xx. x.x x.x', L: 'x.. x.. x.. x.. xxx',
  M: 'x.x xxx xxx x.x x.x', N: 'xx. x.x x.x x.x x.x', O: 'xxx x.x x.x x.x xxx', P: 'xxx x.x xxx x.. x..',
  Q: 'xxx x.x x.x xxx ..x', R: 'xx. x.x xx. x.x x.x', S: 'xxx x.. xxx ..x xxx', T: 'xxx .x. .x. .x. .x.',
  U: 'x.x x.x x.x x.x xxx', V: 'x.x x.x x.x x.x .x.', W: 'x.x x.x xxx xxx x.x', X: 'x.x x.x .x. x.x x.x',
  Y: 'x.x x.x .x. .x. .x.', Z: 'xxx ..x .x. x.. xxx',
  0: '.x. x.x x.x x.x .x.', 1: '.x. xx. .x. .x. xxx', 2: 'xx. ..x .x. x.. xxx', 3: 'xx. ..x .x. ..x xx.',
  4: 'x.x x.x xxx ..x ..x', 5: 'xxx x.. xx. ..x xx.', 6: '.xx x.. xxx x.x xxx', 7: 'xxx ..x .x. .x. .x.',
  8: 'xxx x.x xxx x.x xxx', 9: 'xxx x.x xxx ..x xx.',
  '.': '... ... ... ... .x.', ',': '... ... ... .x. x..', '!': '.x. .x. .x. ... .x.', '?': 'xx. ..x .x. ... .x.',
  '$': '.xx xx. .x. .xx xx.', '@': 'xxx x.x xxx x.. .xx', '#': 'x.x xxx x.x xxx x.x', '%': 'x.x ..x .x. x.. x.x',
  '&': '.x. x.x .x. x.x .xx', ':': '... .x. ... .x. ...', '-': '... ... xxx ... ...', '+': '... .x. xxx .x. ...',
  '>': 'x.. .x. ..x .x. x..', '<': '..x .x. x.. .x. ..x', '/': '..x ..x .x. x.. x..', "'": '.x. .x. ... ... ...',
  '"': 'x.x x.x ... ... ...', '(': '.x. x.. x.. x.. .x.', ')': '.x. ..x ..x ..x .x.', '*': '... x.x .x. x.x ...',
  '=': '... xxx ... xxx ...', '_': '... ... ... ... xxx', '[': 'xx. x.. x.. x.. xx.', ']': '.xx ..x ..x ..x .xx',
  '^': '.x. x.x ... ... ...', '~': '... .x. xxx .x. ...', ' ': '... ... ... ... ...',
};
const glyphCache = new Map();
function glyphCanvas(ch, color) {
  const key = ch + color; let c = glyphCache.get(key); if (c) return c;
  c = document.createElement('canvas'); c.width = 3; c.height = 5; const g = c.getContext('2d'); g.fillStyle = color;
  const rows = (GLYPHS[ch] || GLYPHS['?']).split(' ');
  for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) if (rows[y][x] === 'x') g.fillRect(x, y, 1, 1);
  glyphCache.set(key, c); return c;
}
function textW(s, scale = 1) { return s.length ? (s.length * 4 - 1) * scale : 0; }
function drawText(ctx, s, x, y, color = PAL.white, opt = {}) {
  s = String(s).toUpperCase(); const sc = opt.scale || 1; const w = textW(s, sc);
  if (opt.align === 'center') x -= Math.floor(w / 2); else if (opt.align === 'right') x -= w;
  x = Math.round(x); y = Math.round(y);
  if (opt.shadow) drawText(ctx, s, x + sc, y + sc, opt.shadow, { scale: sc });
  for (let i = 0; i < s.length; i++) { const ch = s[i]; if (ch !== ' ') ctx.drawImage(glyphCanvas(ch, color), x + i * 4 * sc, y, 3 * sc, 5 * sc); }
  return w;
}
function wrapText(s, max) { const words = s.split(' '); const lines = []; let cur = ''; for (const w of words) { if (!cur) cur = w; else if ((cur + ' ' + w).length <= max) cur += ' ' + w; else { lines.push(cur); cur = w; } } if (cur) lines.push(cur); return lines; }

/* ------------------------------ SPRITES ------------------------------ */
// Cars face EAST (front = right). Legend: k tire, b body, d body-dark, l body-light, w glass,
// h headlight, t taillight, r rust, g chrome/grey, c stripe (white)
const SHAPES = {
  hatch: ['.kk.....kk...', 'llllllllllll.', 'tbwwbbrbbwbbh', 'dbwwbbbbbwbbd', 'tbwwbrbbbwbbh', 'dddddddddddd.', '.kk.....kk...'],
  civvy: ['.kk.....kk...', 'llllllllllll.', 'tbwbrbbbbwwbh', 'dbwbbbbrbwwbd', 'tbwbbbrbbwwbh', 'dddddddddddd.', '.kk.....kk...'],
  van:   ['.kk.....kk...', 'llllllllllll.', 'tbbbbrbbbbwwh', 'dbbbbbbbbbwwd', 'tbbrbbbbbbwwh', 'dddddddddddd.', '.kk.....kk...'],
  sedan: ['..kk......kk..', '.llllllllllll.', 'tbbwbbbbbwwbbh', 'dbbwbbbbbwwbbd', 'tbbwbbbbbwwbbh', '.dddddddddddd.', '..kk......kk..'],
  wagon: ['..kk......kk..', '.llllllllllll.', 'tbwbbbbbbbwwbh', 'dbwbbbbbbbwwbd', 'tbwbbbbbbbwwbh', '.dddddddddddd.', '..kk......kk..'],
  lux:   ['..kk.......kk..', '.lllllllllllll.', 'tbbbwbbbbbwwbbh', 'dbbbwbbbbbwwbbg', 'tbbbwbbbbbwwbbh', '.ddddddddddddd.', '..kk.......kk..'],
  sport: ['.kk........kk..', 'lllllllllllllll', 'tbbbbbwwwbbbbbh', 'cccccwwwwwccccc', 'tbbbbbwwwbbbbbh', 'ddddddddddddddd', '.kk........kk..'],
  wedge: ['.kk........kk..', 'lllllllllllllll', 'tbbbbwwwbbbbbbh', 'ccccwwwwcccccch', 'tbbbbwwwbbbbbbh', 'ddddddddddddddd', '.kk........kk..'],
  gt:    ['..kk........kk..', '.llllllllllllll.', 'tggwwbbbbbbbbbbh', 'dggwwbbbbbbbbbgg', 'tggwwbbbbbbbbbbh', '.dddddddddddddd.', '..kk........kk..'],
  limo:  ['..kk...............kk...', '.llllllllllllllllllllll.', 'tbbwwbwwbwwbwwbbbbwwbbbh', 'dbbwwbwwbwwbwwbbbbwwbbbd', 'tbbwwbwwbwwbwwbbbbwwbbbh', '.dddddddddddddddddddddd.', '..kk...............kk...'],
};
// Models: [name, shape, body, dark, light]
const MODELS = {
  beater:   [['RUSTBUCKET HATCH', 'hatch', PAL.khaki, PAL.dgrey, PAL.peach], ['HONDO CIVVY', 'civvy', PAL.lav, PAL.mauve, PAL.lgrey], ['SOCCER-MOM VAN', 'van', PAL.olive, PAL.dgrey, PAL.khaki]],
  standard: [['TOYODA CAMREE', 'sedan', PAL.lgrey, PAL.dgrey, PAL.white], ['FORD FUSSION', 'sedan', PAL.blue, PAL.royal, PAL.white], ['SUBAROO', 'wagon', PAL.green, PAL.teal, PAL.emer]],
  premium:  [['AUDEE A8', 'lux', PAL.lav, PAL.mauve, PAL.lgrey], ['BIMMER 7', 'lux', PAL.white, PAL.lgrey, PAL.white], ['MERC S', 'lux', PAL.asph3, PAL.asph, PAL.lgrey], ['LEXXUS', 'lux', PAL.brown, PAL.rust, PAL.peach]],
  whale:    [['FERRUCCIO', 'sport', PAL.red, PAL.crimson, PAL.pink], ['LAMBORGOTTI', 'wedge', PAL.yellow, PAL.orange, PAL.cream], ['PORSCH 911', 'sport', PAL.lime, PAL.emer, PAL.leaf], ['MCLARREN', 'wedge', PAL.orange, PAL.tang, PAL.yellow]],
  ultra:    [['ROLLS-ROIZ PHANTASM', 'gt', PAL.asph2, PAL.ink, PAL.lgrey], ['BENTLEE', 'gt', PAL.green, PAL.teal, PAL.emer], ['BUGATTO', 'gt', PAL.blue, PAL.royal, PAL.white]],
  limo:     [['STRETCH LIMO', 'limo', PAL.white, PAL.lgrey, PAL.white], ['STRETCH LIMO', 'limo', PAL.asph, PAL.ink, PAL.asph3]],
};
const spriteCache = new Map();
function carSprite(tier, mi, dir) { // dir: 0 E,1 S,2 W,3 N
  const key = tier + mi + ':' + dir; let c = spriteCache.get(key); if (c) return c;
  const [, shape, body, dark, light] = MODELS[tier][mi]; const rows = SHAPES[shape]; const W = rows[0].length, H = rows.length;
  const col = { k: PAL.ink, b: body, d: dark, l: light, w: PAL.navy, h: PAL.yellow, t: PAL.red, r: PAL.rust, g: PAL.lgrey, c: PAL.white };
  const vert = dir === 1 || dir === 3; c = document.createElement('canvas'); c.width = (vert ? H : W) + 1; c.height = (vert ? W : H) + 1;
  const g = c.getContext('2d');
  const put = (x, y, color) => { let px, py; if (dir === 0) { px = x; py = y; } else if (dir === 2) { px = W - 1 - x; py = H - 1 - y; } else if (dir === 1) { px = H - 1 - y; py = x; } else { px = y; py = W - 1 - x; } g.fillStyle = color; g.fillRect(px, py, 1, 1); };
  // shadow pass (offset +1,+1) then colour pass
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (rows[y][x] !== '.') { const ox = x, oy = y; put(ox, oy, PAL.night); }
  const img = g.getImageData(0, 0, c.width, c.height); g.clearRect(0, 0, c.width, c.height); g.putImageData(img, 1, 1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const ch = rows[y][x]; if (ch !== '.') put(x, y, col[ch]); }
  spriteCache.set(key, c); return c;
}
function carDims(tier, mi) { const r = SHAPES[MODELS[tier][mi][1]]; return [r[0].length, r.length]; }

// People 5x9. Legend: h hair, s skin, c shirt, a sleeve/arm, p pants, k shoes, x hat, f face-accent
const PEOPLE = {
  idle:  ['.hhh.', '.sss.', '.sss.', 'ccccc', 'scccs', '.ccc.', '.p.p.', '.p.p.', '.k.k.'],
  walk:  ['.hhh.', '.sss.', '.sss.', 'ccccc', 'scccs', '.ccc.', '.p.p.', 'p...p', 'k...k'],
  tap:   ['.hhh.', '.sss.', '.sss.', 'ccccc', 'scccs', '.ccc.', '.p.p.', '.p.p.', '.kk..'],
  cross: ['.hhh.', '.sss.', '.sss.', 'ccccc', 'cssss', '.ccc.', '.p.p.', '.p.p.', '.k.k.'],
  arms:  ['.hhh.', 's.s.s', 's.s.s', 'ccccc', '.ccc.', '.ccc.', '.p.p.', '.p.p.', '.k.k.'],
};
function drawPerson(ctx, x, y, pose, colors, flip) { // x,y = top-left; colors {h,s,c,p,k,x?}
  const rows = PEOPLE[pose] || PEOPLE.idle;
  for (let ry = 0; ry < 9; ry++) for (let rx = 0; rx < 5; rx++) {
    let ch = rows[ry][flip ? 4 - rx : rx]; if (ch === '.') continue;
    if (ry === 0 && colors.x) { ctx.fillStyle = colors.x; ctx.fillRect(x + rx, y + ry, 1, 1); continue; }
    ctx.fillStyle = colors[ch] || PAL.white; ctx.fillRect(x + rx, y + ry, 1, 1);
  }
  if (colors.x) { ctx.fillStyle = colors.x; ctx.fillRect(x + (flip ? -1 : 4), y, 2, 1); ctx.fillRect(x + 1, y - 1, 3, 1); }
}
const ICONS = {
  ticket: ['xxxxx', 'x.x.x', 'xxxxx'], lock: ['.xxx.', 'x...x', 'xxxxx', 'xx.xx', 'xxxxx'],
  star: ['..x..', '.xxx.', 'xxxxx', '.x.x.'], phone: ['xx.', 'x..', 'x..', 'x.x', '.xx'], x: ['x.x', '.x.', 'x.x'],
  pause: ['x.x', 'x.x', 'x.x', 'x.x', 'x.x'], spk: ['..x..', '.xx.x', 'xxx..', '.xx.x', '..x..'], spkoff: ['..x..', '.xx..', 'xxx.x', '.xx..', '..x..'],
  cart: ['x....', 'xxxxx', 'x.xx.', 'xxxxx', '.x..x'], cup: ['xxx.', 'xxxx', 'xxx.', '.x..'], key: ['xx...', 'xxxxx', 'xx.x.'],
  thumb: ['..x..', '.xx..', 'xxxxx', 'xxxxx', 'xxxx.'], full: ['xxxxx', 'x...x', 'x...x', 'xxxxx'],
};
function drawIcon(ctx, name, x, y, color) { const r = ICONS[name]; ctx.fillStyle = color; for (let j = 0; j < r.length; j++) for (let i = 0; i < r[j].length; i++) if (r[j][i] === 'x') ctx.fillRect(Math.round(x) + i, Math.round(y) + j, 1, 1); }
const POWER_INFO = {
  pawnOff:    { short: 'P', name: 'PAWN OFF',   color: PAL.lime,   target: 'curbNonWhale' },
  directAway: { short: 'D', name: 'DIRECT AWAY', color: PAL.blue,  target: 'curbStdPrem' },
  ignore:     { short: 'I', name: 'IGNORE',     color: PAL.lav,    target: 'guest' },
  bags:       { short: 'B', name: 'BAGS & CART', color: PAL.orange, target: 'curbWhale' },
  hustle:     { short: 'H', name: 'HUSTLE',     color: PAL.yellow, target: 'self' },
  reserved:   { short: 'R', name: 'RESERVED',   color: PAL.pink,   target: 'none' },
  spareKeys:  { short: 'K', name: 'SPARE KEYS', color: PAL.peach,  target: 'self' },
  bribe:      { short: '$', name: 'BRIBE',      color: PAL.cream,  target: 'curbLimo' },
  fakeSmile:  { short: 'S', name: 'FAKE SMILE', color: PAL.salmon || PAL.pink, target: 'guest' },
  coffee:     { short: 'C', name: 'COFFEE',     color: PAL.brown,  target: 'self' },
};
