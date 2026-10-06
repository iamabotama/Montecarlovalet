'use strict';
/* =====================================================================
   CARS: hi-res procedural top-down car sprites (drawn at 3x the game grid).
   A car = body profile (half-width along its length) + cabin + detail tags.
   Overrides carSprite() from art.js. Sprites face EAST; other directions are rotations.
   To add a model: add a row to CAR_LOOKS (body key, paint, detail tags).
   ===================================================================== */
const CAR_RES = 3; // sprite pixels per game pixel
// prof: [fraction from rear, half-width]; cab: cabin [start,end] fractions; ws: windshield length; inset: cabin inset
const CAR_BODIES = {
  hatch: {
    L: 30,
    prof: [
      [0, 5],
      [0.05, 7],
      [0.9, 7],
      [1, 5],
    ],
    cab: [0.14, 0.7],
    ws: 4,
    inset: 1,
  },
  van: {
    L: 36,
    prof: [
      [0, 6],
      [0.04, 8],
      [0.88, 8],
      [1, 6],
    ],
    cab: [0.06, 0.8],
    ws: 4,
    inset: 1,
  },
  sedan: {
    L: 38,
    prof: [
      [0, 5],
      [0.06, 7],
      [0.9, 7],
      [1, 5],
    ],
    cab: [0.28, 0.68],
    ws: 5,
    inset: 1,
  },
  suv: {
    L: 40,
    prof: [
      [0, 6],
      [0.04, 8],
      [0.92, 8],
      [1, 7],
    ],
    cab: [0.18, 0.8],
    ws: 4,
    inset: 1,
  },
  exec: {
    L: 43,
    prof: [
      [0, 6],
      [0.06, 8],
      [0.9, 8],
      [1, 6],
    ],
    cab: [0.3, 0.68],
    ws: 6,
    inset: 1,
  },
  ferr: {
    L: 45,
    prof: [
      [0, 8],
      [0.05, 10],
      [0.3, 11],
      [0.5, 9],
      [0.72, 10],
      [0.9, 8],
      [1, 4],
    ],
    cab: [0.38, 0.62],
    ws: 6,
    inset: 3,
  },
  lambo: {
    L: 45,
    prof: [
      [0, 9],
      [0.04, 11],
      [0.35, 11],
      [0.55, 9],
      [0.82, 7],
      [1, 3],
    ],
    cab: [0.36, 0.62],
    ws: 8,
    inset: 3,
  },
  mcl: {
    L: 45,
    prof: [
      [0, 8],
      [0.06, 10],
      [0.32, 11],
      [0.6, 9],
      [0.85, 7],
      [1, 4],
    ],
    cab: [0.36, 0.66],
    ws: 7,
    inset: 3,
  },
  bug: {
    L: 46,
    prof: [
      [0, 9],
      [0.05, 11],
      [0.3, 11],
      [0.6, 10],
      [0.88, 8],
      [1, 5],
    ],
    cab: [0.36, 0.64],
    ws: 6,
    inset: 3,
  },
  rolls: {
    L: 47,
    prof: [
      [0, 8],
      [0.04, 10],
      [0.96, 10],
      [1, 9],
    ],
    cab: [0.16, 0.5],
    ws: 5,
    inset: 1,
  },
  bent: {
    L: 47,
    prof: [
      [0, 8],
      [0.05, 10],
      [0.9, 10],
      [1, 8],
    ],
    cab: [0.2, 0.54],
    ws: 5,
    inset: 1,
  },
  limo: {
    L: 66,
    prof: [
      [0, 6],
      [0.03, 8],
      [0.95, 8],
      [1, 6],
    ],
    cab: [0.14, 0.84],
    ws: 5,
    inset: 1,
  },
};
const WHALE_FX = ['intakes', 'canopy', 'glint', 'sparkle'];
// [body, paint, tags] per model, same order as MODELS in art.js
const CAR_LOOKS = {
  beater: [
    ['hatch', '#b8a77a', ['rust', 'dent']],
    ['hatch', '#8f8a7a', ['rust', 'mismatch']],
    ['van', '#7d8a6a', ['rust']],
  ],
  standard: [
    ['sedan', '#c2c3c7', []],
    ['sedan', '#29adff', []],
    ['suv', '#108a4a', []],
  ],
  premium: [
    ['exec', '#83769c', ['chrome']],
    ['exec', '#f4efe8', ['chrome']],
    ['exec', '#2a2a33', ['chrome']],
    ['exec', '#7a4a2a', ['chrome']],
  ],
  whale: [
    ['ferr', '#ff1744', ['stripes', 'vents', 'quad', 'roundlights', ...WHALE_FX]],
    ['lambo', '#ffe11a', ['vents', 'bigwing', 'quad', 'hexlights', ...WHALE_FX]],
    ['mcl', '#00e436', ['roundlights', 'quad', ...WHALE_FX]],
    ['mcl', '#ff9a00', ['bigwing', 'hexlights', ...WHALE_FX]],
  ],
  ultra: [
    ['rolls', '#d9d9e0', ['twotone', 'grille', 'ornament', 'coachline', 'glint', 'sparkle', 'glow:#ffcc33']],
    ['bent', '#0e5c3a', ['grille', 'roundlights', 'coachline', 'ornament', 'glint', 'sparkle', 'glow:#ffcc33']],
    ['bug', '#1d6fe0', ['twotone', 'horseshoe', 'intakes', 'canopy', 'quad', 'glint', 'sparkle', 'glow:#29adff']],
  ],
  limo: [
    ['limo', '#f4f4f4', ['chrome']],
    ['limo', '#1a1a20', ['chrome']],
  ],
};
const C_INK = '#101018',
  C_GLASS = '#1d2b53',
  C_GLASS_HI = '#5f8fd0',
  C_HEAD = '#fff1a8',
  C_TAIL = '#ff2244',
  C_CHROME = '#d8dde6',
  C_GOLD = '#ffcc33',
  C_TIRE = '#22222a',
  C_SMOKE = '#0c1430';
