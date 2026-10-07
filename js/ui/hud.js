'use strict';
/* Top bar (money, clock, heat, cards) and bottom job-queue strip. */

function renderHUD() {
  R(0, 0, 320, 10, PAL.ink);
  drawText(ctx, fmtMoney(S.money), 2, 3, PAL.yellow);
  drawText(ctx, fmtClock(hourNow()), 38, 3, PAL.white);
  drawText(ctx, 'MANAGER', 72, 3, PAL.lgrey);
  const hf = S.heat / CONFIG.heat.max;
  const hc = hf < 0.5 ? PAL.lime : hf < 0.75 ? PAL.yellow : Math.floor(UI.t * 4) % 2 ? PAL.red : PAL.crimson;
  R(102, 2, 70, 6, PAL.asph3);
  R(102, 2, Math.round(70 * hf), 6, hc);
  RB(101, 1, 72, 8, PAL.lgrey);
  const n = slotsAllowed();
  for (let i = 0; i < CONFIG.power.maxSlots; i++) {
    const x = 178 + i * 12;
    const c = S.cards[i];
    if (i >= n) {
      R(x, 1, 9, 8, PAL.asph3);
      drawIcon(ctx, 'lock', x + 2, 2, PAL.dgrey);
      continue;
    }
    if (c) {
      const I = POWER_INFO[c.type];
      R(x, 1, 9, 8, I.color);
      drawText(ctx, I.short, x + 3, 3, PAL.ink);
      if (S.armed === i) RB(x - 1, 0, 11, 10, PAL.white);
    } else RB(x, 1, 9, 8, PAL.dgrey);
  }
  for (let i = 0; i < Math.min(S.stars, 4); i++) drawIcon(ctx, 'star', 240 + i * 6, 3, PAL.yellow);
  drawText(ctx, 'HI ' + fmtMoney(hotelHighScore(HOTEL.id)), 318, 3, PAL.lav, { align: 'right' });
  // bottom strip: queue
  R(0, 172, 320, 8, PAL.ink);
  drawText(
    ctx,
    S.helpers.length ? (S.activeW === 0 ? 'V1 YOU:' : 'V' + (S.helpers.indexOf(activeWorker()) + 2) + ':') : 'QUEUE:',
    2,
    174,
    S.helpers.length ? PAL.yellow : PAL.lgrey,
  );
  queueItems().forEach(q => {
    const car = S.cars.get(q.j.carId);
    const active = !!q.j.worker;
    drawText(ctx, q.label, q.x, 174, active ? PAL.lime : q.j.waitMsg ? PAL.orange : PAL.white);
    if (!q.j.type.startsWith('restow') || true) drawIcon(ctx, 'x', q.x + q.w + 2, 173, PAL.red);
    void car;
  });
  drawIcon(ctx, 'pause', 312, 173, PAL.white);
  drawIcon(ctx, Sound.muted ? 'spkoff' : 'spk', 298, 173, PAL.white);
  renderBoard();
  if (!S.tutorial || TUT_STEPS[TUT.i].crew) renderCrewPanel();
  renderPhasePill();
  const sel = S.selected && S.cars.get(S.selected.carId);
  if (sel) drawText(ctx, carName(sel), 222, 150, PAL.yellow);
  else if (S.armed !== null && S.cards[S.armed])
    drawText(ctx, POWER_INFO[S.cards[S.armed].type].name + ': TAP TARGET', 222, 150, PAL.white);
  if (canClockOut()) {
    R(226, 158, 88, 12, PAL.green);
    RB(226, 158, 88, 12, PAL.lime);
    drawText(ctx, 'CLOCK OUT EARLY', 270, 162, PAL.white, { align: 'center' });
  }
}
// Wave / break / last-call pill under the top bar, with time left and a progress bar.
function renderPhasePill() {
  const p = curPhase();
  if (!p) return;
  const i = phaseIndexAt(S.t),
    left = Math.max(0, Math.ceil(phaseLeftSec()));
  const label =
    p.kind === 'wave' ? 'WAVE ' + waveNumber(i) + '/' + waveCount() : p.kind === 'break' ? 'BREAK' : 'LAST CALL';
  const col = p.kind === 'break' ? PAL.lime : p.event || p.kind === 'last' ? PAL.pink : PAL.yellow;
  const time = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
  R(2, 12, 66, 10, PAL.ink);
  drawText(ctx, label, 4, 13, col);
  drawText(ctx, time, 66, 13, PAL.white, { align: 'right' });
  R(4, 19, Math.round(62 * (1 - phaseLeftSec() / p.sec)), 1, col);
}
function queueItems() {
  let x = S.helpers.length && S.activeW === 0 ? 32 : 28;
  const out = [];
  for (const j of S.jobs) {
    if (j.aborted || j.wid !== S.activeW) continue;
    const label = jobLabel(j);
    const w = textW(label);
    out.push({ j, label, x, w });
    x += w + 10;
    if (x > 280) break;
  }
  return out;
}
