'use strict';
/* Persistent save (localStorage, works offline). SAVE is the only persistent state in the game.
   Shape changes = bump CONFIG.career.saveVersion and add a MIGRATIONS entry; old saves are upgraded,
   never wiped. Only career/* modules and the settings screen should write SAVE fields. */
function defaultSave() {
  return {
    version: CONFIG.career.saveVersion,
    careerXP: 0,
    rank: 0,
    tutorialSeen: false,
    muted: false,
    lang: null, // language code (i18n/); null = follow the device language
    lastHotel: 'monte_carlo',
    loadout: CONFIG.career.defaultLoadout.slice(),
    cosmetic: { ...DEFAULT_COSMETIC },
    hotels: {}, // id -> { highScore, shifts, best: { biggestTip, longestShift, whalesServed } }
    roster: [], // persistent crew, see career/roster.js
    entitlements: [], // owned store products, see career/store.js
    goalsCompleted: 0,
    totals: { shifts: 0, earned: 0 },
  };
}
// MIGRATIONS[n] upgrades a version-n save to version n+1.
const MIGRATIONS = {
  1: d => ({
    ...defaultSave(),
    careerXP: d.careerXP || 0,
    tutorialSeen: !!d.tutorialSeen,
    muted: !!d.muted,
    cosmetic: { ...DEFAULT_COSMETIC, ...d.cosmetic },
    hotels: { monte_carlo: { highScore: d.highScore || 0, shifts: 0, best: { ...d.bestStats } } },
    version: 2,
  }),
};
let SAVE = defaultSave();
function migrateSave(d) {
  while (d.version < CONFIG.career.saveVersion) {
    const up = MIGRATIONS[d.version];
    if (!up) throw new Error('no migration from save v' + d.version);
    d = up(d);
  }
  return d;
}
function loadSave() {
  try {
    const raw = localStorage.getItem(CONFIG.career.saveKey);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object' || typeof d.version !== 'number') throw new Error('bad save');
    SAVE = { ...defaultSave(), ...migrateSave(d) };
    syncRank();
  } catch (e) {
    console.warn('save reset:', e.message);
    SAVE = defaultSave();
  }
}
function writeSave() {
  try {
    localStorage.setItem(CONFIG.career.saveKey, JSON.stringify(SAVE));
  } catch (e) {
    /* storage unavailable (private mode) - play on without saving */
  }
}
// Per-hotel record, created on first use.
function hotelRecord(id) {
  return (SAVE.hotels[id] = SAVE.hotels[id] || { highScore: 0, shifts: 0, best: {} });
}
const hotelHighScore = id => (SAVE.hotels[id] ? SAVE.hotels[id].highScore : 0);
