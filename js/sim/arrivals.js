'use strict';
/* Arrivals: guest creation, spawning on the current wave's pace, street queue -> curb. */

const GUEST_COLORS = {
  beater: [PAL.khaki, PAL.olive, PAL.dgrey],
  standard: [PAL.blue, PAL.green, PAL.lav],
  premium: [PAL.navy, PAL.mauve, PAL.lgrey],
  whale: [PAL.white, PAL.cream, PAL.pink],
  ultra: [PAL.yellow, PAL.white, PAL.peach],
  limo: [PAL.ink, PAL.white],
};
function makeGuest(tier, mi) {
  const car = { id: nid(), tier, mi, x: -14, y: MAP.streetY, dir: 0, loc: { t: 'street' } };
  const g = {
    id: nid(),
    tier,
    carId: car.id,
    state: 'queued',
    wait: 0,
    patience: dropPatience(tier),
    stage: 0,
    over: 0,
    comped: false,
    ignoreT: 0,
    claimT: 0,
    claimed: false,
    x: 0,
    y: 34,
    colors: {
      h: pick([PAL.brown, PAL.ink, PAL.yellow, PAL.lgrey]),
      s: pick([PAL.peach, PAL.khaki, PAL.brown]),
      c: pick(GUEST_COLORS[tier]),
      p: PAL.navy,
      k: PAL.ink,
    },
    heatAcc: 0,
  };
  car.guestId = g.id;
  S.cars.set(car.id, car);
  S.guests.set(g.id, g);
  return g;
}
function prefillLot() {
  for (let n = 0; n < LOT.prefilledCars; n++) {
    const tier = TIERS[weightedIndex(CONFIG.arrivals.prefillMix)];
    const g = makeGuest(tier, rndi(0, MODELS[tier].length - 1));
    const car = S.cars.get(g.carId);
    for (let tries = 0; tries < 30; tries++) {
      const l = rndi(0, NL - 1),
        s = pick(LOT_SIDES);
      const e = entryIndex(l, s);
      if (e) {
        placeInStall(car, l, e.idx);
        break;
      }
    }
    g.state = 'inside';
    g.stay = rnd(CONFIG.stay.prefillMinSec, CONFIG.stay.prefillMaxSec);
  }
}
function spawnArrival(forceTier) {
  const mix = arrivalMix().map((w, i) => w * HOTEL.arrivals.mixMult[i]); // hotel crowd bias
  const tier = forceTier || eventHook('arrivalTier') || TIERS[weightedIndex(mix)];
  const g = makeGuest(tier, rndi(0, MODELS[tier].length - 1));
  S.streetQueue.push(g.carId);
  return g;
}
// Pace and mix come from the current wave (sim/waves.js); breaks and last call have no arrivals.
function updateArrivals(dt) {
  if (!S.tutorial) {
    S.spawnT -= dt;
    if (S.spawnT <= 0) {
      const iv = nextInterval();
      if (iv === null) S.spawnT = 0.5;
      else {
        spawnArrival();
        S.spawnT = iv;
      }
    }
  }
  // street queue -> curb
  if (S.streetQueue.length) {
    const k = freeCurb();
    if (k >= 0) {
      const car = S.cars.get(S.streetQueue.shift());
      const g = S.guests.get(car.guestId);
      S.curb[k].car = car.id;
      g.state = 'arriving';
      car.loc = { t: 'arriving', k };
      car.mv = {
        pts: [
          [MAP.mouthL, MAP.streetY],
          [MAP.mouthL, MAP.curbY],
          [MAP.curbX[k], MAP.curbY],
        ],
        pi: 0,
        speed: 60,
        done: () => {
          car.loc = { t: 'curb', k };
          car.dir = 0;
          g.state = 'curbDrop';
          g.x = MAP.curbX[k] - 2;
          Sound.sfx('honk', isWhale(car.tier) ? 1.5 : car.tier === 'limo' ? 0.8 : 1);
        },
      };
    }
  }
  S.streetQueue.forEach((id, n) => {
    const c = S.cars.get(id);
    const tx = n < LOT.streetQueueMax ? MAP.queueX[n] : -20;
    if (c.x < tx) c.x = Math.min(tx, c.x + 50 * (1 / 60));
  });
}
