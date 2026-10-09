'use strict';
/* =====================================================================
   MONTE CARLO VALET  -  v1 (Stage 1: playable core)
   Single-file, vanilla JS + Canvas. No external assets.
   All tuning lives in CONFIG below.
   ===================================================================== */
// Shift phase builders (CONFIG.shift.phases): a WAVE of arrivals, and the BREAK after it.
const wavePhase = (id, name, sec, interval, mix, patienceMult, maxPickups, banner) => ({
  kind: 'wave',
  id,
  name,
  sec,
  interval,
  mix,
  patienceMult,
  maxPickups,
  banner,
});
const breakPhase = (sec, patienceMult, maxPickups, stayRate, banner) => ({
  kind: 'break',
  sec,
  patienceMult,
  maxPickups,
  stayRate,
  banner,
});
const CONFIG = {
  debugMenu: true, // DEBUG button on the title screen (screens/debug_menu.js); switch off before release
  debug: false, // ?debug=1 in the URL also enables it. Backtick toggles overlay.
  version: '2.18.1',
  // Lot defaults; each hotel overrides lanes/stallsPerLane/openSides/tempSlots (data/hotels/*).
  lot: {
    orientation: 'horizontal',
    lanes: 6,
    stallsPerLane: 6,
    stallPx: [16, 15],
    tempSlots: { west: 1, east: 1 },
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
    streak: { xpPerDay: 0.05, maxBonus: 0.3 }, // daily play streak XP bonus (career/streaks.js)
    saveVersion: 3, // bump + add a migration in career/save.js when the save shape changes
  },
  stay: { minSec: 45, maxSec: 150, prefillMinSec: 15, prefillMaxSec: 140 },
  clock: { realSecPerGameHour: 105, startHour: 18 }, // the shift ends when CONFIG.shift.phases run out (2 AM)
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
    everyCarBonus: 500, // extra $ when the whole night is done and no arriving car went unparked (beaters too)
    clockOutFromWave: 2, // clocking out early is allowed during breaks once this many waves are done
    // Waves (id = what helicopter schedules point at, data/hotels/*): shorter and steeper than before, a few
    // whales from wave 1, pickups from wave 1. Optional per wave: tipMult (x tips), eventMult (x fun-event odds).
    phases: [
      wavePhase(
        'early',
        tl('phase.earlyDinner'),
        90,
        [13, 16],
        [45, 43, 8, 3, 0, 1],
        2.6,
        1,
        tl('phase.earlyDinner.banner'),
      ),
      breakPhase(30, 2.6, 2, 2, tl('phase.break1.banner')),
      wavePhase(
        'dinner',
        tl('phase.dinnerRush'),
        100,
        [10, 13],
        [30, 40, 20, 6, 1, 3],
        2.1,
        2,
        tl('phase.dinnerRush.banner'),
      ),
      breakPhase(30, 2.1, 3, 2.5, tl('phase.break2.banner')),
      wavePhase(
        'showtime',
        tl('phase.showtime'),
        100,
        [8, 10],
        [20, 33, 27, 12, 4, 4],
        1.8,
        3,
        tl('phase.showtime.banner'),
      ),
      breakPhase(30, 1.8, 4, 2.5, tl('phase.break2.banner')),
      wavePhase(
        'high',
        tl('phase.highRollers'),
        110,
        [7, 9],
        [12, 24, 28, 22, 9, 5],
        1.5,
        4,
        tl('phase.highRollers.banner'),
      ),
      breakPhase(30, 1.5, 4, 2.5, tl('phase.break3.banner')),
      {
        ...wavePhase('event', null, 110, [6, 8], [8, 18, 26, 26, 14, 8], 1.3, 5, tl('phase.event.banner')),
        event: true,
      },
      breakPhase(30, 1.3, 5, 2.5, tl('phase.break1.banner')),
      {
        ...wavePhase(
          'after',
          tl('phase.afterParty'),
          90,
          [8, 10],
          [0, 4, 14, 42, 32, 8],
          1.5,
          5,
          tl('phase.afterParty.banner'),
        ),
        tipMult: 1.5,
        eventMult: 3,
      },
      {
        kind: 'last',
        id: 'last',
        name: tl('phase.lastCall'),
        sec: 90,
        patienceMult: 1.3,
        maxPickups: 6,
        stayRate: 1,
        callOutSec: 60,
        banner: tl('phase.lastCall.closing'),
      },
    ],
  },
  // Extra valets: tap HIRE (left panel), tap a valet to make him active; new jobs go to the active valet.
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
