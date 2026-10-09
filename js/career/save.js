'use strict';
/* Persistent save (localStorage, works offline). SAVE is the only persistent state in the game.
   Shape changes = bump CONFIG.career.saveVersion and add a MIGRATIONS entry; old saves are upgraded,
   never wiped. Only career/* modules and the settings screen should write SAVE fields. */
function defaultSave() {
  return {
    version: CONFIG.career.saveVersion,
    // account-wide (shared by every character)
    tutorialSeen: false,
    muted: false,
    lang: null, // language code (i18n/); null = follow the device language
    entitlements: [], // owned store products, see career/store.js
    secrets: {}, // easter eggs found, e.g. potus -> the hidden Trump Towers hotel
    roster: [], // persistent hired crew, see career/roster.js
    // characters (career/character.js): rank, XP, look, hotel records, awards, streak, lifetime stats
    activeChar: 0,
    chars: [newCharacter(0)],
  };
}
// MIGRATIONS[n] upgrades a version-n save to version n+1.
const MIGRATIONS = {
  1: d => ({
    careerXP: d.careerXP || 0,
    tutorialSeen: !!d.tutorialSeen,
    muted: !!d.muted,
    cosmetic: { ...DEFAULT_COSMETIC, ...d.cosmetic },
    hotels: { monte_carlo: { highScore: d.highScore || 0, shifts: 0, best: { ...d.bestStats } } },
    version: 2,
  }),
  // v3: per-character careers. Everything about the one existing valet moves onto character 0.
  2: d => ({
    version: 3,
    tutorialSeen: !!d.tutorialSeen,
    muted: !!d.muted,
    lang: d.lang || null,
    entitlements: d.entitlements || [],
    secrets: d.secrets || {},
    roster: d.roster || [],
    activeChar: 0,
    chars: [
      {
        ...newCharacter(0),
        look: { ...DEFAULT_COSMETIC, ...d.cosmetic },
        xp: d.careerXP || 0,
        rank: d.rank || 0,
        loadout: d.loadout || CONFIG.career.defaultLoadout.slice(),
        lastHotel: d.lastHotel || 'monte_carlo',
        hotels: d.hotels || {},
        totals: { shifts: 0, earned: 0, ...d.totals, goals: d.goalsCompleted || 0 },
      },
    ],
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
    if (!Array.isArray(SAVE.chars) || !SAVE.chars.length) SAVE.chars = [newCharacter(0)];
    SAVE.chars.forEach(fillCharacter);
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
  const hs = activeChar().hotels;
  return (hs[id] = hs[id] || { highScore: 0, shifts: 0, best: {} });
}
const hotelHighScore = id => (activeChar().hotels[id] ? activeChar().hotels[id].highScore : 0);
