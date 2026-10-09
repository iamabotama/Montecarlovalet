'use strict';
/* Guest lifecycle: drop-off, pickup, patience stages, leaving. */

function departCar(car, kind) {
  // drive off-screen east; free its spot immediately
  removeCarFromWorld(car);
  car.loc = { t: 'leaving' };
  const sx = car.x,
    sy = car.y;
  const pts =
    sy <= MAP.curbY + 2
      ? [
          [MAP.mouthR, MAP.curbY],
          [MAP.mouthR, MAP.streetY],
          [340, MAP.streetY],
        ]
      : [
          [sx, MAP.streetY],
          [340, MAP.streetY],
        ];
  car.mv = { pts, pi: 0, speed: 70, done: () => S.cars.delete(car.id) };
  void kind;
}
function guestGone(g) {
  g.state = 'gone';
  const si = S.spots.indexOf(g.id);
  if (si >= 0) S.spots[si] = null;
  S.guests.delete(g.id);
}
function removeQueuedJobsFor(carId) {
  for (const j of S.jobs.slice()) if (j.carId === carId && !j.worker) S.jobs.splice(S.jobs.indexOf(j), 1);
  const a = S.valet.job;
  if (a && a.carId === carId && !a.carMoved) {
    a.aborted = true;
    releaseJob(a);
  }
}
function reachCarAtCurb(car, g, bags) {
  g.state = 'handed';
  g.claimed = true;
  if (isWhale(g.tier)) {
    const T = CONFIG.tiers[g.tier];
    let tip = jackpot(
      g,
      Math.round(hotelTip(rnd(...T.arrivalTip)) * Math.max(0, 1 - g.wait / g.patience)) * (bags ? 2 : 1),
    );
    if (tip > 0) {
      earn(tip, 'tip', g);
      if (g.stage <= CONFIG.heat.repairMaxStage) repairHeat(tip * CONFIG.heat.repairPerDollar);
    }
  }
}
function greetLimo(car, g) {
  earn(CONFIG.pay.limo, 'pay', g);
  earn(hotelTip(rndi(...CONFIG.tiers.limo.greetTip)), 'tip', g);
  S.stats.limos++;
  departCar(car);
  guestGone(g);
}
function carAtCurbForPickup(car, g, k) {
  car.loc = { t: 'curb', k };
  car.dir = 0;
  g.state = 'pickBoard';
  g.boardX = MAP.curbX[k] - 2;
  const T = CONFIG.tiers[g.tier];
  const w = g.wait;
  if (isWhale(g.tier)) {
    S.stats.whalesServed++;
    if (w > S.stats.longestWhaleWait) {
      S.stats.longestWhaleWait = w;
      S.stats.longestWhaleName = carName(car);
    }
  }
  if (g.comped) {
    floater(t('float.comped'), g.x, g.y - 6, PAL.red);
    S.stats.comped++;
  } else {
    earn(CONFIG.pay[g.tier], 'pay', g);
    const base = hotelTip(rndi(...T.pickupTip));
    const f = isWhale(g.tier)
      ? Math.max(0, 1 - (CONFIG.tips.whalePickupDecayPer10s * w) / 10)
      : 1 - (1 - CONFIG.tips.otherDecayFloor) * clamp(w / g.patience, 0, 1);
    const tip = jackpot(g, Math.round(base * f));
    if (tip > 0) earn(tip, 'tip', g);
  }
}
function leaveAngry(g, why) {
  const car = S.cars.get(g.carId);
  S.stats.angry++;
  floater(t('float.hmph'), g.x, g.y - 6, PAL.red);
  removeQueuedJobsFor(g.carId);
  const T = CONFIG.tiers[g.tier];
  const heat = g.tier === 'limo' ? T.ignoredHeat : T.angryHeat;
  addHeat(heat, t('heat.' + why, { car: carName(car) }), g.x, g.y);
  const qi = S.streetQueue.indexOf(car.id);
  if (qi >= 0) S.streetQueue.splice(qi, 1);
  if (isParked(car)) {
    removeCarFromWorld(car);
    S.cars.delete(car.id);
  } else departCar(car);
  guestGone(g);
}
function stageOf(g) {
  const f = g.wait / g.patience;
  if (f >= 1) return isWhale(g.tier) ? 5 : 4;
  return f < 0.2 ? 0 : f < 0.45 ? 1 : f < 0.7 ? 2 : f < 0.9 ? 3 : 4;
}
function bubbleLine(g, st) {
  const posh = isWhale(g.tier);
  if (st === 1) return pick(tlist(posh ? 'lines.poshMurmur' : 'lines.murmur'));
  if (st === 2) return pick(tlist(posh ? 'lines.poshAnnoyed' : 'lines.annoyed'));
  return '';
}
const WAITING = new Set(['queued', 'curbDrop', 'toSpot', 'pickWait']);
function updateGuests(dt) {
  for (const g of [...S.guests.values()]) {
    const car = S.cars.get(g.carId);
    if (WAITING.has(g.state)) {
      if (g.ignoreT > 0) g.ignoreT -= dt;
      else if (!S.tutorial) g.wait += dt;
      const st = stageOf(g);
      if (st !== g.stage) {
        if (st > g.stage) {
          Sound.sfx(st >= 4 ? 'grawlix' : 'blip', st);
          if (st === 4) S.stats.grawlix++;
        }
        g.stage = st;
        g.line = bubbleLine(g, st);
        g.stageAt = S.t;
      }
      if (g.wait >= g.patience) {
        if (isWhale(g.tier)) {
          g.over += dt;
          if (g.phase === 'pick') g.comped = true;
          const T = CONFIG.tiers[g.tier];
          const rate = T.escalateStart + T.escalateStep * Math.floor(g.over / T.escalateEverySec);
          addHeat(
            rate * dt,
            t(g.phase === 'pick' ? 'heat.waitedPickup' : 'heat.waitedCurb', {
              car: carName(car),
              sec: Math.round(g.wait),
            }),
          );
          if (Math.random() < dt * 2) S.shake = 0.15;
        } else if (g.phase === 'pick') {
          const a = S.jobs.find(x => x.worker && x.type === 'fetch' && x.carId === g.carId && x.carMoved);
          if (a) {
            if (!g.comped) {
              g.comped = true;
              addHeat(CONFIG.tiers[g.tier].angryHeat, t('heat.waitedTooLong', { car: carName(car) }));
            }
          } else leaveAngry(g, 'tookCab');
          continue;
        } else {
          leaveAngry(g, g.tier === 'limo' ? 'limoIgnored' : 'gaveUp');
          continue;
        }
      }
    }
    if (g.state === 'curbDrop' && isWhale(g.tier) && !g.claimed) {
      g.claimT += dt;
      if (S.jobs.some(j => j.type === 'park' && j.carId === g.carId)) g.claimed = true;
      else if (g.claimT >= CONFIG.power.rivalClaimSec) {
        S.stats.stolen++;
        floater(t('float.stolen'), g.x, g.y - 6, PAL.lav);
        Sound.sfx('steal');
        S.npcs.push({ kind: 'senior', x: MAP.curbX[car.loc.k] - 2, y: 34, t: 1 });
        departCar(car);
        guestGone(g);
        continue;
      }
    }
    if (g.state === 'handed' || g.state === 'leavingIn') {
      g.state = 'leavingIn';
      const tx = MAP.standX - 2;
      g.x += Math.sign(tx - g.x) * Math.min(Math.abs(tx - g.x), SPD.guestWalkPxSec * dt);
      if (Math.abs(g.x - tx) < 1) {
        g.state = 'inside';
        g.stay = S.tutorial ? 1e9 : rnd(CONFIG.stay.minSec, CONFIG.stay.maxSec);
      }
    } else if (g.state === 'inside') {
      g.stay -= dt * stayRate();
      if (g.stay <= 0 && car && isParked(car) && pickupsActive() < maxPickups()) {
        g.state = 'pickWalk';
        g.phase = 'pick';
        g.wait = 0;
        g.over = 0;
        g.stage = 0;
        g.patience = CONFIG.tiers[g.tier].pickPatience * patienceMult();
        g.x = MAP.standX - 2;
      }
    } else if (g.state === 'pickWalk') {
      const tx = CONFIG.podium.x - 6;
      g.x += Math.sign(tx - g.x) * Math.min(Math.abs(tx - g.x), SPD.guestWalkPxSec * dt);
      if (Math.abs(g.x - tx) < 1) {
        g.state = 'handTicket';
        g.handT = CONFIG.podium.handSec;
      }
    } else if (g.state === 'handTicket') {
      g.handT -= dt;
      if (g.handT <= 0) {
        g.ticket = S.ticketNo++;
        g.ticketAt = S.t;
        floater(t('float.ticket', { n: g.ticket }), CONFIG.podium.x + 2, 30, PAL.yellow);
        Sound.sfx('blip', 3);
        const si = S.spots.indexOf(null);
        if (si >= 0) S.spots[si] = g.id;
        g.spotX = si >= 0 ? SPOTS[si] - 2 : CONFIG.podium.x + 6 + rndi(0, 6);
        g.state = 'toSpot';
      }
    } else if (g.state === 'toSpot' || g.state === 'pickWait') {
      const tx = g.spotX;
      g.x += Math.sign(tx - g.x) * Math.min(Math.abs(tx - g.x), SPD.guestWalkPxSec * dt);
      if (Math.abs(g.x - tx) < 1) g.state = 'pickWait';
    } else if (g.state === 'pickBoard') {
      const tx = g.boardX;
      g.x += Math.sign(tx - g.x) * Math.min(Math.abs(tx - g.x), SPD.guestWalkPxSec * 2 * dt);
      if (Math.abs(g.x - tx) < 1) {
        departCar(car);
        guestGone(g);
      }
    }
  }
}
