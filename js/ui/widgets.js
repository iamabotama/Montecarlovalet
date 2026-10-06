'use strict';
/* Reusable menu widgets: buttons, full-screen text pages, fullscreen toggle. */
function button(x, y, w, label, fn, col = PAL.yellow) {
  return { x, y, w, h: 12, label, fn, col };
}
function drawButtons(bs) {
  for (const b of bs) {
    R(b.x, b.y, b.w, b.h, PAL.ink);
    RB(b.x, b.y, b.w, b.h, b.col);
    drawText(ctx, b.label, b.x + b.w / 2, b.y + 4, b.col, { align: 'center' });
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
