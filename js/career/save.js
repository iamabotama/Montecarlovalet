'use strict';
/* Persistent save (localStorage). */

/* ------------------------------ SAVE ------------------------------ */
function defaultSave() {
  return {
    version: CONFIG.career.saveVersion,
    careerXP: 0,
    rank: 0,
    unlocked: [],
    loadout: CONFIG.career.defaultLoadout.slice(),
    cosmetic: { uniform: 'red', nametag: 'none' },
    highScore: 0,
    bestStats: {},
    goalsCompletedCount: 0,
    tutorialSeen: false,
    muted: false,
    promotedRanks: [],
  };
}
let SAVE = defaultSave();
function loadSave() {
  try {
    const raw = localStorage.getItem(CONFIG.career.saveKey);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object' || d.version !== CONFIG.career.saveVersion) throw 0;
    SAVE = Object.assign(defaultSave(), d);
  } catch (e) {
    SAVE = defaultSave();
  }
}
function writeSave() {
  try {
    localStorage.setItem(CONFIG.career.saveKey, JSON.stringify(SAVE));
  } catch (e) {
    /* storage unavailable */
  }
}
