'use strict';
/* Selected car: stall choices and curb menu. */

/* ---- selection: stall highlights + curb menu ---- */
function selectionOptions() {
  const sel = S.selected;
  if (!sel) return { stalls: [], menu: [] };
  const car = S.cars.get(sel.carId);
  if (!car) {
    S.selected = null;
    return { stalls: [], menu: [] };
  }
  const g = S.guests.get(car.guestId);
  const stalls = [],
    menu = [];
  const canPark = car.loc.t === 'temp' || (car.loc.t === 'curb' && g && g.state === 'curbDrop' && g.tier !== 'limo');
  if (canPark)
    for (let l = 0; l < NL; l++)
      for (const side of ['west', 'east']) {
        const e = entryIndex(l, side, pendingParks(l, side));
        if (!e) {
          const j = side === 'west' ? 0 : NS - 1;
          stalls.push({ lane: l, side, idx: j, bad: true });
          continue;
        }
        const job = { type: car.loc.t === 'temp' ? 'move' : 'park', carId: car.id, lane: l, side, bags: sel.bags };
        stalls.push({ lane: l, side, idx: e.idx, depth: e.depth, est: estimateFor(job), job });
      }
  if (car.loc.t === 'curb' && g && g.state === 'curbDrop') {
    if (g.tier === 'limo')
      menu.push({
        label: 'GREET',
        fn: () => {
          if (enqueue({ type: 'greet', carId: car.id })) S.selected = null;
        },
      });
    else if (!isWhale(g.tier)) menu.push({ label: 'WAVE OFF', fn: () => waveOff(car, g) });
    const have = t => S.cards.findIndex(c => c.type === t);
    for (const t of ['pawnOff', 'directAway', 'bags', 'bribe']) {
      const i = have(t);
      if (i >= 0 && powerTargets(t, g, car)) menu.push({ label: POWER_INFO[t].name, fn: () => useCard(i, g) });
    }
    let x = clamp(car.x - 20, 94, 226 - 44);
    menu.forEach((m, n) => {
      m.w = textW(m.label) + 6;
      m.x = x;
      m.y = 57 + Math.floor(n / 2) * 0;
      x += m.w + 2;
    });
    let mx = clamp(car.x - menu.reduce((a, m) => a + m.w + 2, 0) / 2, 92, 228 - menu.reduce((a, m) => a + m.w + 2, 0));
    menu.forEach(m => {
      m.x = Math.round(mx);
      m.y = 57;
      mx += m.w + 2;
    });
  }
  return { stalls, menu, car };
}
function renderSelection() {
  const o = selectionOptions();
  if (!S.selected) return;
  const car = o.car;
  RB(Math.round(car.x - 10), Math.round(car.y - 6), 20, 13, PAL.yellow);
  if (o.stalls.length && lotFull()) drawText(ctx, 'LOT FULL - NO PARKING', 160, 84, PAL.red, { align: 'center' });
  for (const s of o.stalls) {
    const x = MAP.lotX + s.idx * SW,
      y = MAP.lotY + s.lane * SH;
    if (s.bad) {
      RB(x + 1, y + 1, SW - 2, SH - 2, PAL.dgrey);
      continue;
    }
    const pulse = Math.floor(UI.t * 4) % 2 ? PAL.yellow : PAL.orange;
    RB(x, y, SW + 1, SH + 1, pulse);
    R(x + 1, y + 1, SW - 1, SH - 1, PAL.ink);
    drawText(ctx, 'D' + s.depth, x + 3, y + 2, PAL.yellow);
    if (s.est != null) drawText(ctx, String(Math.round(s.est)), x + 3, y + 8, PAL.white);
  }
  for (const m of o.menu) {
    R(m.x, m.y, m.w, 9, PAL.ink);
    RB(m.x, m.y, m.w, 9, PAL.yellow);
    drawText(ctx, m.label, m.x + 3, m.y + 2, PAL.yellow);
  }
}
