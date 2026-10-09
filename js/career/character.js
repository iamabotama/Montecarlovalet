'use strict';
/* Characters: everything that belongs to one valet persona lives on a character record, so a save can hold
   several (SAVE.chars) and switching is just changing SAVE.activeChar. Account-wide things (language, sound,
   tutorial seen, purchases, easter-egg secrets, the hired crew roster) stay on SAVE itself (career/save.js).
   Only career/* modules should write character fields; everyone else reads through activeChar().
   Adding a field: put its default in newCharacter() - old saves pick it up via fillCharacter() on load. */
function newCharacter(id = 0, name = '') {
  return {
    id,
    name, // '' = show the default name (i18n key char.defaultName)
    look: { ...DEFAULT_COSMETIC }, // uniform picks, see data/cosmetics.js
    xp: 0, // career XP (career/progression.js)
    rank: 0,
    loadout: CONFIG.career.defaultLoadout.slice(),
    lastHotel: 'monte_carlo',
    hotels: {}, // id -> { highScore, shifts, stars, best: { biggestTip, longestShift, whalesServed } }
    totals: { shifts: 0, earned: 0, goals: 0 },
    life: { marks: {} }, // lifetime sums of every shift stat (career/awards.js)
    awards: {}, // award id -> local day it was earned (data/awards.js)
    awardsUnseen: 0, // shown as NEW on the Career button until the wall is opened
    streak: { last: null, count: 0, best: 0 }, // consecutive play days (career/streaks.js)
  };
}
// Fill in fields added since a character was saved (shallow per field, deep for plain sub-objects).
function fillCharacter(c, i) {
  const d = newCharacter(i);
  for (const k in d)
    if (c[k] === undefined) c[k] = d[k];
    else if (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k])) c[k] = { ...d[k], ...c[k] };
  return c;
}
const activeChar = () => SAVE.chars[SAVE.activeChar] || SAVE.chars[0];
const charName = (c = activeChar()) => c.name || t('char.defaultName');
// Future: a character select screen. Kept here so nothing else needs to know how characters are stored.
function addCharacter(name) {
  const c = newCharacter(SAVE.chars.length, name);
  SAVE.chars.push(c);
  return c;
}
function selectCharacter(i) {
  if (!SAVE.chars[i]) return;
  SAVE.activeChar = i;
  syncRank();
  writeSave();
}
