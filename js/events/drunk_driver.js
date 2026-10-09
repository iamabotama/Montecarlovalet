'use strict';
/* Drunk driver. A whale/ultra pickup is sometimes tipsy: he hiccups while he waits (tap him to call a
   cab instead). Otherwise, handed his keys, he swerves off and hits the pole by the east lot entrance.
   Scene: the east end of the lot is closed (cars there are dug out the west way), everyone is more
   patient, and you have two jobs: walk the dazed driver inside, and call the cops at the podium.
   Cops arrive (siren + lights), then a tow truck hauls the car away and the road reopens.
   Both jobs done by you = bonus. Tuning: EVENT_CONFIG.drunkDriver (data/events.js). */
const DD = () => EVENT_CONFIG.drunkDriver;
function ddSite() {
  const ax = aisleX('east'),
    y = MAP.streetY + 7;
  return { ax, y, poleX: ax + 22, carX: ax + 13, driverX: ax - 2, copX: ax - 20 };
}
const ddDrunkGuest = () => [...S.guests.values()].find(g => g.drunk);

defineEvent('drunkDriver', {
  eligible: () => LOT_BASE_SIDES.includes('east'),
  get waitRate() {
    return DD().waitRate;
  },
  hooks: {
    pickupStart(g) {
      if (
        isWhale(g.tier) &&
        !ddDrunkGuest() &&
        eventCanStart('drunkDriver') &&
        (g.forceDrunk || Math.random() < eventChance('drunkDriver'))
      ) {
        g.drunk = true;
        g.wobble = true;
        g.hicT = 1;
      }
    },
    tapGuest(g) {
      if (!g.drunk) return false;
      ddCallCab(g);
      return true;
    },
    handOver(car, g) {
      if (!g.drunk || !eventCanStart('drunkDriver')) return false;
      ddCrash(car, g);
      return true;
    },
  },
  idle(dt) {
    for (const g of S.guests.values())
      if (g.drunk && WAITING.has(g.state) && (g.hicT -= dt) <= 0) {
        g.hicT = DD().hicEverySec;
        floater(t('event.drunk.hic'), g.x + 3, g.y - 8, PAL.pink);
        Sound.sfx('hic');
      }
  },
  update: ddUpdate,
  draw: ddDraw,
  targets: ddTargets,
  // debug buttons (ui/debug.js): the warning stage, or straight to the crash
  debug: {
    DRUNK: () => ddDebugGuest(),
    CRASH: () => {
      const g = ddDebugGuest();
      if (!g) return;
      ddCrash(S.cars.get(g.carId), g);
      guestGone(g);
    },
  },
  cleanup(ev) {
    S.cars.delete(ev.carId);
    for (const g of S.guests.values()) g.drunk = g.wobble = false;
  },
  scenery() {
    const s = ddSite();
    R(s.poleX, s.y - 17, 2, 18, PAL.brown); // telephone pole
    R(s.poleX - 3, s.y - 15, 8, 1, PAL.brown);
  },
});

/* ---- debug: a whale parked in the first free stall, walking out for pickup right now, tipsy ---- */
function ddDebugGuest() {
  for (let l = 0; l < NL; l++)
    for (const s of LOT_SIDES) {
      const e = entryIndex(l, s);
      if (!e) continue;
      const g = makeGuest('whale', 0);
      placeInStall(S.cars.get(g.carId), l, e.idx);
      g.forceDrunk = true;
      g.state = 'pickWalk';
      g.phase = 'pick';
      g.wait = g.over = g.stage = 0;
      g.patience = CONFIG.tiers[g.tier].pickPatience * patienceMult();
      g.x = MAP.standX - 2;
      eventHook('pickupStart', g);
      return g;
    }
  console.warn('debug: lot full, no stall for the drunk whale');
  return null;
}

/* ---- the warning: call a cab ---- */
function ddCallCab(g) {
  const car = S.cars.get(g.carId);
  if (!car || S.jobs.some(j => j.carId === car.id && j.carMoved)) {
    toast(t('event.drunk.tooLate'));
    Sound.sfx('deny');
    return;
  }
  removeQueuedJobsFor(car.id);
  removeCarFromWorld(car);
  puff(car);
  S.cars.delete(car.id);
  floater(t('event.drunk.cab'), g.x, g.y - 10, PAL.yellow);
  coolHeat(DD().cabHeatRelief);
  S.stats.cabs = (S.stats.cabs || 0) + 1;
  Sound.sfx('whistle');
  guestGone(g);
}

