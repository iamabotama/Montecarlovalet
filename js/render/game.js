'use strict';
/* Draws one frame of the game world + overlays. */

/* ---- game render ---- */
function renderGame() {
  const shake = S.shake > 0 ? Math.round(rnd(-1, 1)) : 0;
  ctx.save();
  ctx.translate(shake, 0);
  drawWorldStatic();
  drawPad();
  drawPremiumStalls();
  tutWorldFx();
  // lot cars
  for (const car of S.cars.values())
    if (car.loc.t !== 'moving' && car.loc.t !== 'street' && car.loc.t !== 'away') drawCar(car); // away: its event draws it
  S.streetQueue.forEach((id, n) => {
    if (n < LOT.streetQueueMax) drawCar(S.cars.get(id));
  });
  if (S.streetQueue.length > LOT.streetQueueMax)
    drawText(ctx, '+' + (S.streetQueue.length - LOT.streetQueueMax), 2, 68, PAL.yellow);
  const v = S.valet;
  for (const w of workers()) if (w.inCar) drawCar(S.cars.get(w.inCar));
  drawEvents();
  // reserved (restow) stalls
  S.lanes.forEach((L, i) =>
    L.res.forEach((r, j) => {
      if (r !== null && L.cars[j] === null)
        RB(MAP.lotX + j * SW + 2, MAP.lotY + i * SH + 2, SW - 3, SH - 3, r === VIP_HOLD ? PAL.pink : PAL.dgrey);
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
  layoutCrowd(crowdMembers(), 1 / 60);
  const bubbles = [];
  for (const g of S.guests.values()) {
    const car = S.cars.get(g.carId);
    if (g.state === 'curbDrop' && isWhale(g.tier) && !g.claimed && car) {
      const f = 1 - g.claimT / CONFIG.power.rivalClaimSec;
      R(car.x - 7, car.y - 7, 14, 2, PAL.ink);
      R(car.x - 7, car.y - 7, Math.round(14 * f), 2, PAL.lav);
    }
    if (guestDrawn(g)) {
      const p = guestPose(g),
        gx = Math.round(g.x + crowdOff(g));
      drawPerson(ctx, gx + p.dx, g.y + p.dy, p.pose, p.cols, p.flip);
      if (g.state === 'handTicket') drawIcon(ctx, 'ticket', gx + 4, g.y + 3, PAL.yellow);
      if (g.stage === 5) R(gx + 5, g.y - 1, 2, 3, PAL.ink);
      const b = bubbleFor(g);
      if (b) bubbles.push({ x: gx + 1, y: g.y, b, order: g.stageAt || 0 });
    }
  }
  for (const n of S.npcs)
    drawPerson(ctx, Math.round(n.x + crowdOff(n)), n.y, 'walk', {
      h: PAL.ink,
      s: PAL.peach,
      c: n.kind === 'newbie' ? PAL.lime : PAL.lav,
      p: PAL.ink,
      k: PAL.ink,
      x: n.kind === 'newbie' ? PAL.lime : PAL.lav,
    });
  // valet
  const uni = valetColors();
  const crew = S.helpers.length > 0;
  for (const w of workers()) {
    const wx = w.x + (w.off || 0) + crowdOff(w);
    if (w === S.valet && !tutValetVisible()) continue;
    if (w.away) continue; // off-screen with an event
    if ((!w.inCar && S.phase !== 'fired') || (w === S.valet && S.phase === 'fired' && S.endT < 2))
      drawPerson(
        ctx,
        Math.round(wx - 2),
        Math.round(w.y - 8 + (w === S.valet ? tutValetOffset() : 0)),
        w.walking && Math.floor(UI.t * 8) % 2 ? 'walk' : 'idle',
        w === S.valet ? uni : { ...uni, h: PAL.brown },
        w.dir === 2,
      );
    if (w === S.valet && !w.inCar) drawNametag(Math.round(wx - 2), Math.round(w.y - 8 + tutValetOffset()));
    const hx = w.inCar ? w.x : wx,
      hy = w.inCar ? w.y - 4 : w.y;
    if (w.job && w.job.est > 0) {
      const f = clamp(w.job.elapsed / w.job.est, 0, 1);
      R(hx - 6, hy - 12, 12, 2, PAL.ink);
      R(hx - 6, hy - 12, Math.round(12 * f), 2, PAL.lime);
    }
    if (w.waitLabel === 'bags') drawIcon(ctx, 'cart', hx + 3, hy - 6, PAL.orange);
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
      if (w.leaving) drawText(ctx, t('crew.bye'), hx, hy - 24, PAL.lgrey, { align: 'center' });
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
  drawMessages();
  if (S.phase === 'fired' && S.endT > 1.2) {
    R(0, 60, 320, 50, PAL.ink);
    drawText(ctx, t('hud.fired'), 160, 66, PAL.red, { align: 'center', scale: 3, shadow: PAL.crimson });
    wrapText(S.firedLine, 239).forEach((l, i) => drawText(ctx, l, 160, 90 + i * 7, PAL.white, { align: 'center' }));
    const hy = 40 - (S.endT - 1.2) * 30;
    R(S.valet.x + (S.endT - 1.2) * 20, hy, 4, 2, PAL.red);
  }
  if (S.phase === 'clockout') {
    R(0, 66, 320, 30, PAL.ink);
    drawText(ctx, t('hud.shiftOver'), 160, 72, PAL.yellow, { align: 'center', scale: 3, shadow: PAL.orange });
  }
  tutRender();
  if (DEBUG.on) renderDebug();
}
// The player's look comes from the career cosmetics (data/cosmetics.js); helpers wear the same uniform.
function valetColors() {
  const U = UNIFORMS[SAVE.cosmetic.uniform] || UNIFORMS.red;
  return { h: PAL.ink, s: PAL.peach, c: U.shirt, p: PAL.ink, k: PAL.ink, x: U.hat, g: U.hands };
}
function drawNametag(x, y) {
  const tag = NAMETAGS[SAVE.cosmetic.nametag];
  if (tag && tag.color) R(x + 3, y + 4, 1, 1, tag.color);
}
// Guest states that are visible on the sidewalk (others are inside the hotel, in a car or queued off-screen).
const GUEST_DRAWN = new Set([
  'curbDrop',
  'handed',
  'leavingIn',
  'pickWalk',
  'handTicket',
  'toSpot',
  'pickWait',
  'pickBoard',
  'greeting',
]);
const guestDrawn = g => GUEST_DRAWN.has(g.state);
// Everyone on foot this frame, as render/crowd.js wants them (sprite left edge + drawn top + width),
// plus the podium as a fixed obstacle. A guest handing in a ticket is wider: the ticket sticks out.
const TICKET_HELD_W = 9;
function crowdMembers() {
  const out = [{ ref: null, k: -1, x: CONFIG.podium.x - 1, y: 33, w: 7, fixed: true }];
  for (const g of S.guests.values())
    if (guestDrawn(g)) out.push({ ref: g, k: g.id, x: g.x, y: g.y, w: g.state === 'handTicket' ? TICKET_HELD_W : 5 });
  S.npcs.forEach((n, i) => out.push({ ref: n, k: 1e6 + i, x: n.x, y: n.y }));
  for (const w of workers())
    if (!w.inCar && !(w === S.valet && !tutValetVisible()))
      out.push({ ref: w, k: 2e6 + w.id, x: w.x + (w.off || 0) - 2, y: w.y - 8 });
  const v = vipPos();
  if (v) out.push({ ref: S.heli, k: 3e6, x: v.x, y: v.y });
  return out;
}

/* Pop-up messages sit on scenery, never on the road or curb where events play out:
   banners on the hotel front (bottom edge stays above the sidewalk), toasts stacked upward from just
   above the queue bar. */
const MSG = { bannerX: 74, bannerW: 220, bannerBottom: 36, toastCx: 92, toastBottom: 170 }; // banner clears the wave timer; toasts over the lot, clear of the helipad
function drawMessages() {
  const b = S.banners[0]; // queued: one at a time, optional second line
  if (b) {
    const h = b.sub ? 21 : 14,
      y = MSG.bannerBottom - h;
    const cx = MSG.bannerX + MSG.bannerW / 2;
    R(MSG.bannerX, y, MSG.bannerW, h, PAL.ink);
    RB(MSG.bannerX, y, MSG.bannerW, h, PAL.yellow);
    drawText(ctx, b.text, cx, y + 5, PAL.yellow, { align: 'center' });
    if (b.sub) drawText(ctx, b.sub, cx, y + 13, PAL.white, { align: 'center' });
  }
  S.toasts.forEach((o, i) => {
    const w = textW(o.msg) + 8,
      y = MSG.toastBottom - 9 - i * 10,
      x = Math.max(2, Math.min(318 - w, Math.round(MSG.toastCx - w / 2)));
    R(x, y, w, 9, PAL.ink);
    RB(x, y, w, 9, PAL.red);
    drawText(ctx, o.msg, x + w / 2, y + 2, PAL.white, { align: 'center' });
  });
}
