'use strict';
/* End-of-shift summary (reads RESULT from sim/shift.js). */
defineScreen('summary', {
  buttons: () => [button(80, 160, 72, 'RETRY', startGame), button(168, 160, 72, 'TITLE', () => goScreen('title'))],
  render() {
    const r = RESULT;
    R(0, 0, 320, 180, PAL.night);
    drawText(ctx, r.kind === 'fired' ? 'FIRED' : 'CLOCKED OUT', 160, 8, r.kind === 'fired' ? PAL.red : PAL.lime, {
      align: 'center',
      scale: 2,
    });
    wrapText(
      r.kind === 'fired' ? 'THE MOMENT: ' + r.reason : 'YOU CLOCKED OUT AT ' + fmtClock(r.hour) + '. NICE NIGHT.',
      70,
    ).forEach((l, i) => drawText(ctx, l, 160, 24 + i * 7, PAL.white, { align: 'center' }));
    const s = r.st;
    const rows = [
      ['TOTAL EARNED', fmtMoney(r.money)],
      ['TIPS / PAY', fmtMoney(s.tips) + ' / ' + fmtMoney(s.pay)],
      ...(s.wages ? [['VALET WAGES', '-' + fmtMoney(s.wages)]] : []),
      ...(s.heli ? [['HELICOPTER VIP', s.heli]] : []),
      ['CARS PARKED', s.carsParked],
      ['WHALES SERVED', s.whalesServed],
      ['BIGGEST TIP', fmtMoney(s.biggestTip)],
      ['WORST GRAWLIX', s.longestWhaleName ? Math.round(s.longestWhaleWait) + 'S - ' + s.longestWhaleName : 'NONE'],
      ['TIME SURVIVED', Math.floor(r.t / 60) + 'M ' + Math.floor(r.t % 60) + 'S'],
      ['ANGRY / STOLEN', s.angry + ' / ' + s.stolen],
      ['CAREER XP', '+' + r.xp],
      ['HIGH SCORE', fmtMoney(SAVE.highScore)],
    ];
    rows.forEach(([a, b], i) => {
      drawText(ctx, a, 60, 42 + i * 10, PAL.lgrey);
      drawText(ctx, String(b), 260, 42 + i * 10, PAL.yellow, { align: 'right' });
    });
    if (r.isHigh && Math.floor(UI.t * 3) % 2) drawText(ctx, 'NEW HIGH SCORE!', 160, 146, PAL.pink, { align: 'center' });
    drawButtons(this.buttons());
  },
});
