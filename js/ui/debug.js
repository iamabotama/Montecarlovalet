'use strict';
/* Debug overlay (?debug=1, backtick). */

/* ---- debug overlay ---- */
function debugButtons() {
  const b = [];
  let y = 12;
  const row = items => {
    let x = 222;
    for (const [l, fn] of items) {
      const w = textW(l) + 4;
      b.push({ x, y, w, label: l, fn });
      x += w + 2;
    }
    y += 10;
  };
  const speeds = [0.25, 0.5, 1, 2, 4];
  row([
    [
      'SPD-',
      () => {
        DEBUG.scale = speeds[Math.max(0, speeds.indexOf(DEBUG.scale) - 1)];
      },
    ],
    [
      'SPD+',
      () => {
        DEBUG.scale = speeds[Math.min(4, speeds.indexOf(DEBUG.scale) + 1)];
      },
    ],
    [
      'GALA',
      () => {
        S.galaAt = 0;
      },
    ],
  ]);
  row([
    [
      'H-10',
      () => {
        S.heat = Math.max(0, S.heat - 10);
        enforceSlots();
      },
    ],
    ['H+10', () => addHeat(10 / (1 + S.heat / 100), 'DEBUG.')],
    [
      'H90',
      () => {
        S.heat = 90;
        enforceSlots();
      },
    ],
  ]);
  row([
    ['B', () => spawnArrival('beater')],
    ['S', () => spawnArrival('standard')],
    ['P', () => spawnArrival('premium')],
    ['W', () => spawnArrival('whale')],
    ['U', () => spawnArrival('ultra')],
    ['L', () => spawnArrival('limo')],
  ]);
  row([
    [
      'FILL',
      () => {
        for (let l = 0; l < NL; l++)
          for (const s of LOT_SIDES) {
            let e;
            while ((e = entryIndex(l, s))) {
              const g = makeGuest('beater', 0);
              placeInStall(S.cars.get(g.carId), l, e.idx);
              g.state = 'inside';
              g.stay = 999;
            }
          }
      },
    ],
    [
      'GRANT',
      () => {
        const k = Object.keys(POWER_INFO)[DEBUG.grant++ % 10];
        grantCard(k);
      },
    ],
    [
      'HIT',
      () => {
        DEBUG.hit = !DEBUG.hit;
      },
    ],
    [
      'XP+1K',
      () => {
        SAVE.careerXP += 1000;
        writeSave();
      },
    ],
  ]);
  return b;
}
function renderDebug() {
  R(220, 10, 100, 44, PAL.ink);
  for (const b of debugButtons()) {
    RB(b.x, b.y, b.w, 8, PAL.lime);
    drawText(ctx, b.label, b.x + 2, b.y + 2, PAL.lime);
  }
  drawText(ctx, 'X' + DEBUG.scale + ' HEAT ' + S.heat.toFixed(1), 222, 52, PAL.lime);
  for (const g of S.guests.values())
    if (WAITING.has(g.state) && g.state !== 'queued')
      drawText(ctx, Math.round((100 * g.wait) / g.patience) + '%', g.x, g.y + 10, PAL.lime);
  if (DEBUG.hit) {
    for (const t of hitTargets()) RB(t.x, t.y, t.w, t.h, PAL.blue);
    for (const n of NODES.values()) R(n.x, n.y, 1, 1, PAL.lime);
  }
}
