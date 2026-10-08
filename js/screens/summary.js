'use strict';
/* End-of-shift summary (reads RESULT from sim/shift.js). Left: the shift. Right: goals + career. */
defineScreen('summary', {
  buttons: () => [
    button(8, 162, 96, t('summary.nextShift'), () => {
      UI.hotelSel = RESULT.hotel.id;
      goScreen('prep');
    }),
    button(112, 162, 96, t('summary.hotels'), () => goScreen('hotels')),
    button(216, 162, 96, t('summary.title'), () => goScreen('title'), PAL.lgrey),
  ],
  render() {
    const r = RESULT;
    R(0, 0, 320, 180, PAL.night);
    const fired = r.kind === 'fired';
    const title = fired ? t('summary.fired') : r.complete ? t('summary.complete') : t('summary.clockedOut');
    drawText(ctx, title, 160, 4, fired ? PAL.red : PAL.lime, { align: 'center', scale: 2 });
    const msg = fired
      ? t('summary.moment', { reason: r.reason })
      : r.complete
        ? t('summary.madeIt', { hotel: r.hotel.name, money: fmtMoney(CONFIG.shift.completeBonus) })
        : t('summary.left', { time: fmtClock(r.hour), n: r.st.wavesCleared, total: waveCount() });
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
    [t('summary.totalEarned'), fmtMoney(r.money)],
    [t('summary.tipsPay'), fmtMoney(s.tips) + ' / ' + fmtMoney(s.pay)],
    ...(s.wages ? [[t('summary.wages'), '-' + fmtMoney(s.wages)]] : []),
    ...(s.heliMet + s.heliMissed
      ? [[t('summary.helis'), t('summary.helisValue', { met: s.heliMet, missed: s.heliMissed })]]
      : []),
    [t('summary.carsParked'), s.carsParked],
    [t('summary.whales'), s.whalesServed],
    [t('summary.biggestTip'), fmtMoney(s.biggestTip)],
    [t('summary.angryStolen'), s.angry + ' / ' + s.stolen],
    [
      t('summary.time'),
      t('summary.timeValue', { m: Math.floor(r.t / 60), s: String(Math.floor(r.t % 60)).padStart(2, '0') }),
    ],
    [t('summary.best'), fmtMoney(r.highScore)],
    [t('summary.rating'), t('summary.stars', { n: r.stars })],
  ];
  rows.forEach(([a, b], i) => {
    drawText(ctx, a, x, y + i * 9, PAL.lgrey);
    drawText(ctx, String(b), x + 148, y + i * 9, PAL.yellow, { align: 'right' });
  });
  if (r.isHigh && Math.floor(UI.t * 3) % 2)
    drawText(ctx, t('summary.record'), x + 74, y + rows.length * 9 + 3, PAL.pink, { align: 'center' });
}
function renderCareerColumn(r, x, y) {
  drawText(ctx, t('summary.goals'), x, y, PAL.yellow);
  r.goals.forEach((g, i) => {
    const gy = y + 9 + i * 9;
    drawText(ctx, g.done ? '+' : '-', x, gy, g.done ? PAL.lime : PAL.red);
    drawText(ctx, g.text, x + 6, gy, g.done ? PAL.white : PAL.dgrey);
  });
  const cy = y + 14 + r.goals.length * 9;
  drawText(ctx, t('summary.careerXP'), x, cy, PAL.lgrey);
  drawText(ctx, '+' + r.xp, x + 144, cy, PAL.lime, { align: 'right' });
  drawCareerBar(x, cy + 11, 144);
  if (r.promotions.length) drawText(ctx, t('summary.promoted', { rank: rankName() }), x, cy + 24, PAL.pink);
}
