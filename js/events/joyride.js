'use strict';
/* Valet joyride. When a HIRED valet (never you) starts driving a whale/ultra car to park, he sometimes
   can't resist: wheels screech, the car spins out at the curb, fishtails and tears off the east end
   of the road. ~30 s later it comes flying in from the west to a chiptune, lands hard, skids into a
   sloppy 180, and he drives it to the stall he was always meant to use (the original park job resumes).
   While the car is away the owner may come out for it: his patience drains fast and you take heat.
   Core hook: parkDriveStart(worker, car, job, step) in world/runner.js. Tuning: EVENT_CONFIG.joyride. */
const JR = () => EVENT_CONFIG.joyride;
const JOY = { forceNext: false, autoParkCar: null }; // debug helpers
const jrStreetY = () => MAP.streetY + 4;

defineEvent('joyride', {
  hooks: {
    parkDriveStart(w, car, job, step) {
      if (w.id === 0 || !isWhale(car.tier) || !eventCanStart('joyride')) return false;
      if (!JOY.forceNext && Math.random() >= eventChance('joyride')) return false;
      JOY.forceNext = false;
      jrStart(w, car, step);
      return true;
    },
  },
  idle: () => jrDebugAutoPark(),
  update: (ev, dt) => jrUpdate(ev, dt),
  draw: ev => jrDraw(ev),
  cleanup: ev => jrResume(ev),
  debug: {
    RIDE: () => jrDebugRide(),
  },
});

