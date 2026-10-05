'use strict';
/* =====================================================================
   MONTE CARLO VALET  -  v1 (Stage 1: playable core)
   Single-file, vanilla JS + Canvas. No external assets.
   All tuning lives in CONFIG below.
   ===================================================================== */
const CONFIG = {
  debug: false,                 // ?debug=1 in the URL also enables it. Backtick toggles overlay.
  version: '1.1.0',
  lot:   { orientation: 'horizontal', lanes: 6, stallsPerLane: 8, stallPx: [16, 15],
           tempSlots: { west: 2, east: 2 }, curbSlots: 4,
           streetQueueMax: 3, prefilledCars: 0, tempOverstaySec: 60, tempOverstayEverySec: 30, tempOverstayHeat: 1 },
  map:   { // Monte Carlo layout (internal px). A future hotel = another entry like this.
           lotX: 46, lotY: 81, curbY: 50, streetY: 71, standX: 160, standY: 45,
           mouthL: 100, mouthR: 220, curbX: [112, 136, 184, 208], queueX: [80, 60, 40] },
  speed: { driveBaseSec: 0.6, drivePerTileSec: 0.12, walkPerTileSec: 0.15, tilePx: 8,
           greetSec: 2, bagsExtraSec: 2, jobQueueMax: 4, arriveSec: 2, guestWalkPxSec: 28 },
  tiers: {
    beater:   { pickupTip: [1, 3],    dropPatience: 25, pickPatience: 45, angryHeat: 2,  waveOffHeat: 1, waveOffHeatChance: 0.25 },
    standard: { pickupTip: [5, 10],   dropPatience: 25, pickPatience: 50, angryHeat: 4,  waveOffHeat: 3 },
    premium:  { pickupTip: [15, 30],  dropPatience: 20, pickPatience: 40, angryHeat: 8,  waveOffHeat: 12 },
    whale:    { arrivalTip: [50, 150], pickupTip: [50, 200], dropPatience: 12, pickPatience: 20,
                dropPatienceByHour: [[18, 18], [21, 12]],
                escalateStart: 0.5, escalateStep: 0.5, escalateEverySec: 10 },
    ultra:    { arrivalTip: [100, 250], pickupTip: [100, 300], dropPatience: 10, pickPatience: 12,
                dropPatienceByHour: [[18, 15], [21, 10]],
                escalateStart: 1.0, escalateStep: 1.0, escalateEverySec: 10 },
    limo:     { greetTip: [40, 80], greetPatience: 15, ignoredHeat: 6 },
  },
  heat:  { max: 100, repairPerDollar: 0.15, repairMaxStage: 2, spiral: true,
           warnings: [50, 75, 90], slotThresholds: [40, 60, 75, 90] },
  pay:   { beater: 2, standard: 4, premium: 8, whale: 15, ultra: 25, limo: 10, compAfterPatience: true },
  tips:  { whalePickupDecayPer10s: 0.10, otherDecayFloor: 0.5,
    // Whale/Ultra jackpot: if served super fast (wait <= maxWaitFrac of patience), chance to tip a flat amount instead
    jackpot: { chance: 0.10, amount: 500, maxWaitFrac: 0.25 } },
  power: { maxSlots: 5, starsPerPowerup: 2, rivalClaimSec: 6, ignoreSec: 20,
           hustleSec: 15, hustleMult: 2, reservedSec: 60, coffeeSec: 30, coffeeMult: 1.5,
           weights: { pawnOff: 3, directAway: 3, ignore: 2, bags: 2, hustle: 2,
                      reserved: 2, spareKeys: 2, bribe: 2, fakeSmile: 2, coffee: 2 },
           base: ['pawnOff', 'directAway', 'ignore', 'bags', 'hustle'] },
  career: {
    xpPerDollar: 1,
    ranks: [
      { name: 'Rookie',                xp: 0,     unlock: [],            loadoutPicks: 2 },
      { name: 'Valet',                 xp: 1000,  unlock: ['reserved', 'uniform:blue'] },
      { name: 'Senior Valet',          xp: 3000,  unlock: ['spareKeys'],  loadoutPicks: 3 },
      { name: 'Head Valet',            xp: 7500,  unlock: ['bribe', 'uniform:black'] },
      { name: 'Valet Captain',         xp: 15000, unlock: ['fakeSmile', 'uniform:gloves'] },
      { name: 'Legend of the Riviera', xp: 30000, unlock: ['coffee', 'nametag:gold'] },
    ],
    loadoutCap: 3, defaultLoadout: ['pawnOff', 'bags'],
    goalsPerNight: 3, goalXp: [200, 500],
    saveKey: 'mcvalet.save', saveVersion: 1,
  },
  stay:  { minSec: 45, maxSec: 150, prefillMinSec: 15, prefillMaxSec: 140 },
  clock: { realSecPerGameHour: 120, startHour: 18, clockOutHour: 22 },
  arrivals: {
    firstSec: 3,
    // mix order: beater, standard, premium, whale, ultra, limo
    schedule: [
      { fromHour: 18, interval: [9, 12], mix: [30, 35, 20, 10, 0, 5] },
      { fromHour: 19, interval: [7, 9],  mix: [20, 30, 25, 15, 5, 5] },
      { fromHour: 21, interval: [5, 7],  mix: [15, 25, 25, 20, 8, 7] },
      { fromHour: 23, interval: [4, 6],  mix: [10, 20, 25, 25, 12, 8], perHourDec: 0.2, floor: 2.5 },
    ],
    prefillMix: [55, 35, 10, 0, 0, 0],
  },
  // Learning curve: overrides the hourly schedule until endSec. patienceMult scales every guest's patience;
  // maxPickups caps how many guests can be waiting for their car at once (0 = arrivals only).
  ramp: { enabled: true, endSec: 480, steps: [
    { fromSec: 0,   interval: [16, 20], mix: [50, 50, 0, 0, 0, 0],   patienceMult: 3,   maxPickups: 0, banner: 'PARK THE ARRIVALS' },
    { fromSec: 120, interval: [14, 18], mix: [35, 45, 20, 0, 0, 0],  patienceMult: 2.5, maxPickups: 1, banner: 'GUESTS LEAVING - CHECK THE BOARD' },
    { fromSec: 240, interval: [12, 15], mix: [25, 40, 25, 10, 0, 0], patienceMult: 2,   maxPickups: 2, banner: 'WHALE SPOTTED - BIG TIPS, PARK FAST' },
    { fromSec: 360, interval: [9, 12],  mix: [20, 35, 25, 12, 3, 5], patienceMult: 1.5, maxPickups: 3, banner: 'LIMOS AND ULTRAS TONIGHT' },
  ] },
  podium: { x: 172, handSec: 0.6, boardRows: 5 },
  gala: { hour: 22, jitterHours: 0.3, durationSec: 60, interval: [2, 3], highShare: 0.5 },
  fx:   { shakeSec: 0.35, toastSec: 2.6, musicSpeedPerHour: 0.05, musicBpm: 116 },
  lines: {
    murmur: ['...', 'HMM', 'AHEM'],
    annoyed: ['EXCUSE ME?', 'HELLO??', '?'],
    angry: ['!', '!!', '?!'],
    poshMurmur: ['I SAY...', 'AHEM.', 'HMM?'],
    poshAnnoyed: ['DO YOU KNOW WHO I AM?', 'I SAY!', 'GOOD LORD'],
    grawlixChars: '@#$%&!*',
    warnings: { 50: 'GUESTS ARE TALKING, KID.', 75: 'ONE MORE AND YOU\'RE OUT.', 90: 'LAST WARNING, KID.' },
    fired: ['THE BUGATTO OWNER IS MY BROTHER-IN-LAW.', 'SECURITY WILL WALK YOU TO THE BUS.',
            'HAND OVER THE KEYS. ALL OF THEM.', 'THE PRINCE HIMSELF CALLED ME.',
            'YOU\'RE BANNED FROM THE RIVIERA.', 'CLEAN OUT YOUR LOCKER. NOW.'],
  },
};

