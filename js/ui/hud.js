'use strict';
/* Top bar (money, clock, heat, cards) and bottom job-queue strip. */

function renderHUD() {
  R(0, 0, 320, 10, PAL.ink);
  drawText(ctx, fmtMoney(S.money), 2, 3, PAL.yellow);
  drawText(ctx, fmtClock(hourNow()), 38, 3, PAL.white);
  drawText(ctx, t('hud.manager'), 72, 3, PAL.lgrey);
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
  drawText(ctx, t('hud.hi', { money: fmtMoney(hotelHighScore(HOTEL.id)) }), 318, 3, PAL.lav, { align: 'right' });
  // bottom strip: queue
  R(0, 172, 320, 8, PAL.ink);
  drawText(ctx, queueLabel(), 2, 174, S.helpers.length ? PAL.yellow : PAL.lgrey);
  queueItems().forEach(q => {
    const active = !!q.j.worker;
    drawText(ctx, q.label, q.x, 174, active ? PAL.lime : q.j.waitMsg ? PAL.orange : PAL.white);
    drawIcon(ctx, 'x', q.x + q.w + 2, 173, PAL.red);
  });
  drawIcon(ctx, 'pause', 312, 173, PAL.white);
  drawIcon(ctx, Sound.muted ? 'spkoff' : 'spk', 298, 173, PAL.white);
  renderBoard();
  if (!S.tutorial || TUT_STEPS[TUT.i].crew) renderCrewPanel();
  renderPhasePill();
  const sel = S.selected && S.cars.get(S.selected.carId);
  if (sel) drawText(ctx, carName(sel), 222, 150, PAL.yellow);
  else if (S.armed !== null && S.cards[S.armed])
    drawText(ctx, t('hud.tapTarget', { power: POWER_INFO[S.cards[S.armed].type].name }), 222, 150, PAL.white);
  for (const b of phaseButtons()) {
    R(b.x, b.y, b.w, b.h, b.bg);
    if (!b.pulse || Math.floor(UI.t * 3) % 3) RB(b.x, b.y, b.w, b.h, b.border);
    drawText(ctx, b.label, b.x + b.w / 2, b.y + 3, PAL.white, { align: 'center' });
  }
}
/* Phase controls, stacked under the phase pill (top left): NEXT WAVE and CLOCK OUT on a break, END SHIFT
   once last call is over. One list feeds both the drawing above and the tap targets (ui/input.js). */
function phaseButtons() {
  if (S.tutorial || S.phase !== 'play') return [];
  const out = [];
  if (canCallNextWave())
    out.push({
      label: t('hud.nextWave', { money: fmtMoney(earlyCallBonus()) }),
      fn: callNextWave,
      bg: PAL.navy,
      border: PAL.yellow,
    });
  if (canClockOut()) out.push({ label: t('hud.clockOut'), fn: clockOut, bg: PAL.green, border: PAL.lime });
  if (canEndShift())
    out.push({ label: t('hud.endShift'), fn: endShiftNow, bg: PAL.wine, border: PAL.pink, pulse: true });
  const w = Math.max(66, ...out.map(b => textW(b.label) + 8)); // one width for the whole stack
  const y0 = bossLive() ? 34 : 23; // under the boss strip while a fight runs
  return out.map((b, i) => ({ ...b, x: 2, y: y0 + i * 11, w, h: 10 }));
}
// Wave / break / last-call pill under the top bar, with time left and a progress bar.
function renderPhasePill() {
  const p = curPhase();
  if (!p) return;
  const i = phaseIndexAt(S.t),
    left = Math.max(0, Math.ceil(phaseLeftSec()));
  const label =
    p.kind === 'wave'
      ? t('hud.wave', { n: waveNumber(i), total: waveCount() })
      : p.kind === 'break'
        ? t('hud.break')
        : t('hud.lastCall');
  const col = p.kind === 'break' ? PAL.lime : p.event || p.kind === 'last' ? PAL.pink : PAL.yellow;
  const time = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
  R(2, 12, 66, 10, PAL.ink);
  drawText(ctx, label, 4, 13, col);
  drawText(ctx, time, 66, 13, PAL.white, { align: 'right' });
  R(4, 19, Math.round(62 * (1 - phaseLeftSec() / p.sec)), 1, col);
  if (bossLive()) renderBossStrip();
}
// During a boss fight (sim/boss.js): BOSS plus one pip per leak still allowed, like lives in a tower defense.
function renderBossStrip() {
  const n = CONFIG.boss.maxLeaks,
    left = bossLeaksLeft();
  R(2, 23, 66, 10, PAL.ink);
  RB(2, 23, 66, 10, Math.floor(UI.t * 3) % 2 ? PAL.pink : PAL.wine);
  drawText(ctx, t('boss.pill'), 5, 26, PAL.pink, { maxW: 34 });
  for (let i = 0; i < n; i++) R(64 - (n - i) * 6, 26, 4, 4, i < left ? PAL.pink : PAL.dgrey);
}
// "Queue:" alone, or whose queue it is once there are helpers ("V1 You:", "V2:")
const queueLabel = () =>
  S.helpers.length
    ? S.activeW === 0
      ? t('hud.you')
      : t('hud.helper', { n: S.helpers.indexOf(activeWorker()) + 2 })
    : t('hud.queue');
// Queue entries left to right, starting after the label (its width varies by language). Also the tap targets.
function queueItems() {
  let x = 2 + textW(queueLabel()) + 5;
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
