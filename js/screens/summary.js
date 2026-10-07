'use strict';
/* End-of-shift summary (reads RESULT from sim/shift.js). Left: the shift. Right: goals + career. */
defineScreen('summary', {
  buttons: () => [
    button(8, 162, 96, 'NEXT SHIFT', () => {
      UI.hotelSel = RESULT.hotel.id;
      goScreen('prep');
    }),
    button(112, 162, 96, 'HOTELS', () => goScreen('hotels')),
    button(216, 162, 96, 'TITLE', () => goScreen('title'), PAL.lgrey),
  ],
  render() {
    const r = RESULT;
    R(0, 0, 320, 180, PAL.night);
    const fired = r.kind === 'fired';
    const title = fired ? 'FIRED' : r.complete ? 'SHIFT COMPLETE' : 'CLOCKED OUT';
    drawText(ctx, title, 160, 4, fired ? PAL.red : PAL.lime, { align: 'center', scale: 2 });
    const msg = fired
      ? 'THE MOMENT: ' + r.reason
      : r.complete
        ? 'YOU MADE IT TO MIDNIGHT AT ' +
          r.hotel.name +
          '. FULL-SHIFT BONUS ' +
          fmtMoney(CONFIG.shift.completeBonus) +
          '.'
        : 'YOU LEFT AT ' + fmtClock(r.hour) + ' AFTER WAVE ' + r.st.wavesCleared + ' OF ' + waveCount() + '.';
    wrapText(msg.trim(), 76)
      .slice(0, 2)
      .forEach((l, i) => drawText(ctx, l, 160, 19 + i * 7, PAL.white, { align: 'center' }));
    renderShiftColumn(r, 8, 36);
    renderCareerColumn(r, 168, 36);
    drawButtons(this.buttons());
  },
});

function renderShiftColumn(r, x, y) {
  const s = r.st;
  const rows = [
    ['TOTAL EARNED', fmtMoney(r.money)],
    ['TIPS / PAY', fmtMoney(s.tips) + ' / ' + fmtMoney(s.pay)],
    ...(s.wages ? [['VALET WAGES', '-' + fmtMoney(s.wages)]] : []),
    ...(s.heliMet + s.heliMissed ? [['VIP HELICOPTERS', s.heliMet + ' MET / ' + s.heliMissed + ' MISSED']] : []),
    ['CARS PARKED', s.carsParked],
    ['WHALES SERVED', s.whalesServed],
    ['BIGGEST TIP', fmtMoney(s.biggestTip)],
    ['ANGRY / STOLEN', s.angry + ' / ' + s.stolen],
    ['TIME SURVIVED', Math.floor(r.t / 60) + 'M ' + String(Math.floor(r.t % 60)).padStart(2, '0') + 'S'],
    ['HOTEL BEST', fmtMoney(r.highScore)],
    ['RATING', r.stars + ' / 3 STARS'],
  ];
  rows.forEach(([a, b], i) => {
    drawText(ctx, a, x, y + i * 9, PAL.lgrey);
    drawText(ctx, String(b), x + 148, y + i * 9, PAL.yellow, { align: 'right' });
  });
  if (r.isHigh && Math.floor(UI.t * 3) % 2)
    drawText(ctx, 'NEW HOTEL RECORD!', x + 74, y + rows.length * 9 + 3, PAL.pink, { align: 'center' });
}
function renderCareerColumn(r, x, y) {
  drawText(ctx, "TONIGHT'S GOALS", x, y, PAL.yellow);
  r.goals.forEach((g, i) => {
    const gy = y + 9 + i * 9;
    drawText(ctx, g.done ? '+' : '-', x, gy, g.done ? PAL.lime : PAL.red);
    drawText(ctx, g.text, x + 6, gy, g.done ? PAL.white : PAL.dgrey);
  });
  const cy = y + 14 + r.goals.length * 9;
  drawText(ctx, 'CAREER XP', x, cy, PAL.lgrey);
  drawText(ctx, '+' + r.xp, x + 144, cy, PAL.lime, { align: 'right' });
  drawCareerBar(x, cy + 11, 144);
  if (r.promotions.length) drawText(ctx, 'PROMOTED TO ' + rankName(), x, cy + 24, PAL.pink);
}
