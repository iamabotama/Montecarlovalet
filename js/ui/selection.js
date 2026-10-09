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
  const canPark = isMovable(car) || (car.loc.t === 'curb' && g && g.state === 'curbDrop' && g.tier !== 'limo');
  if (canPark)
    for (let l = 0; l < NL; l++)
      for (const side of LOT_SIDES) {
        const e = entryIndex(l, side, pendingParks(l, side));
        if (!e) {
          const j = side === 'west' ? 0 : NS - 1;
          stalls.push({ lane: l, side, idx: j, bad: true });
          continue;
        }
        const job = { type: parkJobType(car), carId: car.id, lane: l, side, bags: sel.bags };
        stalls.push({ lane: l, side, idx: e.idx, depth: e.depth, est: estimateFor(job), job });
      }
  const vip = canPark && vipStallOption(car, g, sel);
  if (vip) {
    // the held row end shows as 'full' for everyone else; replace that marker with the VIP choice
    const k = stalls.findIndex(s => s.bad && s.lane === vip.lane && s.side === vip.side);
    if (k >= 0) stalls.splice(k, 1);
    stalls.push(vip);
  }
  if (canPark)
    PREMS.forEach((p, i) => {
      if (!premFree(i)) return;
      const job = { type: parkJobType(car), carId: car.id, prem: i, bags: sel.bags };
      stalls.push({ prem: i, depth: 0, est: estimateFor(job), job });
    });
  if (car.loc.t === 'curb' && g && g.state === 'curbDrop') {
    if (g.tier === 'limo')
      menu.push({
        label: t('sel.greet'),
        fn: () => {
          if (enqueue({ type: 'greet', carId: car.id })) S.selected = null;
        },
      });
    else if (!isWhale(g.tier)) menu.push({ label: t('sel.waveOff'), fn: () => waveOff(car, g) });
    const have = type => S.cards.findIndex(c => c.type === type);
    for (const type of ['pawnOff', 'directAway', 'bags', 'bribe']) {
      const i = have(type);
      if (i >= 0 && powerTargets(type, g, car)) menu.push({ label: POWER_INFO[type].name, fn: () => useCard(i, g) });
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
// Screen rect [x, y, w, h] of a park choice: a row stall, or a premium pad.
function optionRect(s) {
  if (s.prem != null) return [PREMS[s.prem].x - 10, PREMS[s.prem].y - 7, 20, 14];
  return [MAP.lotX + s.idx * SW, MAP.lotY + s.lane * SH, SW, SH];
}
function renderSelection() {
  const o = selectionOptions();
  if (!S.selected) return;
  const car = o.car;
  RB(Math.round(car.x - 10), Math.round(car.y - 6), 20, 13, PAL.yellow);
  if (o.stalls.length && lotFull()) drawText(ctx, t('sel.lotFull'), 160, 84, PAL.red, { align: 'center' });
  const best = perk('lotSense', 0) ? fastestStall(o.stalls) : null; // Lot Sense skill
  for (const s of o.stalls) {
    const [x, y, w, h] = optionRect(s);
    if (s.bad) {
      RB(x + 1, y + 1, w - 2, h - 2, PAL.dgrey);
      continue;
    }
    const pulse = Math.floor(UI.t * 4) % 2 ? PAL.yellow : PAL.orange;
    RB(x, y, w + 1, h + 1, pulse);
    R(x + 1, y + 1, w - 1, h - 1, PAL.ink);
    drawText(ctx, s.prem != null ? PREMS[s.prem].name : 'D' + s.depth, x + 3, y + 2, PAL.yellow);
    if (s.est != null) drawText(ctx, String(Math.round(s.est)), x + 3, y + 8, s === best ? PAL.lime : PAL.white);
    if (s === best) RB(x - 1, y - 1, w + 3, h + 3, PAL.lime);
  }
  for (const m of o.menu) {
    R(m.x, m.y, m.w, 9, PAL.ink);
    RB(m.x, m.y, m.w, 9, PAL.yellow);
    drawText(ctx, m.label, m.x + 3, m.y + 2, PAL.yellow);
  }
}
// The quickest usable stall option (lowest time estimate), for the Lot Sense highlight.
function fastestStall(stalls) {
  let best = null;
  for (const s of stalls) if (!s.bad && s.est != null && (!best || s.est < best.est)) best = s;
  return best;
}
