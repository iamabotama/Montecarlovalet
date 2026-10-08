'use strict';
/* Autonomous car movement (arrivals/departures) and fire-lane checks. */

function updateMovers(dt) {
  for (const car of S.cars.values())
    if (car.mv) {
      const m = car.mv;
      const o = { x: car.x, y: car.y, pi: m.pi, dir: car.dir };
      const done = advanceAlong(o, m.pts, m.speed * dt);
      car.x = o.x;
      car.y = o.y;
      m.pi = o.pi;
      car.dir = o.dir;
      if (done) {
        car.mv = null;
        m.done();
      }
    }
  for (let i = 0; i < S.temps.length; i++) {
    const c = S.cars.get(S.temps[i].car);
    if (!c) continue;
    const over = S.t - c.tempSince - LOT.tempOverstaySec;
    if (over > 0) {
      c.tempHeatT += dt;
      if (c.tempHeatT >= LOT.tempOverstayEverySec) {
        c.tempHeatT = 0;
        addHeat(LOT.tempOverstayHeat, t('heat.fireLane'));
        floater(t('float.fireLane'), TEMPS[i].x, TEMPS[i].y - 8, PAL.red);
      }
    }
  }
}
