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

// People 5x9. Legend: h hair, s skin, c shirt, a sleeve/arm, p pants, k shoes, x hat, f face-accent
const PEOPLE = {
  idle: ['.hhh.', '.sss.', '.sss.', 'ccccc', 'scccs', '.ccc.', '.p.p.', '.p.p.', '.k.k.'],
  walk: ['.hhh.', '.sss.', '.sss.', 'ccccc', 'scccs', '.ccc.', '.p.p.', 'p...p', 'k...k'],
  tap: ['.hhh.', '.sss.', '.sss.', 'ccccc', 'scccs', '.ccc.', '.p.p.', '.p.p.', '.kk..'],
  cross: ['.hhh.', '.sss.', '.sss.', 'ccccc', 'cssss', '.ccc.', '.p.p.', '.p.p.', '.k.k.'],
  arms: ['.hhh.', 's.s.s', 's.s.s', 'ccccc', '.ccc.', '.ccc.', '.p.p.', '.p.p.', '.k.k.'],
};
function drawPerson(ctx, x, y, pose, colors, flip) {
  // x,y = top-left; colors {h,s,c,p,k,x?}
  const rows = PEOPLE[pose] || PEOPLE.idle;
  for (let ry = 0; ry < 9; ry++)
    for (let rx = 0; rx < 5; rx++) {
      let ch = rows[ry][flip ? 4 - rx : rx];
      if (ch === '.') continue;
      if (ry === 0 && colors.x) {
        ctx.fillStyle = colors.x;
        ctx.fillRect(x + rx, y + ry, 1, 1);
        continue;
      }
      ctx.fillStyle = colors[ch] || PAL.white;
      ctx.fillRect(x + rx, y + ry, 1, 1);
    }
  if (colors.x) {
    ctx.fillStyle = colors.x;
    ctx.fillRect(x + (flip ? -1 : 4), y, 2, 1);
    ctx.fillRect(x + 1, y - 1, 3, 1);
  }
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