function jrStart(w, car, step) {
  const ev = startEvent('joyride', {
    stage: 'spin',
    st: 0,
    wid: w.id,
    carId: car.id,
    step,
    marks: [],
    ownerHit: false,
  });
  w.away = true; // the runner holds this valet until jrResume
  w.inCar = null; // the event draws the car itself
  car.loc = { t: 'away' };
  ev.x = car.x;
  ev.y = car.y;
  ev.dir = car.dir;
  ev.alt = 0;
  addHeat(JR().heat, t('event.joyride.heat'), car.x, car.y);
  eventBanner(t('event.joyride.banner', { name: w.name }));
  Sound.sfx('screech');
  return ev;
}
function jrWorker(ev) {
  return S.helpers.find(w => w.id === ev.wid) || null;
}
function jrMark(ev) {
  if (ev.marks.length < 40) ev.marks.push([Math.round(ev.x), Math.round(ev.y + 2)]);
}
// Move toward (tx, ty) at speed px/s; true on arrival.
function jrMove(ev, tx, ty, speed, dt) {
  const dx = tx - ev.x,
    dy = ty - ev.y,
    d = Math.hypot(dx, dy),
    step = speed * dt;
  if (d <= step) {
    ev.x = tx;
    ev.y = ty;
    return true;
  }
  ev.x += (dx / d) * step;
  ev.y += (dy / d) * step;
  ev.dir = dirOf(dx, dy);
  return false;
}
// Drive a list of waypoints one leg at a time (ev.leg); true when the last one is reached.
function jrRoute(ev, pts, speed, dt) {
  ev.leg = ev.leg || 0;
  while (ev.leg < pts.length && jrMove(ev, pts[ev.leg][0], pts[ev.leg][1], speed, dt)) ev.leg++;
  return ev.leg >= pts.length;
}
function jrStage(ev, stage) {
  ev.stage = stage;
  ev.st = 0;
  ev.leg = 0;
}
function jrUpdate(ev, dt) {
  const c = JR(),
    sy = jrStreetY();
  ev.st += dt;
  const car = S.cars.get(ev.carId);
  if (!car) return endEvent();
  jrOwnerWaiting(ev, car, dt);
  switch (ev.stage) {
    case 'spin': // burnout at the curb: the car spins on the spot
      ev.dir = Math.floor(ev.st * 10) % 4;
      if (Math.random() < 0.6) puff(ev);
      jrMark(ev);
      if (ev.st >= c.spinSec) jrStage(ev, 'exit');
      break;
    case 'exit': // out through the east mouth onto the street
      if (
        jrRoute(
          ev,
          [
            [MAP.mouthR, MAP.curbY],
            [MAP.mouthR, sy],
          ],
          70,
          dt,
        )
      ) {
        Sound.sfx('screech');
        jrStage(ev, 'fishtail');
      }
      break;
    case 'fishtail': {
      // accelerate east, swinging the tail
      const speed = 60 + 260 * ev.st;
      ev.x += speed * dt;
      ev.y = sy + Math.sin(ev.st * 16) * 3 * Math.max(0, 1 - ev.st / 1.5);
      ev.dir = Math.sin(ev.st * 16) > 0.6 ? 1 : Math.sin(ev.st * 16) < -0.6 ? 3 : 0;
      if (Math.random() < 0.5) puff(ev);
      if (ev.st < 1.2) jrMark(ev);
      if (ev.x > 340) jrStage(ev, 'gone');
      break;
    }
    case 'gone':
      if (ev.st >= c.awaySec) {
        Object.assign(ev, { x: -30, y: sy - c.flyAlt, dir: 0, alt: c.flyAlt });
        Sound.sfx('flytune');
        jrStage(ev, 'fly');
      }
      break;
    case 'fly': {
      // swoops in from the west and comes down on the road
      const f = Math.min(1, ev.st / c.flySec);
      ev.x = -30 + (c.landX + 30) * f;
      ev.alt = c.flyAlt * (1 - f * f);
      ev.y = sy;
      ev.dir = 0;
      if (f >= 1) {
        Sound.sfx('thud');
        S.shake = 0.3;
        jrStage(ev, 'land');
      }
      break;
    }
    case 'land': // two hard bounces
      ev.alt = Math.abs(Math.sin(ev.st * 18)) * 4 * Math.max(0, 1 - ev.st / 0.4);
      if (ev.st >= 0.4) {
        ev.alt = 0;
        Sound.sfx('screech');
        jrStage(ev, 'skid');
      }
      break;
    case 'skid': {
      // sloppy 180: slides on east while turning to face west
      const f = Math.min(1, ev.st / c.skidSec);
      ev.x = c.landX + 28 * Math.sin((f * Math.PI) / 2);
      ev.dir = [0, 1, 1, 2, 2][Math.min(4, Math.floor(f * 5))];
      if (Math.random() < 0.6) puff(ev);
      jrMark(ev);
      if (f >= 1) jrStage(ev, 'back');
      break;
    }
    case 'back': // west to the mouth, up to the curb, then hand the car back to the valet's park job
      if (jrRoute(ev, [[MAP.mouthL, sy], [MAP.mouthL, MAP.curbY], ev.step.pts[0]], 50, dt)) jrResume(ev);
      break;
  }
}
// The owner came out for his car while it was away: fast drain, plus heat once.
function jrOwnerWaiting(ev, car, dt) {
  const g = S.guests.get(car.guestId);
  if (!g || !WAITING.has(g.state) || ev.stage === 'back') return;
  g.wait += dt * (JR().ownerDrain - 1);
  if (!ev.ownerHit) {
    ev.ownerHit = true;
    addHeat(JR().ownerHeat, t('event.joyride.owner'), g.x, g.y);
    toast(t('event.joyride.owner'));
  }
}
// Give the car back to the valet's original park job (also used by debug END EV).
function jrResume(ev) {
  const car = S.cars.get(ev.carId),
    w = jrWorker(ev),
    st = ev.step;
  if (car && w && w.job && w.job.steps[w.job.si] === st) {
    const [x, y] = st.pts[0];
    Object.assign(car, { x, y, loc: { t: 'moving' } });
    Object.assign(w, { away: false, inCar: car.id, x, y, pi: 1 });
    st.ph = 1; // straight to driving: he is already in the car
    toast(t('event.joyride.back', { name: w.name }));
  } else if (car && st.onEnd) {
    st.onEnd(); // the valet was sent home meanwhile: the car still ends up in its stall
    if (w) w.away = false;
  }
  if (activeEvent('joyride')) endEvent();
}
function jrDraw(ev) {
  for (const [x, y] of ev.marks) R(x, y, 2, 1, PAL.dgrey);
  if (ev.stage === 'gone') return;
  const car = S.cars.get(ev.carId);
  if (!car) return;
  if (ev.alt > 0.5) {
    ctx.globalAlpha = 0.35;
    R(ev.x - 7, ev.y + 2, 14, 2, PAL.ink); // shadow on the road
    ctx.globalAlpha = 1;
  }
  drawCarSprite(ctx, carSprite(car.tier, car.mi, ev.dir), ev.x, ev.y - ev.alt);
}
/* ---- debug: RIDE hires a helper if needed, sends in a whale and has the helper park it (forced) ---- */
function jrDebugRide() {
  if (!S.helpers.length) {
    S.money += 1000;
    hireValet();
  }
  const h = S.helpers[0];
  if (!h) return;
  S.activeW = h.id;
  JOY.forceNext = true;
  JOY.autoParkCar = spawnArrival('whale').carId;
}
function jrDebugAutoPark() {
  const car = JOY.autoParkCar != null && S.cars.get(JOY.autoParkCar);
  if (!car) return;
  const g = S.guests.get(car.guestId);
  if (car.loc.t !== 'curb' || !g || g.state !== 'curbDrop' || S.jobs.some(j => j.carId === car.id)) return;
  for (let l = 0; l < NL; l++)
    for (const s of LOT_SIDES)
      if (entryIndex(l, s, pendingParks(l, s))) {
        enqueue({ type: 'park', carId: car.id, lane: l, side: s });
        JOY.autoParkCar = null;
        return;
      }
}
