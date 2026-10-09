'use strict';
/* Career screen: the active character's rank, streak, awards wall and lifetime stats.
   Left: the medal grid (tap one for details). Right: the selected award, then lifetime numbers.
   Reads only; awards and streaks are earned in career/awards.js and career/streaks.js. */
const WALL = { x: 8, y: 46, cols: 6, w: 26, h: 26, gap: 2 }; // 6 x 4 = 24 medals
const awardTile = i => ({
  x: WALL.x + (i % WALL.cols) * (WALL.w + WALL.gap),
  y: WALL.y + Math.floor(i / WALL.cols) * (WALL.h + WALL.gap),
});
defineScreen('career', {
  enter() {
    UI.awardSel = 0;
    markAwardsSeen();
  },
  buttons: () => [
    ...AWARDS.map((a, i) => ({ ...awardTile(i), w: WALL.w, h: WALL.h, hidden: true, fn: () => (UI.awardSel = i) })),
    button(56, 162, 96, t('btn.back'), () => goScreen('title'), PAL.lgrey),
    button(
      168,
      162,
      96,
      skillPoints() ? t('career.skillsN', { n: skillPoints() }) : t('career.skills'),
      () => goScreen('skills'),
      skillPoints() ? PAL.pink : PAL.yellow,
    ),
  ],
  render() {
    const me = activeChar();
    R(0, 0, 320, 180, PAL.night);
    drawText(ctx, me.name ? t('career.titleNamed', { name: charName(me) }) : t('career.title'), 160, 4, PAL.yellow, {
      align: 'center',
      scale: 2,
    });
    drawCareerBar(8, 20, 304);
    const live = liveStreak(me);
    drawText(
      ctx,
      live > 1
        ? t('career.streak', { n: live, pct: Math.round((streakMult(live + 1) - 1) * 100) })
        : t('career.streakNone'),
      8,
      36,
      live > 1 ? PAL.tang : PAL.lgrey,
    );
    AWARDS.forEach((a, i) => {
      const p = awardTile(i);
      R(p.x, p.y, WALL.w, WALL.h, PAL.ink);
      if (i === UI.awardSel) RB(p.x, p.y, WALL.w, WALL.h, PAL.white);
      drawMedal(p.x + 6, p.y + 5, a, !!me.awards[a.id]);
    });
    renderAwardDetail(AWARDS[UI.awardSel] || AWARDS[0], me, 176, 46);
    renderLifetime(me, 176, 108);
    drawButtons(this.buttons());
  },
});

function renderAwardDetail(a, me, x, y) {
  const day = me.awards[a.id];
  const hidden = a.secret && !day;
  drawText(ctx, hidden ? t('career.secret') : t('award.' + a.id), x, y, day ? PAL.yellow : PAL.white, { maxW: 136 });
  drawText(
    ctx,
    t('career.tier' + a.tier) + ' - ' + t('career.reward', { xp: AWARD_XP[a.tier] }),
    x,
    y + 9,
    MEDAL_TIER[a.tier],
  );
  wrapText(hidden ? t('career.secretHint') : t('award.' + a.id + '.desc'), 136)
    .slice(0, 3)
    .forEach((l, i) => drawText(ctx, l, x, y + 19 + i * 8, PAL.lgrey));
  drawText(ctx, day ? t('career.earned', { day }) : t('career.locked'), x, y + 46, day ? PAL.lime : PAL.dgrey);
}
function renderLifetime(me, x, y) {
  drawText(ctx, t('career.lifetime'), x, y, PAL.yellow);
  const L = me.life;
  const rows = [
    [t('career.shifts'), me.totals.shifts],
    [t('career.parked'), L.carsParked || 0],
    [t('career.totalEarned'), fmtMoney(me.totals.earned)],
    [t('career.whales'), L.whalesServed || 0],
    [t('career.bestStreak'), me.streak.best],
    [t('career.awards'), awardsEarned(me) + '/' + AWARDS.length],
  ];
  rows.forEach(([k, v], i) => {
    drawText(ctx, k, x, y + 9 + i * 7, PAL.lgrey, { maxW: 96 });
    drawText(ctx, String(v), x + 136, y + 9 + i * 7, PAL.white, { align: 'right' });
  });
}
