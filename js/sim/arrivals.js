'use strict';
/* Arrivals: guest creation, schedule, gala, street queue -> curb. */

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
function scheduleRow() {
  const rr = rampRow();
  if (rr) return rr;
  const h = hourNow();
  let row = CONFIG.arrivals.schedule[0];
  for (const r of CONFIG.arrivals.schedule) if (h >= r.fromHour) row = r;
  return row;
}
function spawnArrival(forceTier) {
  const row = scheduleRow();
  let mix = row.mix.map((w, i) => w * HOTEL.arrivals.mixMult[i]); // hotel crowd bias
  if (S.galaActive) {
    const hi = [3, 4, 5],
      sh = CONFIG.gala.highShare;
    const hs = hi.reduce((a, i) => a + mix[i], 0) || 1,
      ls = mix.reduce((a, w) => a + w, 0) - hs || 1;
    mix = mix.map((w, i) => (hi.includes(i) ? (w / hs) * sh : (w / ls) * (1 - sh)));
  }
  const tier = forceTier || TIERS[weightedIndex(mix)];
  const g = makeGuest(tier, rndi(0, MODELS[tier].length - 1));
  S.streetQueue.push(g.carId);
  return g;
}
function nextInterval() {
  if (S.galaActive) return rnd(...CONFIG.gala.interval);
  const r = scheduleRow();
  let iv = rnd(...r.interval);
  if (r.perHourDec) iv = Math.max(r.floor, iv - r.perHourDec * (hourNow() - r.fromHour));
  return rampRow() ? iv : iv * HOTEL.arrivals.intervalMult; // the learning ramp is the same everywhere
}
function updateArrivals(dt) {
  const rr = rampRow();
  if (rr && rr !== S.rampRow) {
    S.rampRow = rr;
    if (rr.banner) S.banners.push({ text: rr.banner, t: 3 });
  }
  if (!S.tutorial) {
    S.spawnT -= dt;
    if (S.spawnT <= 0) {
      spawnArrival();
      S.spawnT = nextInterval();
    }
  }
  const h = hourNow();
  if (!S.tutorial && !S.galaDone && h >= S.galaAt) {
    S.galaDone = true;
    S.galaActive = true;
    S.galaEnd = S.t + CONFIG.gala.durationSec;
    S.banners.push({ text: HOTEL.event.name + ' HAS BEGUN!', t: 3 });
    Sound.sfx('gala');
    S.spawnT = 1;
  }
  if (S.galaActive && S.t >= S.galaEnd) {
    S.galaActive = false;
    S.banners.push({ text: HOTEL.event.short + ' OVER', t: 2 });
    S.stats.eventsSurvived++;
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
