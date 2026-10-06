'use strict';
/* Transient feedback: toasts, floating text, particles. */

function toast(msg) {
  if (msg) S.toasts.push({ msg, t: CONFIG.fx.toastSec });
}
function floater(text, x, y, color) {
  S.floaters.push({ text, x, y, color, t: 1.4 });
}
function puff(car) {
  S.particles.push({ x: car.x, y: car.y, vx: rnd(-6, 6), vy: rnd(-8, -2), t: 0.5, c: PAL.lgrey });
}