/* ---- the crash ---- */
function ddCrash(car, g) {
  const s = ddSite();
  departCar(car); // frees the curb; we then steer it into the pole instead of off-screen
  const ev = startEvent('drunkDriver', {
    phase: 'swerve',
    carId: car.id,
    colors: { ...g.colors },
    driver: null,
    sceneT: 0,
    copsCalled: false,
    copETA: -1,
    towT: -1,
    hookT: -1,
    byYou: { driver: false, cops: false },
  });
  const sy = MAP.streetY;
  car.mv.pts = [
    [MAP.mouthR, MAP.curbY],
    [MAP.mouthR, sy],
    [MAP.mouthR + 10, sy - 3],
    [MAP.mouthR + 20, sy + 3],
    [s.carX - 14, sy - 2],
    [s.carX, s.y - 1],
  ];
  car.mv.pi = 0;
  car.mv.speed = 60;
  car.mv.done = () => ddOnCrash(ev, car);
  S.stats.drunkCrashes = (S.stats.drunkCrashes || 0) + 1;
}
function ddOnCrash(ev, car) {
  const s = ddSite();
  ev.phase = 'scene';
  S.shake = 0.4;
  Sound.sfx('crash');
  puff(car);
  blockSide('east');
  ev.driver = { x: s.driverX, y: s.y - 9, state: 'dazed' };
  eventBanner(t('event.drunk.crash'));
  toast(t('event.drunk.rightClosed'));
}

/* ---- the player's two jobs ---- */
function ddHelpDriver(ev) {
  const s = ddSite();
  errand({
    to: pointLoc(s.driverX - 6, s.y, [s.ax, MAP.streetY]),
    sec: 0.8,
    label: 'help',
    labelKey: 'event.drunk.help',
    tag: 'dd:driver',
    onArrive: w => {
      if (activeEvent('drunkDriver') === ev && ev.driver.state === 'dazed') {
        ev.driver.state = 'follow';
        ev.followW = w;
      }
    },
    onBack: () => {
      if (ev.driver.state !== 'follow') return;
      ev.driver.state = 'walkIn';
      ev.byYou.driver = true;
      floater(t('event.drunk.safe'), MAP.standX, MAP.standY - 14, PAL.lime);
    },
  });
}
function ddCallCops(ev) {
  errand({
    to: { t: 'stand' },
    sec: DD().phoneSec,
    label: 'phone',
    labelKey: 'event.drunk.phone',
    tag: 'dd:cops',
    back: false,
    onArrive: () => {
      if (activeEvent('drunkDriver') !== ev || ev.copsCalled) return;
      ev.byYou.cops = true;
      ddDispatchCops(ev);
      floater(t('event.drunk.called'), CONFIG.podium.x, MAP.standY - 14, PAL.lime);
    },
  });
}
function ddDispatchCops(ev) {
  ev.copsCalled = true;
  ev.copETA = DD().copsDelaySec;
}
function ddTargets(ev, add) {
  if (ev.phase !== 'scene') return;
  const d = ev.driver;
  if (d.state === 'dazed' && !errandPending('dd:driver')) add(d.x - 4, d.y - 2, 10, 13, 4, () => ddHelpDriver(ev));
  if (!ev.copsCalled && !errandPending('dd:cops'))
    add(CONFIG.podium.x - 5, MAP.standY - 12, 11, 16, 4, () => ddCallCops(ev));
}

