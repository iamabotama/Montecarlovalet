'use strict';
/* Draws one frame of the game world + overlays. */

/* ---- game render ---- */
function renderGame() {
  const shake = S.shake > 0 ? Math.round(rnd(-1, 1)) : 0;
  ctx.save();
  ctx.translate(shake, 0);
  drawWorldStatic();
  drawPad();
  tutWorldFx();
  // lot cars
  for (const car of S.cars.values()) if (car.loc.t !== 'moving' && car.loc.t !== 'street') drawCar(car);
  S.streetQueue.forEach((id, n) => {
    if (n < LOT.streetQueueMax) drawCar(S.cars.get(id));
  });
  if (S.streetQueue.length > LOT.streetQueueMax)
    drawText(ctx, '+' + (S.streetQueue.length - LOT.streetQueueMax), 2, 68, PAL.yellow);
  const v = S.valet;
  for (const w of workers()) if (w.inCar) drawCar(S.cars.get(w.inCar));
  // reserved (restow) stalls
  S.lanes.forEach((L, i) =>
    L.res.forEach((r, j) => {
      if (r !== null && L.cars[j] === null) RB(MAP.lotX + j * SW + 2, MAP.lotY + i * SH + 2, SW - 3, SH - 3, PAL.dgrey);
    }),
  );
  // podium
  {
    const px = CONFIG.podium.x;
    R(px, 35, 5, 8, PAL.brown);
    R(px + 1, 36, 3, 6, PAL.rust);
    R(px - 1, 34, 7, 2, PAL.yellow);
    R(px + 1, 33, 3, 1, PAL.white);
  }
  // claim timers & tickets
  const bubbles = [];
  for (const g of S.guests.values()) {
    const car = S.cars.get(g.carId);
    if (g.state === 'curbDrop' && isWhale(g.tier) && !g.claimed && car) {
      const f = 1 - g.claimT / CONFIG.power.rivalClaimSec;
      R(car.x - 7, car.y - 7, 14, 2, PAL.ink);
      R(car.x - 7, car.y - 7, Math.round(14 * f), 2, PAL.lav);
    }
    if (
      [
        'curbDrop',
        'handed',
        'leavingIn',
        'pickWalk',
        'handTicket',
        'toSpot',
        'pickWait',
        'pickBoard',
        'greeting',
      ].includes(g.state)
    ) {
      const p = guestPose(g);
      drawPerson(ctx, Math.round(g.x + p.dx), g.y + p.dy, p.pose, p.cols, p.flip);
      if (g.state === 'handTicket') drawIcon(ctx, 'ticket', g.x + 5, g.y + 3, PAL.yellow);
      if (g.stage === 5) R(g.x + 5, g.y - 1, 2, 3, PAL.ink);
      const b = bubbleFor(g);
      if (b) bubbles.push({ x: g.x + 1, y: g.y, b, order: g.stageAt || 0 });
    }
  }
  for (const n of S.npcs)
    drawPerson(ctx, n.x, n.y, 'walk', {
      h: PAL.ink,
      s: PAL.peach,
      c: n.kind === 'newbie' ? PAL.lime : PAL.lav,
      p: PAL.ink,
      k: PAL.ink,
      x: n.kind === 'newbie' ? PAL.lime : PAL.lav,
    });
  // valet
  const uni = { h: PAL.ink, s: PAL.peach, c: PAL.red, p: PAL.ink, k: PAL.ink, x: PAL.red };
  const crew = S.helpers.length > 0;
  for (const w of workers()) {
    const wx = w.x + (w.off || 0);
    if (w === S.valet && !tutValetVisible()) continue;
    if ((!w.inCar && S.phase !== 'fired') || (w === S.valet && S.phase === 'fired' && S.endT < 2))
      drawPerson(
        ctx,
        Math.round(wx - 2),
        Math.round(w.y - 8 + (w === S.valet ? tutValetOffset() : 0)),
        w.walking && Math.floor(UI.t * 8) % 2 ? 'walk' : 'idle',
        w === S.valet ? uni : { ...uni, h: PAL.brown },
        w.dir === 2,
      );
    const hx = w.inCar ? w.x : wx,
      hy = w.inCar ? w.y - 4 : w.y;
    if (w.job && w.job.est > 0) {
      const f = clamp(w.job.elapsed / w.job.est, 0, 1);
      R(hx - 6, hy - 12, 12, 2, PAL.ink);
      R(hx - 6, hy - 12, Math.round(12 * f), 2, PAL.lime);
    }
    if (w.waitLabel === 'BAGS') drawIcon(ctx, 'cart', hx + 3, hy - 6, PAL.orange);
    if (S.boost.hustle > 0 || S.boost.coffee > 0) R(hx - 3, hy + 1, 1, 1, PAL.yellow);
    if (crew) {
      const tag = w.id === 0 ? '1' : String(S.helpers.indexOf(w) + 2);
      const act = w.id === S.activeW;
      if (act) {
        const by = hy - 22 + (Math.floor(UI.t * 3) % 2);
        R(hx - 1, by, 3, 1, PAL.yellow);
        R(hx, by + 1, 1, 1, PAL.yellow);
      }
      R(hx - 2, hy - 19, 5, 7, act ? PAL.yellow : PAL.ink);
      drawText(ctx, tag, hx, hy - 18, act ? PAL.ink : PAL.white, { align: 'center' });
      if (w.leaving) drawText(ctx, 'BYE', hx, hy - 24, PAL.lgrey, { align: 'center' });
    }
  }
  drawVip();
  drawHeli();
  // manager
  if (S.manager || S.phase === 'fired') {
    const mx = S.phase === 'fired' ? 156 - Math.min(20, S.endT * 15) : 156;
    drawPerson(ctx, mx, 29, 'idle', { h: PAL.lgrey, s: PAL.peach, c: PAL.ink, p: PAL.ink, k: PAL.ink });
    if (S.manager) bubbles.push({ x: mx + 1, y: 29, b: { text: S.manager.line, kind: 'w' }, order: 1e9 });
  }
  drawBubbles(bubbles);
  drawWeather();
  for (const p of S.particles) R(p.x, p.y, 1, 1, p.c);
  for (const f of S.floaters) drawText(ctx, f.text, f.x, f.y, f.color, { align: 'center', shadow: PAL.ink });
  renderSelection();
  ctx.restore();
  renderHUD();
  if (S.meltdown && Math.floor(UI.t * 4) % 2) {
    RB(0, 0, 320, 180, PAL.red);
    RB(1, 1, 318, 178, PAL.red);
  }
  for (const b of S.banners) {
    R(60, 64, 200, 14, PAL.ink);
    RB(60, 64, 200, 14, PAL.yellow);
    drawText(ctx, b.text, 160, 69, PAL.yellow, { align: 'center' });
  }
  S.toasts.forEach((o, i) => {
    const w = textW(o.msg) + 8;
    R(160 - w / 2, 124 + i * 10, w, 9, PAL.ink);
    RB(160 - w / 2, 124 + i * 10, w, 9, PAL.red);
    drawText(ctx, o.msg, 160, 126 + i * 10, PAL.white, { align: 'center' });
  });
  if (S.phase === 'fired' && S.endT > 1.2) {
    R(0, 60, 320, 50, PAL.ink);
    drawText(ctx, "YOU'RE FIRED!", 160, 66, PAL.red, { align: 'center', scale: 3, shadow: PAL.crimson });
    wrapText(S.firedLine, 60).forEach((l, i) => drawText(ctx, l, 160, 90 + i * 7, PAL.white, { align: 'center' }));
    const hy = 40 - (S.endT - 1.2) * 30;
    R(S.valet.x + (S.endT - 1.2) * 20, hy, 4, 2, PAL.red);
  }
  if (S.phase === 'clockout') {
    R(0, 66, 320, 30, PAL.ink);
    drawText(ctx, 'SHIFT OVER', 160, 72, PAL.yellow, { align: 'center', scale: 3, shadow: PAL.orange });
  }
  tutRender();
  if (DEBUG.on) renderDebug();
}
