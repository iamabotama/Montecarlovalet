'use strict';
/* Comp menu + comp visuals. Rules live in sim/comps.js, data in data/comps.js.
   The menu opens OVER the ticket board (a short modal the player chose to open), so it never covers
   guests, valets or cars. Tapping anywhere else closes it. */
const COMP_MENU = { x: 221, y: 92, w: 98, h: 56, row: 9 };

function compMenuGuest() {
  const m = S.comps.menu;
  return m ? S.guests.get(m.guestId) : null;
}

function compMenuRows() {
  const g = compMenuGuest();
  if (!g) return [];
  const { x, y, w, row } = COMP_MENU;
  const rows = COMPS.order.map((id, i) => ({
    id,
    x,
    y: y + 10 + i * row,
    w,
    label: t(COMPS[id].name),
    price: compUsed(id) ? t('comp.used') : fmtMoney(COMPS[id].cost),
    ok: !compUsed(id) && compAffordable(id),
    fn: () => applyComp(id, g),
  }));
  rows.push({
    id: 'car',
    x,
    y: y + 10 + COMPS.order.length * row,
    w,
    label: t('comp.getCar'),
    price: '',
    ok: true,
    fn: () => {
      S.comps.menu = null;
      tapGuest(g, true);
    },
  });
  return rows;
}

// Hit targets (ui/input.js): the rows win over the board underneath.
function compMenuTargets(add) {
  if (!S.comps.menu) return;
  for (const r of compMenuRows()) add(r.x, r.y, r.w, r.row || COMP_MENU.row, 8, r.fn);
}

// Any tap outside the menu closes it first, then does its normal job (ui/input.js pointerdown).
function compMenuTapAway(x, y) {
  const { x: mx, y: my, w, h } = COMP_MENU;
  if (S.comps && S.comps.menu && !(x >= mx && x < mx + w && y >= my && y < my + h)) S.comps.menu = null;
}

function renderCompMenu() {
  const g = compMenuGuest();
  if (!g) return;
  const { x, y, w, h } = COMP_MENU;
  R(x, y, w, h, PAL.ink);
  RB(x, y, w, h, PAL.pink);
  drawText(ctx, t('comp.title'), x + 3, y + 2, PAL.pink, { maxW: w - 6 });
  for (const r of compMenuRows()) {
    const col = r.ok ? PAL.yellow : PAL.dgrey;
    if (r.id === 'car') R(x + 1, r.y - 1, w - 2, 1, PAL.dgrey);
    drawText(ctx, r.label, x + 3, r.y + 1, r.id === 'car' ? PAL.white : col, { maxW: w - 34 });
    if (r.price) drawText(ctx, r.price, x + w - 3, r.y + 1, col, { align: 'right' });
  }
  // mark who the menu is for
  const gx = Math.round(g.x + crowdOff(g));
  if (Math.floor(UI.t * 4) % 2) RB(gx - 2, g.y - 2, 9, 13, PAL.pink);
}

/* ---- visuals next to comped guests (drawn in the world pass) ---- */
function renderCompFx() {
  for (const g of S.guests.values()) {
    const c = g.comp;
    if (!c) continue;
    const gx = Math.round(g.x + crowdOff(g)),
      gy = Math.round(g.y);
    if (c.id === 'showgirl') drawShowgirl(g, c, gx, gy);
    else if (c.t < COMPS.fxSec) drawCompIcon(COMPS[c.id].icon, gx + 7, gy - 4);
  }
}

// She walks out of the door, kisses (heart), stays at the guest's side, then walks back in.
function drawShowgirl(g, c, gx, gy) {
  const D = COMPS.door,
    W = COMPS.walkSec;
  let k; // 0 = at the door, 1 = beside the guest
  if (c.t < W) k = c.t / W;
  else if (c.t < c.dur) k = 1;
  else k = 1 - (c.t - c.dur) / W;
  if (k <= 0) return;
  const x = Math.round(lerp(D.x, gx + 6, k)),
    y = Math.round(lerp(D.y, gy, k));
  const walking = k < 1;
  drawPerson(ctx, x, y, walking && Math.floor(UI.t * 8) % 2 ? 'walk' : 'idle', SHOWGIRL_LOOK, x > gx);
  if (c.t >= W && c.t < W + 1.5) drawCompIcon('heart', gx + 4, gy - 2 - Math.floor(c.t - W));
}
const SHOWGIRL_LOOK = { h: PAL.yellow, s: PAL.peach, c: PAL.pink, p: PAL.peach, k: PAL.pink, x: PAL.white };

// Tiny pixel icons (game px). Kept here: only comps use them.
const COMP_ICONS = {
  glass: ['.y.', 'yyy', '.y.', '.y.', 'yyy'],
  tickets: ['oooo', 'o..o', 'oooo'],
  key: ['yy...', 'y.yyy', 'yy.y.'],
  heart: ['r.r', 'rrr', '.r.'],
};
const COMP_ICON_COLS = { y: () => PAL.yellow, o: () => PAL.orange, r: () => PAL.red };
function drawCompIcon(name, x, y) {
  const rows = COMP_ICONS[name];
  if (!rows) return;
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] !== '.') R(x + i, y + j, 1, 1, COMP_ICON_COLS[row[i]]());
  });
}
