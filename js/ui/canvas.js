'use strict';
/* Canvas, UI/DEBUG state and primitive draw helpers. */

const cv = document.getElementById('c'),
  ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;
const UI = { screen: 'title', paused: false, howPage: 0, confirmReset: false, t: 0 };
const DEBUG = {
  alwaysEvents: false, // debug ODDS:ALL: every event rolls 1 in 1 and ignores the cooldown
  on: false, // debug strip shown (top bar)
  open: false, // full debug panel expanded under the strip
  enabled: CONFIG.debug || /[?&]debug=1/.test(location.search),
  scale: 1,
  hit: false,
  pct: true,
  grant: 0,
};
const R = (x, y, w, h, c) => {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
};
const RB = (x, y, w, h, c) => {
  R(x, y, w, 1, c);
  R(x, y + h - 1, w, 1, c);
  R(x, y, 1, h, c);
  R(x + w - 1, y, 1, h, c);
};
function drawCar(car) {
  drawCarSprite(ctx, carSprite(car.tier, car.mi, car.dir), car.x, car.y);
}
