'use strict';
/* Transient feedback: toasts, floating text, particles. */

function toast(msg) {
  if (msg) S.toasts.push({ msg, t: CONFIG.fx.toastSec });
}
// An event's big moment, shown in the message dock (ui/messages.js) above toasts and banners.
function shout(who, text, sec) {
  S.shout = { who, text, t: sec };
}
function floater(text, x, y, color) {
  S.floaters.push({ text, x, y, color, t: 1.4 });
}
function puff(car) {
  S.particles.push({ x: car.x, y: car.y, vx: rnd(-6, 6), vy: rnd(-8, -2), t: 0.5, c: PAL.lgrey });
}