function hexShade(h, f) {
  const n = parseInt(h.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v * f))));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}
function hexRgba(h, a) {
  const n = parseInt(h.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function buildCarEast(tier, mi) {
  const [bk, P, tags] = CAR_LOOKS[tier][mi % CAR_LOOKS[tier].length];
  const b = CAR_BODIES[bk];
  const L = b.L;
  const has = t => tags.includes(t);
  const W = Math.max(...b.prof.map(p => p[1]));
  const Wd = L + 6,
    Hd = W * 2 + 9;
  const ox = 3,
    cy = Math.floor(Hd / 2);
  const grid = Array.from({ length: Hd }, () => Array(Wd).fill(null)); // colours
  const set = (x, y, c) => {
    const X = ox + x,
      Y = cy + y;
    if (X >= 0 && X < Wd && Y >= 0 && Y < Hd) grid[Y][X] = c;
  };
  const get = (x, y) => {
    const X = ox + x,
      Y = cy + y;
    return X >= 0 && X < Wd && Y >= 0 && Y < Hd ? grid[Y][X] : null;
  };
  const isBody = (x, y) => {
    const c = get(x, y);
    return c && c[0] === '#' && ![C_INK, C_GLASS, C_GLASS_HI, C_TIRE, C_SMOKE].includes(c);
  };
  const half = x => {
    const t = x / (L - 1);
    const pr = b.prof;
    for (let i = 1; i < pr.length; i++) {
      const [a, wa] = pr[i - 1],
        [c, wc] = pr[i];
      if (t >= a && t <= c) return wa + (wc - wa) * (c > a ? (t - a) / (c - a) : 0);
    }
    return pr[pr.length - 1][1];
  };
  const hw = Array.from({ length: L }, (_, x) => Math.round(half(x)));
  const rnd = (() => {
    let s = (tier.length * 97 + mi * 31) | 0;
    return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  })();
  const glow = tags.find(t => t.startsWith('glow:'));
  // glow halo (soft two-ring) + shadow
  if (glow) {
    const G = glow.slice(5);
    for (let x = -2; x < L + 2; x++) {
      const h = hw[Math.max(0, Math.min(L - 1, x))];
      for (let y = -h - 3; y <= h + 3; y++) {
        const out = Math.max(Math.abs(y) - h, x < 0 ? -x : x >= L ? x - L + 1 : 0);
        set(x, y, hexRgba(G, out <= 1 ? 0.55 : out <= 2 ? 0.3 : 0.12));
      }
    }
  }
  for (let x = 0; x < L; x++)
    for (let y = -hw[x] + 1; y <= hw[x] + 1; y++) if (!glow) set(x + 2, y + 1, 'rgba(0,0,0,0.35)');
  const axles = [Math.floor(L * 0.18), Math.floor(L * 0.8)].concat(bk === 'limo' ? [Math.floor(L * 0.5)] : []);
  const nearAxle = x => axles.some(a => Math.abs(x - a) <= 3);
  for (const a of axles)
    for (let dx = -3; dx < 3; dx++)
      for (const s of [-1, 1]) {
        set(a + dx, s * hw[a], C_TIRE);
        if (Math.abs(dx + 0.5) < 2.5) set(a + dx, s * (hw[a] + 1), C_TIRE);
      }
  for (let x = 0; x < L; x++) {
    const h = hw[x];
    for (let y = -h; y <= h; y++) {
      let c;
      if (Math.abs(y) === h || x === 0 || x === L - 1) c = C_INK;
      else if (Math.abs(y) === h - 1 && nearAxle(x)) c = hexShade(P, 0.6);
      else if (y <= -h + 2) c = hexShade(P, 1.22);
      else if (y < 0) c = hexShade(P, 1.06);
      else if (y < h - 2) c = hexShade(P, 0.9);
      else c = hexShade(P, 0.72);
      set(x, y, c);
    }
  }
  const c0 = Math.floor(L * b.cab[0]),
    c1 = Math.floor(L * b.cab[1]),
    ws = b.ws,
    ins = b.inset;
  for (let x = c1 + 1; x < L - 2; x++) set(x, -1, hexShade(P, 1.12)); // hood crease
  for (let x = c0; x < c1; x++) {
    const h = hw[x] - ins - 1;
    if (x >= c1 - ws) {
      const t = (x - (c1 - ws)) / ws;
      const h2 = Math.max(2, Math.round(h - t * 1.5));
      for (let y = -h2; y <= h2; y++) set(x, y, y === -h2 + 1 && x < c1 - 1 ? C_GLASS_HI : C_GLASS);
    } else if (x < c0 + 2) {
      for (let y = -h + 1; y < h; y++) set(x, y, C_GLASS);
    } else
      for (let y = -h; y <= h; y++)
        set(x, y, Math.abs(y) === h ? C_GLASS : y === -h + 1 ? hexShade(P, 1.3) : hexShade(P, y < 0 ? 0.96 : 0.84));
  }
  if (bk === 'limo')
    for (let x = c0 + 8; x < c1 - ws - 2; x += 8)
      for (let y = -hw[x] + 2; y < hw[x] - 1; y++) set(x, y, hexShade(P, 0.62));
  for (const s of [-1, 1]) {
    set(L - 2, s * (hw[L - 2] - 2), C_HEAD);
    set(L - 3, s * (hw[L - 2] - 2), C_HEAD);
    set(1, s * (hw[1] - 2), C_TAIL);
    set(2, s * (hw[1] - 2), C_TAIL);
  }
  // ----- detail tags -----
  if (has('rust'))
    for (let i = 0; i < 8; i++) {
      const x = 2 + Math.floor(rnd() * (L - 4));
      const y = -hw[x] + 1 + Math.floor(rnd() * (2 * hw[x] - 1));
      if (isBody(x, y)) set(x, y, '#8a4b2a');
    }
  if (has('dent'))
    for (let x = Math.floor(L * 0.86); x < Math.floor(L * 0.86) + 3; x++) set(x, hw[x] - 1, hexShade(P, 0.5));
  if (has('mismatch'))
    for (let x = c1 + 1; x < L - 1; x++) for (let y = -hw[x] + 1; y < 0; y++) if (isBody(x, y)) set(x, y, '#9a9a8a');
  if (has('chrome')) {
    for (let x = 3; x < L - 3; x++)
      for (const s of [-1, 1]) if (isBody(x, s * (hw[x] - 1)) && !nearAxle(x)) set(x, s * (hw[x] - 1), C_CHROME);
    for (let y = -3; y <= 3; y++) set(L - 1, y, C_CHROME);
  }
  if (has('stripes')) for (let x = 1; x < L - 1; x++) for (const y of [-2, 2]) if (isBody(x, y)) set(x, y, '#fff1e8');
  if (has('twotone'))
    for (let x = 1; x < L - 1; x++)
      for (let y = 1; y < hw[x]; y++) if (isBody(x, y)) set(x, y, hexShade('#1a1a22', y < hw[x] - 2 ? 1.1 : 0.8));
  if (has('intakes'))
    for (let i = 0; i < 5; i++) {
      const x = c0 - 2 - i;
      for (const s of [-1, 1])
        for (let d = 0; d < 3 - (i >> 1); d++) {
          const y = s * (hw[x] - 1 - d);
          if (isBody(x, y)) set(x, y, C_INK);
        }
    }
  if (has('vents')) for (let x = 4; x < c0 - 1; x += 2) for (let y = -3; y <= 3; y++) set(x, y, hexShade(P, 0.55));
  if (has('bigwing'))
    for (let y = -hw[2] - 2; y <= hw[2] + 2; y++) {
      set(1, y, C_INK);
      set(2, y, hexShade(P, 0.5));
      set(3, y, C_INK);
    }
  if (has('quad')) for (const y of [-3, -1, 1, 3]) set(0, y, C_CHROME);
  if (has('canopy'))
    for (let x = c0; x < c1; x++) {
      const h = hw[x] - ins - 1;
      for (let y = -h; y <= h; y++) if (get(x, y) !== C_GLASS_HI) set(x, y, Math.abs(y) < h ? C_SMOKE : C_GLASS);
    }
  if (has('hexlights'))
    for (const s of [-1, 1]) for (let d = 0; d < 4; d++) set(L - 2 - d, s * (hw[L - 2 - d] - 1 - (d >> 1)), C_HEAD);
  if (has('horseshoe')) {
    for (let y = -2; y <= 2; y++) set(L - 1, y, C_CHROME);
    set(L - 2, -2, C_CHROME);
    set(L - 2, 2, C_CHROME);
    for (let x = c0 - 4; x < c1 + 2; x++) {
      const t = (x - (c0 - 4)) / (c1 + 6 - c0);
      const y = Math.round(-hw[x] + 2 + 4 * Math.sin(t * Math.PI));
      if (isBody(x, y)) set(x, y, C_CHROME);
    }
  }
  if (has('grille')) {
    for (let y = -4; y <= 4; y++) {
      set(L - 1, y, C_CHROME);
      set(L - 2, y, hexShade(C_CHROME, 0.8));
    }
    for (let x = c1 + 2; x < L - 3; x++) for (const y of [-4, 4]) set(x, y, hexShade(P, 1.25));
  }
  if (has('ornament')) {
    set(L - 4, 0, C_CHROME);
    set(L - 5, 0, '#ffffff');
    set(L - 4, -1, C_CHROME);
    set(L - 4, 1, C_CHROME);
  }
  if (has('roundlights'))
    for (const s of [-1, 1])
      for (const [dx, dy] of [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ])
        set(L - 3 - dx, s * (hw[L - 3] - 3 + dy), C_HEAD);
  if (has('coachline'))
    for (let x = 3; x < L - 3; x++)
      for (const s of [-1, 1]) {
        const y = s * (hw[x] - 2);
        if (isBody(x, y)) set(x, y, C_GOLD);
      }
  if (has('glint'))
    for (let x = Math.floor(L * 0.15); x < Math.floor(L * 0.3); x++) {
      const y = -hw[x] + 1;
      if (isBody(x, y)) set(x, y, '#ffffff');
    }
  if (has('sparkle'))
    for (const [sx, sy] of [
      [Math.floor(L * 0.2), -hw[Math.floor(L * 0.2)] + 2],
      [Math.floor(L * 0.88), -2],
    ]) {
      set(sx, sy, '#ffffff');
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ])
        if (isBody(sx + dx, sy + dy)) set(sx + dx, sy + dy, hexShade(P, 1.45));
    }
  const c = document.createElement('canvas');
  c.width = Wd;
  c.height = Hd;
  const g = c.getContext('2d');
  for (let y = 0; y < Hd; y++)
    for (let x = 0; x < Wd; x++)
      if (grid[y][x]) {
        g.fillStyle = grid[y][x];
        g.fillRect(x, y, 1, 1);
      }
  return c;
}
const hiCarCache = new Map();
// Returns a canvas at CAR_RES x resolution; draw with drawCarSprite() so it lands at game scale.
carSprite = function (tier, mi, dir) {
  const key = tier + mi + ':' + dir;
  let c = hiCarCache.get(key);
  if (c) return c;
  const e = hiCarCache.get(tier + mi + ':0') || buildCarEast(tier, mi);
  hiCarCache.set(tier + mi + ':0', e);
  if (dir === 0) return e;
  const vert = dir % 2 === 1;
  c = document.createElement('canvas');
  c.width = vert ? e.height : e.width;
  c.height = vert ? e.width : e.height;
  const g = c.getContext('2d');
  g.translate(c.width / 2, c.height / 2);
  g.rotate((dir * Math.PI) / 2);
  g.drawImage(e, -e.width / 2, -e.height / 2);
  hiCarCache.set(key, c);
  return c;
};
// Draw a car sprite centred at game coords (cx, cy). Main canvas runs at CAR_RES x so sprite pixels map 1:1.
function drawCarSprite(ctx, s, cx, cy) {
  const w = s.width / CAR_RES,
    h = s.height / CAR_RES;
  ctx.drawImage(s, Math.round((cx - w / 2) * CAR_RES) / CAR_RES, Math.round((cy - h / 2) * CAR_RES) / CAR_RES, w, h);
}
