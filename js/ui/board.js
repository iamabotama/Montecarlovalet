'use strict';
/* Retrieve board: tickets handed in at the podium. */

/* ---- retrieve board: one row per ticket handed in at the podium, most urgent first ---- */
const TIER_MARK = {
  beater: ['B', PAL.khaki],
  standard: ['S', PAL.blue],
  premium: ['P', PAL.lav],
  whale: ['W', PAL.pink],
  ultra: ['U', PAL.yellow],
  limo: ['L', PAL.white],
};
function boardList() {
  return [...S.guests.values()]
    .filter(g => g.ticket && (g.state === 'toSpot' || g.state === 'pickWait'))
    .sort((a, b) => b.wait / b.patience - a.wait / a.patience);
}
function boardRows() {
  const list = boardList();
  return {
    rows: list.slice(0, CONFIG.podium.boardRows).map((g, i) => ({ g, y: 102 + i * 9 })),
    more: Math.max(0, list.length - CONFIG.podium.boardRows),
  };
}
function renderBoard() {
  R(221, 92, 98, 56, PAL.ink);
  RB(221, 92, 98, 56, PAL.lgrey);
  drawText(ctx, 'TICKETS', 224, 94, PAL.yellow);
  if (lotFull()) {
    if (Math.floor(UI.t * 3) % 2) drawText(ctx, 'LOT FULL', 316, 94, PAL.red, { align: 'right' });
  } else drawText(ctx, 'FREE ' + freeStalls(), 316, 94, PAL.lgrey, { align: 'right' });
  R(222, 100, 96, 1, PAL.dgrey);
  const { rows, more } = boardRows();
  if (!rows.length)
    drawText(
      ctx,
      S.t < (CONFIG.ramp.enabled ? CONFIG.ramp.steps[1].fromSec : 0) ? 'NO PICKUPS YET' : 'NO TICKETS',
      270,
      118,
      PAL.dgrey,
      { align: 'center' },
    );
  for (const { g, y } of rows) {
    const car = S.cars.get(g.carId);
    if (!car) continue;
    const f = g.wait / g.patience;
    const c =
      f < 0.45
        ? PAL.lime
        : f < 0.7
          ? PAL.yellow
          : f < 0.9
            ? PAL.orange
            : Math.floor(UI.t * 4) % 2
              ? PAL.red
              : PAL.crimson;
    R(223, y, 2, 8, c);
    drawIcon(ctx, 'ticket', 227, y + 2, PAL.yellow);
    drawText(ctx, String(g.ticket), 233, y + 2, PAL.white);
    const [m, mc] = TIER_MARK[g.tier];
    drawText(ctx, m, 247, y + 2, mc);
    const loc =
      car.loc.t === 'stall'
        ? stallName(car.loc.lane, car.loc.idx)
        : car.loc.t === 'temp'
          ? TEMPS[car.loc.i].name
          : '..';
    drawText(ctx, loc, 254, y + 2, PAL.lgrey);
    const fetching = S.jobs.some(j => j.type === 'fetch' && j.carId === g.carId && !j.aborted);
    if (fetching) drawText(ctx, 'FETCH', 316, y + 2, PAL.lime, { align: 'right' });
    else {
      if (car.loc.t === 'stall') {
        const d = liveDepth(car.loc.lane, car.loc.idx).best;
        drawText(ctx, 'D' + d, 268, y + 2, d ? PAL.orange : PAL.lime);
      }
      drawText(ctx, String(Math.floor(g.wait)), 316, y + 2, c, { align: 'right' });
    }
  }
  if (more) drawText(ctx, '+' + more + ' MORE', 270, 143, PAL.orange, { align: 'center' });
}
