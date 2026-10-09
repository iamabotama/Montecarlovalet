'use strict';
/* =====================================================================
   MONTE CARLO VALET  -  v1 (Stage 1: playable core)
   Single-file, vanilla JS + Canvas. No external assets.
   All tuning lives in CONFIG below.
   ===================================================================== */
const CONFIG = {
  debug: false, // ?debug=1 in the URL also enables it. Backtick toggles overlay.
  version: '2.6.0',
  // Lot defaults; each hotel overrides lanes/stallsPerLane/openSides/tempSlots (data/hotels/*).
  lot: {
    orientation: 'horizontal',
    lanes: 6,
    stallsPerLane: 6,
    stallPx: [16, 15],
    tempSlots: { west: 2, east: 2 },
    curbSlots: 4,
    streetQueueMax: 3,
    prefilledCars: 0,
    tempOverstaySec: 60,
    tempOverstayEverySec: 30,
    tempOverstayHeat: 1,
  },
  map: {
    // Shared layout (internal px). Each hotel overrides lotX/lotY in data/hotels/*.
    lotX: 46,
    lotY: 81,
    curbY: 50,
    streetY: 71,
    standX: 160,
    standY: 45,
    mouthL: 100,
    mouthR: 220,
    curbX: [112, 136, 184, 208],
    premium: [
      [82, 57],
      [238, 57],
    ], // premium stall pads beside the drive (world/premium.js)
    queueX: [80, 60, 40],
  },
  speed: {
    driveBaseSec: 0.6,
    drivePerTileSec: 0.12,
    walkPerTileSec: 0.15,
    tilePx: 8,
    greetSec: 2,
    bagsExtraSec: 2,
    jobQueueMax: 4,
    arriveSec: 2,
    guestWalkPxSec: 28,
  },
  tiers: {
    beater: {
      pickupTip: [1, 3],
      dropPatience: 25,
      pickPatience: 45,
      angryHeat: 2,
      waveOffHeat: 1,
      waveOffHeatChance: 0.25,
    },
    standard: { pickupTip: [5, 10], dropPatience: 25, pickPatience: 50, angryHeat: 4, waveOffHeat: 3 },
    premium: { pickupTip: [15, 30], dropPatience: 20, pickPatience: 40, angryHeat: 8, waveOffHeat: 12 },
    whale: {
      arrivalTip: [50, 150],
      pickupTip: [50, 200],
      dropPatience: 12,
      pickPatience: 20,
      dropPatienceByHour: [
        [18, 18],
        [21, 12],
      ],
      escalateStart: 0.5,
      escalateStep: 0.5,
      escalateEverySec: 10,
    },
    ultra: {
      arrivalTip: [100, 250],
      pickupTip: [100, 300],
      dropPatience: 10,
      pickPatience: 12,
      dropPatienceByHour: [
        [18, 15],
        [21, 10],
      ],
      escalateStart: 1.0,
      escalateStep: 1.0,
      escalateEverySec: 10,
    },
    limo: { greetTip: [40, 80], greetPatience: 15, ignoredHeat: 6 },
  },
  heat: {
    max: 100,
    repairPerDollar: 0.15,
    repairMaxStage: 2,
    spiral: true,
    warnings: [50, 75, 90],
    slotThresholds: [40, 60, 75, 90],
  },
  pay: { beater: 2, standard: 4, premium: 8, whale: 15, ultra: 25, limo: 10, compAfterPatience: true },
  tips: {
    whalePickupDecayPer10s: 0.1,
    otherDecayFloor: 0.5,
    // Whale/Ultra jackpot: if served super fast (wait <= maxWaitFrac of patience), chance to tip a flat amount instead
    jackpot: { chance: 0.1, amount: 500, maxWaitFrac: 0.25 },
  },
  power: {
    maxSlots: 5,
    starsPerPowerup: 2,
    rivalClaimSec: 6,
    ignoreSec: 20,
    hustleSec: 15,
    hustleMult: 2,
    reservedSec: 60,
    coffeeSec: 30,
    coffeeMult: 1.5,
    weights: {
      pawnOff: 3,
      directAway: 3,
      ignore: 2,
      bags: 2,
      hustle: 2,
      reserved: 2,
      spareKeys: 2,
      bribe: 2,
      fakeSmile: 2,
      coffee: 2,
    },
    base: ['pawnOff', 'directAway', 'ignore', 'bags', 'hustle'],
  },
  career: {
    xpPerDollar: 1,
    ranks: [
      { name: tl('rank.rookie'), xp: 0, unlock: [], loadoutPicks: 2 },
      { name: tl('rank.valet'), xp: 1000, unlock: ['reserved', 'uniform:blue', 'stall:premium1'] },
      { name: tl('rank.senior'), xp: 3000, unlock: ['spareKeys'], loadoutPicks: 3 },
      { name: tl('rank.head'), xp: 7500, unlock: ['bribe', 'uniform:black'] },
      { name: tl('rank.captain'), xp: 15000, unlock: ['fakeSmile', 'uniform:gloves'] },
      { name: tl('rank.legend'), xp: 30000, unlock: ['coffee', 'nametag:gold'] },
    ],
    loadoutCap: 3,
    defaultLoadout: ['pawnOff', 'bags'],
    goalsPerNight: 3,
    saveKey: 'mcvalet.save',
    saveVersion: 2, // bump + add a migration in career/save.js when the save shape changes
  },
  stay: { minSec: 45, maxSec: 150, prefillMinSec: 15, prefillMaxSec: 140 },
  clock: { realSecPerGameHour: 120, startHour: 18 }, // the shift ends when CONFIG.shift.phases run out (midnight)
  arrivals: {
    firstSec: 3,
    prefillMix: [55, 35, 10, 0, 0, 0],
  },
  // The night (sim/waves.js): arrival WAVES that get harder, a BREAK after each, then LAST CALL.
  //   sec: phase length. interval: seconds between arrivals (waves only; hotels scale waves 2+).
  //   mix: weights for beater, standard, premium, whale, ultra, limo. patienceMult: scales guest patience.
  //   maxPickups: guests waiting for their car at once (0 = arrivals only). stayRate: how fast guests
  //   finish inside (>1 sends them out during breaks). event: this wave is the hotel's rush event.
  //   callOutSec (last call): everyone still inside comes out within this many seconds.
  shift: {
    completeBonus: 150, // $ for surviving the whole night
    clockOutFromWave: 2, // clocking out early is allowed during breaks once this many waves are done
    phases: [
      {
        kind: 'wave',
        name: tl('phase.earlyDinner'),
        sec: 110,
        interval: [16, 20],
        mix: [50, 50, 0, 0, 0, 0],
        patienceMult: 3,
        maxPickups: 0,
        banner: tl('phase.earlyDinner.banner'),
      },
      {
        kind: 'break',
        sec: 40,
        patienceMult: 3,
        maxPickups: 1,
        stayRate: 2,
        banner: tl('phase.break1.banner'),
      },
      {
        kind: 'wave',
        name: tl('phase.dinnerRush'),
        sec: 120,
        interval: [12, 15],
        mix: [30, 45, 25, 0, 0, 0],
        patienceMult: 2.4,
        maxPickups: 2,
        banner: tl('phase.dinnerRush.banner'),
      },
      { kind: 'break', sec: 50, patienceMult: 2.4, maxPickups: 3, stayRate: 2.5, banner: tl('phase.break2.banner') },
      {
        kind: 'wave',
        name: tl('phase.highRollers'),
        sec: 120,
        interval: [10, 12],
        mix: [20, 35, 25, 15, 0, 5],
        patienceMult: 1.8,
        maxPickups: 3,
        banner: tl('phase.highRollers.banner'),
      },
      {
        kind: 'break',
        sec: 50,
        patienceMult: 1.8,
        maxPickups: 4,
        stayRate: 2.5,
        banner: tl('phase.break3.banner'),
      },
      {
        kind: 'wave',
        event: true,
        sec: 130,
        interval: [7, 9],
        mix: [10, 20, 25, 25, 12, 8],
        patienceMult: 1.3,
        maxPickups: 4,
        banner: tl('phase.event.banner'),
      },
      {
        kind: 'last',
        name: tl('phase.lastCall'),
        sec: 100,
        patienceMult: 1.3,
        maxPickups: 6,
        stayRate: 1,
        callOutSec: 60,
        banner: tl('phase.lastCall.banner'),
      },
    ],
  },
  // Extra valets: tap HIRE (left panel), tap a valet to make him active; new jobs go to the active valet.
  // VIP helicopter: once per shift, lands on the pad right of the lot. A valet must be at the pad within meetSec of touchdown.
  // VIP helicopter timing. Where the pad is and how many landings a night belong to the hotel.
  helo: {
    descendSec: 6,
    meetSec: 10,
    greetSec: 2,
    tip: 1000,
    pay: 50,
    missHeat: 12,
  },
  // Premium stalls (world/premium.js): a whale/ultra fetched from one before any complaint bubble.
  premium: { tipMult: 2, heatRelief: 10 },
  helpers: {
    max: 3,
    freeMax: 1, // helpers beyond this (the 3rd and 4th valet) are a premium perk ('crew:extra')
    costPerHour: 100,
    speed: 1.0,
    idleOffsets: [0, 8, -8, 16],
    // Persistent crew (career/roster.js): the same named valets come back each shift and improve.
    roster: {
      names: ['Marco', 'Luca', 'Enzo', 'Paolo', 'Gino', 'Nico'], // names are not translated
      levelJobs: [0, 25, 60, 120, 200], // jobs completed to reach each level
      speedPerLevel: 0.05,
      wagePerLevel: 10,
    },
  },
  // Store (career/store.js). Off = no paywall; every product counts as owned.
  store: { enabled: false },
  podium: { x: 172, handSec: 0.6, boardRows: 5 },
  fx: { shakeSec: 0.35, toastSec: 2.6, musicSpeedPerHour: 0.05, musicBpm: 116 },
  lines: {
    // bubble words, manager quips and firing lines are text: see i18n/en.js (lines.*, manager.*)
    grawlixChars: '@#$%&!*',
  },
};
