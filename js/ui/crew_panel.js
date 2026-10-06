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
  const poor = S.money < CONFIG.helpers.costPerHour;
  const home = w.id !== 0;
  const col = home ? PAL.orange : full || poor ? PAL.dgrey : PAL.lime;
  R(2, 124, 28, 44, PAL.ink);
  RB(2, 124, 28, 44, col);
  const lines = home
    ? ['V' + (S.helpers.indexOf(w) + 2), 'SEND', 'HOME', '']
    : full
      ? ['CREW', 'FULL', '', '']
      : ['HIRE', 'VALET', fmtMoney(CONFIG.helpers.costPerHour), '/HR'];
  lines.forEach((l, i) => drawText(ctx, l, 16, 127 + i * 7, i < 2 ? PAL.white : col, { align: 'center' }));
  for (let i = 0; i < CONFIG.helpers.max; i++) R(6 + i * 7, 160, 5, 4, i < S.helpers.length ? PAL.red : PAL.dgrey);
}
