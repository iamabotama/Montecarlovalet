'use strict';
/* Reusable menu widgets: buttons, full-screen text pages, fullscreen toggle. */
function button(x, y, w, label, fn, col = PAL.yellow) {
  return { x, y, w, h: 12, label, fn, col };
}
// Buttons with hidden:true are hit areas only (the screen draws them itself, e.g. hotel cards).
function drawButtons(bs) {
  for (const b of bs) {
    if (b.hidden) continue;
    R(b.x, b.y, b.w, b.h, PAL.ink);
    RB(b.x, b.y, b.w, b.h, b.col);
    drawText(ctx, b.label, b.x + b.w / 2, b.y + 4, b.col, { align: 'center', lang: b.lang, maxW: b.w - 2 });
  }
}
function renderText(title, lines) {
  R(0, 0, 320, 180, PAL.night);
  drawText(ctx, title, 160, 20, PAL.yellow, { align: 'center', scale: 2, shadow: PAL.orange });
  lines.forEach((l, i) => drawText(ctx, l, 160, 50 + i * 10, PAL.white, { align: 'center' }));
}
function goFullscreen() {
  const el = document.documentElement;
  const f = el.requestFullscreen || el.webkitRequestFullscreen;
  if (f)
    try {
      f.call(el);
    } catch (e) {
      /* not supported */
    }
}
// Rank name + XP progress toward the next rank.
function drawCareerBar(x, y, w) {
  const nr = nextRank(),
    cur = RANKS[activeChar().rank].xp;
  const f = nr ? clamp((activeChar().xp - cur) / (nr.xp - cur), 0, 1) : 1;
  drawText(ctx, rankName(), x, y, PAL.white);
  drawText(
    ctx,
    nr ? t('career.xp', { xp: activeChar().xp, next: nr.xp }) : t('career.xpMax', { xp: activeChar().xp }),
    x + w,
    y,
    PAL.lav,
    {
      align: 'right',
    },
  );
  R(x, y + 6, w, 2, PAL.dgrey);
  R(x, y + 6, Math.round(w * f), 2, PAL.lime);
}
// Three stars centred on cx, `n` of them lit.
function drawStars(cx, y, n) {
  for (let i = 0; i < 3; i++) drawIcon(ctx, 'star', cx - 10 + i * 7, y, i < n ? PAL.yellow : PAL.dgrey);
}
