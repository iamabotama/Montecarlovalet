'use strict';
/* Run state S: created fresh by newRun() for every shift. */

/* ------------------------------ RUN STATE ------------------------------ */
let S = null;
function hourNow() {
  return CONFIG.clock.startHour + S.t / CONFIG.clock.realSecPerGameHour;
}
// opts: { loadout: [powerupIds], goals: [{id, done}] } - chosen on the shift-prep screen.
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
    spawnT: CONFIG.arrivals.firstSec,
    phaseI: -1, // index into CONFIG.shift.phases (sim/waves.js)
    shiftComplete: false,
    floaters: [],
    particles: [],
    toasts: [],
    banners: [],
    shout: null,
    comps: newCompsState(),
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
    },
  };
  S.goals = opts.goals || [];
  for (const type of (opts.loadout || CONFIG.career.defaultLoadout).slice(0, CONFIG.career.loadoutCap))
    grantCard(type, true);
  prefillLot();
}
const nid = () => S.nextId++;
