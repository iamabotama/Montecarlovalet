'use strict';
/* Low-res sprites: legacy car shapes, people, icons. */

const spriteCache = new Map();
function carSprite(tier, mi, dir) {
  // dir: 0 E,1 S,2 W,3 N
  const key = tier + mi + ':' + dir;
  let c = spriteCache.get(key);
  if (c) return c;
  const [, shape, body, dark, light] = MODELS[tier][mi];
  const rows = SHAPES[shape];
  const W = rows[0].length,
    H = rows.length;
  const col = {
    k: PAL.ink,
    b: body,
    d: dark,
    l: light,
    w: PAL.navy,
    h: PAL.yellow,
    t: PAL.red,
    r: PAL.rust,
    g: PAL.lgrey,
    c: PAL.white,
  };
  const vert = dir === 1 || dir === 3;
  c = document.createElement('canvas');
  c.width = (vert ? H : W) + 1;
  c.height = (vert ? W : H) + 1;
  const g = c.getContext('2d');
  const put = (x, y, color) => {
    let px, py;
    if (dir === 0) {
      px = x;
      py = y;
    } else if (dir === 2) {
      px = W - 1 - x;
      py = H - 1 - y;
    } else if (dir === 1) {
      px = H - 1 - y;
      py = x;
    } else {
      px = y;
      py = W - 1 - x;
    }
    g.fillStyle = color;
    g.fillRect(px, py, 1, 1);
  };
  // shadow pass (offset +1,+1) then colour pass
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (rows[y][x] !== '.') {
        const ox = x,
          oy = y;
        put(ox, oy, PAL.night);
      }
  const img = g.getImageData(0, 0, c.width, c.height);
  g.clearRect(0, 0, c.width, c.height);
  g.putImageData(img, 1, 1);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const ch = rows[y][x];
      if (ch !== '.') put(x, y, col[ch]);
    }
  spriteCache.set(key, c);
  return c;
}
function carDims(tier, mi) {
  const r = SHAPES[MODELS[tier][mi][1]];
  return [r[0].length, r.length];
}

// People 5x9. Legend: h hair, s skin, c shirt, a sleeve/arm, p pants, k shoes, x hat, f face-accent, g gloves (optional)
const PEOPLE = {
  idle: ['.hhh.', '.sss.', '.sss.', 'ccccc', 'scccs', '.ccc.', '.p.p.', '.p.p.', '.k.k.'],
  walk: ['.hhh.', '.sss.', '.sss.', 'ccccc', 'scccs', '.ccc.', '.p.p.', 'p...p', 'k...k'],
  tap: ['.hhh.', '.sss.', '.sss.', 'ccccc', 'scccs', '.ccc.', '.p.p.', '.p.p.', '.kk..'],
  cross: ['.hhh.', '.sss.', '.sss.', 'ccccc', 'cssss', '.ccc.', '.p.p.', '.p.p.', '.k.k.'],
  arms: ['.hhh.', 's.s.s', 's.s.s', 'ccccc', '.ccc.', '.ccc.', '.p.p.', '.p.p.', '.k.k.'],
};
/* People keep their 5x9 game-pixel pattern and colours. On the 16-bit grid they also get a half-pixel
   outline, eyes, cheeks, edge shading and a hair highlight (each can be switched off here). */
