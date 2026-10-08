'use strict';
/* Left panel: hire / send home. */

/* ---- crew panel (left, under the temp slots) ---- */
function crewButton() {
  const w = activeWorker();
  if (w.id !== 0) sendHome(w);
  else hireValet();
}
function renderCrewPanel() {
  const w = activeWorker();
  const full = S.helpers.length >= CONFIG.helpers.max;
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
  for (let i = 0; i < CONFIG.helpers.max; i++) R(6 + i * 7, 160, 5, 4, i < S.helpers.length ? PAL.red : PAL.dgrey);
}