/* ---- the scene, step by step ---- */
function ddUpdate(ev, dt) {
  if (ev.phase !== 'scene') return;
  const C = DD(),
    s = ddSite(),
    d = ev.driver;
  ev.sceneT += dt;
  // the driver
  if (d.state === 'dazed' && !errandPending('dd:driver') && ev.sceneT > C.driverHelpSec) {
    addHeat(C.ignoreDriverHeat, t('event.drunk.leftAlone'), d.x, d.y);
    d.state = 'walkIn';
  } else if (d.state === 'follow') {
    const w = ev.followW;
    if (!w || !w.job || w.job.tag !== 'dd:driver') d.state = 'dazed';
    else {
      d.x += clamp(w.x + 5 - d.x, -60 * dt, 60 * dt);
      d.y += clamp(w.y - d.y, -60 * dt, 60 * dt);
    }
  } else if (d.state === 'walkIn') {
    const tx = MAP.standX + 6,
      ty = MAP.standY - 6;
    d.x += clamp(tx - d.x, -20 * dt, 20 * dt);
    d.y += clamp(ty - d.y, -20 * dt, 20 * dt);
    if (Math.abs(tx - d.x) < 1 && Math.abs(ty - d.y) < 1) d.state = 'inside';
  }
  // the cops
  if (!ev.copsCalled && !errandPending('dd:cops') && ev.sceneT > C.callCopsSec) {
    addHeat(C.ignoreCopsHeat, t('event.drunk.noCall'), CONFIG.podium.x, MAP.standY);
    ddDispatchCops(ev);
  }
  if (ev.copETA > 0 && (ev.copETA -= dt) <= 0) {
    const cop = spawnService(
      ev,
      'police',
      [
        [-20, s.y],
        [s.copX, s.y],
      ],
      70,
      () => {
        sirenOff();
        ev.towT = C.towDelaySec;
      },
    );
    cop.lights = true;
    ev.cop = cop;
    sirenOn();
  }
  // the tow truck
  if (ev.towT > 0 && (ev.towT -= dt) <= 0)
    ev.tow = spawnService(
      ev,
      'tow',
      [
        [340, s.y],
        [s.carX + 17, s.y],
      ],
      55,
      () => (ev.hookT = C.hookSec),
    );
  if (ev.hookT > 0 && (ev.hookT -= dt) <= 0) {
    const car = S.cars.get(ev.carId);
    ev.tow.tows = car;
    Sound.sfx('engine');
    driveService(ev.tow, [[360, s.y]], 40, v => {
      v.gone = true;
      S.cars.delete(ev.carId);
      ev.cop.lights = false;
      driveService(ev.cop, [[360, s.y]], 70, c => {
        c.gone = true;
        ddFinish(ev);
      });
    });
  }
}
function ddFinish(ev) {
  const C = DD();
  const both = ev.byYou.driver && ev.byYou.cops;
  if (both) {
    earn(C.bonus, 'tip', { x: CONFIG.podium.x, y: MAP.standY });
    coolHeat(C.bonusHeatRelief);
    eventBanner(t('event.drunk.clearedBonus', { money: fmtMoney(C.bonus) }));
  } else eventBanner(t('event.drunk.cleared'));
  S.stats.drunkHandled = (S.stats.drunkHandled || 0) + (both ? 1 : 0);
  endEvent();
}

/* ---- drawing ---- */
function ddDraw(ev) {
  if (ev.phase !== 'scene') return;
  const s = ddSite(),
    car = S.cars.get(ev.carId),
    d = ev.driver;
  // cones across the east entrance
  for (let i = 0; i < 3; i++) {
    R(s.ax - 1, MAP.lotY - 3 + i * 4 - 8, 2, 3, PAL.orange);
    R(s.ax - 2, MAP.lotY - 1 + i * 4 - 8, 4, 1, PAL.white);
  }
  // steam from the bonnet
  if (car && !(ev.tow && ev.tow.tows))
    for (let i = 0; i < 3; i++) {
      const off = (UI.t * 8 + i * 4) % 12;
      ctx.globalAlpha = 0.7 - off / 18;
      R(car.x + 6 + i, car.y - 4 - off, 2, 2, PAL.lgrey);
    }
  ctx.globalAlpha = 1;
  // the driver (dizzy stars while dazed)
  if (d.state !== 'inside') {
    const wob = d.state === 'follow' ? 0 : Math.round(Math.sin(UI.t * 3) * 1.5);
    const walking = d.state !== 'dazed';
    drawPerson(
      ctx,
      Math.round(d.x + wob),
      Math.round(d.y),
      walking && Math.floor(UI.t * 6) % 2 ? 'walk' : 'idle',
      ev.colors,
      false,
    );
    if (d.state === 'dazed')
      for (let i = 0; i < 3; i++) {
        const a = UI.t * 5 + i * 2.1;
        R(Math.round(d.x + 3 + Math.cos(a) * 4), Math.round(d.y - 2 + Math.sin(a) * 1.5), 1, 1, PAL.yellow);
      }
  }
  // what to tap
  const blink = Math.floor(UI.t * 3) % 2;
  if (blink && d.state === 'dazed' && !errandPending('dd:driver'))
    drawText(ctx, t('event.drunk.helpTag'), d.x + 3, d.y - 9, PAL.yellow, { align: 'center' });
  if (blink && !ev.copsCalled && !errandPending('dd:cops'))
    drawText(ctx, t('event.drunk.callTag'), CONFIG.podium.x, MAP.standY - 19, PAL.yellow, { align: 'center' });
}
