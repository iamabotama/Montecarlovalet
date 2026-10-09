'use strict';
/* Snowmobiles (Swiss Alps signature). A share of the everyday guests (beater/standard/premium) ride up
   on snowmobiles instead of cars: they drive faster (park and fetch quicker), leave little snow trails,
   and show their own spoof brand names on the board. Passive: never "active", no banner, no cooldown.
   Core hooks: carCreated(car), vehicleSpeed(car), drawCar(car), carName(car).
   Tuning: EVENT_CONFIG.snowmobiles. */
const SNO = () => EVENT_CONFIG.snowmobiles;
const SNOW_TRAIL = []; // { x, y, t } fading dots behind moving snowmobiles
const SLED_COLORS = ['#e8322f', '#ffd23c', '#1fb5a8', '#2a2a30', '#ff7a00'];
const SLED_CACHE = new Map();
defineEvent('snowmobiles', {
  eligible: () => !!(HOTEL && HOTEL.theme && HOTEL.theme.weather === 'snow'),
  hooks: {
    carCreated(car) {
      if (SNO().tiers.includes(car.tier) && Math.random() < SNO().share) {
        car.sled = { color: rndi(0, SLED_COLORS.length - 1), name: rndi(0, SLED_MODELS.length - 1) };
      }
      return false;
    },
    vehicleSpeed: car => (car.sled ? SNO().speedMult : 0),
    carName: car => (car.sled ? SLED_MODELS[car.sled.name] : null),
    drawCar(car) {
      if (!car.sled) return false;
      const ridden = car.loc.t === 'moving' || car.loc.t === 'arriving' || car.loc.t === 'street' || !!car.mv;
      drawCarSprite(ctx, sledSprite(car.sled.color, car.dir, ridden), car.x, car.y);
      return true;
    },
  },
  idle: dt => sledTrails(dt),
  scenery: () => drawSledTrails(),
  debug: {
    SLEDS: () => {
      SNO().share = 1;
    },
  },
});
// Drop a snow puff behind every moving snowmobile; fade them out.
function sledTrails(dt) {
  for (const p of SNOW_TRAIL) p.t += dt;
  while (SNOW_TRAIL.length && SNOW_TRAIL[0].t > SNO().trailSec) SNOW_TRAIL.shift();
  for (const car of S.cars.values()) {
    if (!car.sled) continue;
    const moving = car.mv || car.loc.t === 'moving';
    const last = car.sled.lx === undefined ? null : [car.sled.lx, car.sled.ly];
    if (moving && (!last || Math.hypot(car.x - last[0], car.y - last[1]) > 2.5)) {
      const back = car.dir === 2 ? 6 : car.dir === 0 ? -6 : 0;
      const backY = car.dir === 1 ? -4 : car.dir === 3 ? 4 : 0;
      SNOW_TRAIL.push({ x: car.x + back, y: car.y + backY, t: 0 });
      car.sled.lx = car.x;
      car.sled.ly = car.y;
    }
  }
}
function drawSledTrails() {
  for (const p of SNOW_TRAIL) {
    ctx.globalAlpha = 0.7 * (1 - p.t / SNO().trailSec);
    R(p.x - 1, p.y - 1, 2, 2, PAL.white);
    R(p.x - 1, p.y + 2, 2, 1, PAL.lgrey);
  }
  ctx.globalAlpha = 1;
}
/* Top-down sled at CAR_RES detail, facing east: skis out front, coloured cowl + windscreen,
   seat, dark rubber track at the back; a helmeted rider while it is being driven. */
function sledSprite(color, dir, ridden) {
  const key = color + ':' + dir + ':' + (ridden ? 1 : 0);
  if (SLED_CACHE.has(key)) return SLED_CACHE.get(key);
  const k = CAR_RES,
    L = 15,
    Wd = 8;
  const horiz = dir === 0 || dir === 2;
  const cv = document.createElement('canvas');
  cv.width = (horiz ? L : Wd) * k;
  cv.height = (horiz ? Wd : L) * k;
  const c = cv.getContext('2d');
  // draw east-facing into an L x Wd box, then rotate for the other directions
  c.save();
  if (dir === 2) c.setTransform(-1, 0, 0, 1, L * k, 0);
  if (dir === 1) c.setTransform(0, 1, -1, 0, Wd * k, 0); // south
  if (dir === 3) c.setTransform(0, -1, 1, 0, 0, L * k); // north
  const r = (x, y, w, h, col) => {
    c.fillStyle = col;
    c.fillRect(x, y, w, h);
  };
  const H = Wd * k;
  r(30, 2, 15, 2, '#b8bcc4'); // skis
  r(30, H - 4, 15, 2, '#b8bcc4');
  r(43, 1, 2, 4, '#8a8e96');
  r(43, H - 5, 2, 4, '#8a8e96');
  r(2, 6, 16, H - 12, '#222226'); // rubber track
  for (let x = 3; x < 18; x += 3) r(x, 6, 1, H - 12, '#3a3a40');
  r(14, 5, 26, H - 10, SLED_COLORS[color]); // body
  r(14, 5, 26, 2, 'rgba(255,255,255,0.35)');
  r(28, 7, 5, H - 14, '#9fd0ff'); // windscreen
  r(16, 8, 10, H - 16, '#1a1a1a'); // seat
  if (ridden) {
    r(17, 6, 9, H - 12, '#c8102e'); // rider jacket
    r(19, 8, 5, H - 16, '#f4f4f0'); // helmet
    r(22, 9, 2, H - 18, '#243a5a'); // visor
  }
  c.restore();
  SLED_CACHE.set(key, cv);
  return cv;
}
