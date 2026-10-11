'use strict';
/* Run state S: created fresh by newRun() for every shift. */

/* ------------------------------ RUN STATE ------------------------------ */
let S = null;
function hourNow() {
  return CONFIG.clock.startHour + S.t / CONFIG.clock.realSecPerGameHour;
}
// opts: { loadout: [powerupIds], goals: [{id, done}], perks, rematch } - chosen on the shift-prep screen.
// rematch: start just before the boss wave (sim/boss.js) instead of at 6 PM; banked as practice.
function newRun(opts = {}) {
  S = {
    t: 0,
    money: 0,
    heat: 0,
    stars: 0,
    cards: [],
    cardSeq: 0,
    warned: {},
    cars: new Map(),
    guests: new Map(),
    nextId: 1,
    lanes: Array.from({ length: NL }, () => ({ cars: Array(NS).fill(null), res: Array(NS).fill(null) })),
    temps: TEMPS.map(() => ({ car: null, res: null })),
    prem: newPremState(),
    curb: MAP.curbX.map(() => ({ car: null, res: null })),
    streetQueue: [],
    jobs: [],
    spots: SPOTS.map(() => null),
    valet: {
      id: 0,
      speed: 1,
      x: MAP.standX,
      y: MAP.standY,
      loc: { t: 'stand' },
      job: null,
      dir: 1,
      walking: false,
      inCar: null,
      stepT: 0,
      anim: 0,
    },
    crewLog: [],
    vipHold: null, // RESERVED power-up, sim/reserved.js
    helpers: [],
    activeW: 0,
    nextWid: 1,
    heli: newHeliState(),
    boss: newBossState(), // sim/boss.js
    spawnT: CONFIG.arrivals.firstSec,
    phaseI: -1, // index into CONFIG.shift.phases (sim/waves.js)
    shiftComplete: false,
    floaters: [],
    particles: [],
    toasts: [],
    banners: [],
    shout: null,
    comps: newCompsState(),
    perks: opts.perks || {}, // skill perks snapshot for this shift (career/skills.js skillPerks, read via sim/perks.js)
    shake: 0,
    events: newEventsState(),
    manager: null,
    phase: 'play',
    endT: 0,
    boost: { hustle: 0, coffee: 0, spareKeys: 0 },
    lastHeatReason: t('heat.default'),
    ticketNo: 1,
    heatFloat: 0,
    meltdown: false,
    npcs: [],
    selected: null,
    armed: null,
    lotFullFlash: 0,
    stats: {
      carsParked: 0,
      whalesServed: 0,
      biggestTip: 0,
      longestWhaleWait: 0,
      longestWhaleName: '',
      tips: 0,
      pay: 0,
      angry: 0,
      waved: 0,
      stolen: 0,
      limos: 0,
      comped: 0,
      grawlix: 0,
      wages: 0,
      heliMet: 0,
      heliMissed: 0,
      eventsSurvived: 0,
      wavesCleared: 0,
      bossTries: 0, // 1 once the boss fight started (sim/boss.js)
      bossWon: 0, // 1 when it was beaten
      earlyCalls: 0, // breaks cut short with NEXT WAVE (sim/waves.js)
      earlySec: 0, // break seconds skipped that way
      unparked: 0, // arriving cars that left without being parked (waved, sent away, stolen, gave up)
      everyCar: 0, // 1 when the night was completed with unparked === 0
      marks: {}, // event tallies for awards: every event start under its id, plus eventMark(key)
    },
  };
  S.goals = opts.goals || [];
  for (const type of (opts.loadout || CONFIG.career.defaultLoadout).slice(0, CONFIG.career.loadoutCap))
    grantCard(type, true);
  prefillLot();
  if (opts.rematch && S.boss) startAtBossWave();
}
function startAtBossWave() {
  const i = S.boss.waveI;
  S.rematch = true;
  S.t = phaseStart(i);
  S.phaseI = i - 1; // the next tick enters the boss wave with its banner
  S.stats.wavesCleared = PHASES()
    .slice(0, i)
    .filter(p => p.kind === 'wave').length;
  S.heli = newHeliState(S.t);
}
const nid = () => S.nextId++;
