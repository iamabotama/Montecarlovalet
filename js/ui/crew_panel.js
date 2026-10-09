'use strict';
/* Left panel: hire / send home, plus the valet number buttons (1 = you, 2-4 = helpers; tap or Tab to select). */

/* ---- crew panel (left, under the temp slots) ---- */
function crewButton() {
  const w = activeWorker();
  if (w.id !== 0) sendHome(w);
  else hireValet();
}
function renderCrewPanel() {
  const w = activeWorker();
  const full = S.helpers.length >= helperCap();
  const next = hireCandidate();
  const poor = S.money < memberWage(next);
  const home = w.id !== 0;
  const col = home ? PAL.orange : full || poor ? PAL.dgrey : PAL.lime;
  R(2, 124, 28, 44, PAL.ink);
  RB(2, 124, 28, 44, col);
  const lines = home
    ? [w.name, t('crew.send'), t('crew.home'), t('crew.level', { n: memberLevel(memberById(w.memberId)) + 1 })]
    : full
      ? [t('crew.crew'), t('crew.full'), '', '']
      : [t('crew.hire'), next.name, fmtMoney(memberWage(next)), t('crew.perHour')];
  lines.forEach((l, i) => drawText(ctx, l, 16, 127 + i * 7, i < 2 ? PAL.white : col, { align: 'center', maxW: 26 }));
  for (const b of crewTabs()) {
    const sel = b.w && b.w.id === S.activeW;
    const col = !b.w ? PAL.dgrey : sel ? PAL.ink : b.w.job ? PAL.lime : PAL.white;
    if (sel) R(b.x, b.y, b.w_, b.h, PAL.yellow);
    else RB(b.x, b.y, b.w_, b.h, b.w ? PAL.lgrey : PAL.dgrey);
    drawText(ctx, String(b.n), b.x + b.w_ / 2, b.y + 2, col, { align: 'center' });
  }
}
// One small button per crew slot along the bottom of the panel; b.w is the valet in that slot (or null).
function crewTabs() {
  const ws = workers();
  return Array.from({ length: CONFIG.helpers.max + 1 }, (_, i) => ({
    n: i + 1,
    w: ws[i] && !ws[i].leaving ? ws[i] : null,
    x: 4 + i * 6,
    y: 156,
    w_: 6,
    h: 10,
  }));
}
// Tab: select the next valet on duty.
function cycleWorker() {
  const ws = workers().filter(w => !w.leaving);
  const i = ws.findIndex(w => w.id === S.activeW);
  if (ws.length > 1) selectWorker(ws[(i + 1) % ws.length]);
}