const PERSON_STYLE = {
  outline: 'rgba(16,12,28,0.9)',
  eyes: '#1a1424',
  cheeks: 'rgba(200,80,80,0.55)',
  shade: 'rgba(0,0,0,0.28)',
  hemShade: 'rgba(0,0,0,0.2)',
  hairLight: 'rgba(255,255,255,0.35)',
};
function personCells(pose, colors, flip) {
  const rows = PEOPLE[pose] || PEOPLE.idle;
  const cells = [];
  for (let ry = 0; ry < 9; ry++)
    for (let rx = 0; rx < 5; rx++) {
      let ch = rows[ry][flip ? 4 - rx : rx];
      if (ch === '.') continue;
      if (ch === 's' && ry === 4 && colors.g) ch = 'g'; // hands: gloves when given
      cells.push({ rx, ry, ch, col: ry === 0 && colors.x ? colors.x : colors[ch] || PAL.white });
    }
  if (colors.x) {
    // cap brim and crown
    cells.push(
      { rx: flip ? -1 : 4, ry: 0, ch: 'x', col: colors.x },
      { rx: flip ? 0 : 5, ry: 0, ch: 'x', col: colors.x },
    );
    for (let i = 1; i < 4; i++) cells.push({ rx: i, ry: -1, ch: 'x', col: colors.x });
  }
  return cells;
}
function drawPerson(ctx, x, y, pose, colors, flip) {
  // x,y = top-left in game px; colors {h,s,c,p,k,x?,g?}
  const P = PERSON_STYLE,
    h = HI_PX;
  x = snapHi(x);
  y = snapHi(y);
  const cells = personCells(pose, colors, flip);
  const at = new Set(cells.map(c => c.rx + ',' + c.ry));
  const fill = (c, rx, ry, w, hh) => {
    ctx.fillStyle = c;
    ctx.fillRect(x + rx, y + ry, w, hh);
  };
  if (P.outline) for (const c of cells) fill(P.outline, c.rx - h, c.ry - h, 1 + 2 * h, 1 + 2 * h);
  for (const c of cells) fill(c.col, c.rx, c.ry, 1, 1);
  for (const c of cells) {
    if (P.shade && (c.ch === 'c' || c.ch === 'p') && !at.has(c.rx + 1 + ',' + c.ry))
      fill(P.shade, c.rx + h, c.ry, h, 1);
    if (P.hemShade && c.ch === 'c' && c.ry === 5) fill(P.hemShade, c.rx, c.ry + h, 1, h);
    if (P.hairLight && (c.ch === 'h' || c.ch === 'x') && c.ry <= 0 && !at.has(c.rx - 1 + ',' + c.ry))
      fill(P.hairLight, c.rx, c.ry, h, h);
  }
  if (P.eyes) (fill(P.eyes, 1 + h, 1 + h, h, h), fill(P.eyes, 3, 1 + h, h, h));
  if (P.cheeks) (fill(P.cheeks, 1, 2, h, h), fill(P.cheeks, 3 + h, 2, h, h));
}
const ICONS = {
  ticket: ['xxxxx', 'x.x.x', 'xxxxx'],
  lock: ['.xxx.', 'x...x', 'xxxxx', 'xx.xx', 'xxxxx'],
  star: ['..x..', '.xxx.', 'xxxxx', '.x.x.'],
  phone: ['xx.', 'x..', 'x..', 'x.x', '.xx'],
  x: ['x.x', '.x.', 'x.x'],
  pause: ['x.x', 'x.x', 'x.x', 'x.x', 'x.x'],
  spk: ['..x..', '.xx.x', 'xxx..', '.xx.x', '..x..'],
  spkoff: ['..x..', '.xx..', 'xxx.x', '.xx..', '..x..'],
  cart: ['x....', 'xxxxx', 'x.xx.', 'xxxxx', '.x..x'],
  cup: ['xxx.', 'xxxx', 'xxx.', '.x..'],
  key: ['xx...', 'xxxxx', 'xx.x.'],
  thumb: ['..x..', '.xx..', 'xxxxx', 'xxxxx', 'xxxx.'],
  full: ['xxxxx', 'x...x', 'x...x', 'xxxxx'],
};
function drawIcon(ctx, name, x, y, color) {
  const r = ICONS[name];
  ctx.fillStyle = color;
  for (let j = 0; j < r.length; j++)
    for (let i = 0; i < r[j].length; i++) if (r[j][i] === 'x') ctx.fillRect(Math.round(x) + i, Math.round(y) + j, 1, 1);
}
