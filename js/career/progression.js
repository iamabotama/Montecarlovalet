'use strict';
/* Career progression: XP -> rank, and what each rank unlocks (power-ups, cosmetics, hotels, loadout size).
   Unlock keys in CONFIG.career.ranks[].unlock:  '<powerupId>' | 'uniform:<id>' | 'nametag:<id>'.
   Hotels unlock by their own `unlockRank` (data/hotels/*), optionally also gated by a store product. */
const RANKS = CONFIG.career.ranks;

const rankForXP = xp => RANKS.reduce((r, k, i) => (xp >= k.xp ? i : r), 0);
const rankName = (i = SAVE.rank) => RANKS[i].name.toUpperCase();
const nextRank = () => RANKS[SAVE.rank + 1] || null;
function syncRank() {
  SAVE.rank = rankForXP(SAVE.careerXP);
}
// Everything unlocked at or below the current rank (plus store grants).
function unlockKeys() {
  const keys = new Set();
  for (let i = 0; i <= SAVE.rank; i++) for (const k of RANKS[i].unlock) keys.add(k);
  for (const k of storeGrants()) keys.add(k);
  return keys;
}
function unlockedPowerups() {
  const keys = unlockKeys();
  return Object.keys(CONFIG.power.weights).filter(p => CONFIG.power.base.includes(p) || keys.has(p));
}
function unlockedCosmetics(kind) {
  // kind: 'uniform' | 'nametag'; the first entry of each table is always available
  const table = kind === 'uniform' ? UNIFORMS : NAMETAGS;
  const keys = unlockKeys();
  return Object.keys(table).filter((id, i) => i === 0 || keys.has(kind + ':' + id));
}
function loadoutPicks() {
  let n = CONFIG.career.loadoutCap;
  for (let i = 0; i <= SAVE.rank; i++) if (RANKS[i].loadoutPicks) n = RANKS[i].loadoutPicks;
  return Math.min(n, CONFIG.career.loadoutCap);
}
// { ok, reason } for the hotel-select screen.
function hotelAccess(h) {
  if (SAVE.rank < h.unlockRank) return { ok: false, reason: 'REACH ' + rankName(h.unlockRank) };
  const granted = unlockKeys().has('hotel:' + h.id) || unlockKeys().has('hotel:*');
  if (h.product && !storeOwns(h.product) && !granted)
    return { ok: false, reason: PRODUCTS[h.product].price + ' ' + PRODUCTS[h.product].name };
  return { ok: true };
}
// Describe what a rank unlocks, for the promotion screen.
function rankUnlockLines(i) {
  const out = [];
  for (const k of RANKS[i].unlock) {
    const [kind, id] = k.includes(':') ? k.split(':') : ['power', k];
    if (kind === 'power') out.push('POWER-UP: ' + POWER_INFO[id].name);
    if (kind === 'uniform') out.push('UNIFORM: ' + UNIFORMS[id].name);
    if (kind === 'nametag') out.push(NAMETAGS[id].name);
  }
  if (RANKS[i].loadoutPicks && (i === 0 || RANKS[i].loadoutPicks > (RANKS[i - 1].loadoutPicks || 0)))
    out.push('START WITH ' + RANKS[i].loadoutPicks + ' POWER-UPS');
  for (const id of HOTEL_ORDER) if (HOTELS[id].unlockRank === i && i > 0) out.push('NEW HOTEL: ' + HOTELS[id].city);
  return out;
}
/* Hotel rating for one shift: 1 star = survived to the rush event, 2 = clocked out,
   3 = clocked out with at least the hotel's starTarget in the bank. Best rating is kept per hotel. */
function shiftStars(r) {
  const out = r.kind === 'clockout';
  return out ? (r.money >= hotelById(r.hotel).starTarget ? 3 : 2) : r.st.eventsSurvived > 0 ? 1 : 0;
}
const hotelStars = id => (SAVE.hotels[id] ? SAVE.hotels[id].stars || 0 : 0);
/* Bank one finished shift into the career. Returns what changed (for the summary/promotion screens).
   Every shift pays XP, even a firing; XP never affects the score. */
function awardShift(r) {
  const xp = Math.round(r.earned * CONFIG.career.xpPerDollar) + r.goalXP;
  const oldRank = SAVE.rank;
  SAVE.careerXP += xp;
  syncRank();
  const rec = hotelRecord(r.hotel);
  const isHigh = r.money > rec.highScore;
  if (isHigh) rec.highScore = Math.round(r.money);
  rec.shifts++;
  const stars = shiftStars(r);
  rec.stars = Math.max(rec.stars || 0, stars);
  rec.best.biggestTip = Math.max(rec.best.biggestTip || 0, r.st.biggestTip);
  rec.best.longestShift = Math.max(rec.best.longestShift || 0, r.t);
  rec.best.whalesServed = Math.max(rec.best.whalesServed || 0, r.st.whalesServed);
  SAVE.totals.shifts++;
  SAVE.totals.earned += Math.round(r.earned);
  SAVE.goalsCompleted += r.goalsDone;
  SAVE.lastHotel = r.hotel;
  rosterBankShift(r.crewJobs);
  writeSave();
  const promotions = [];
  for (let i = oldRank + 1; i <= SAVE.rank; i++) promotions.push(i);
  return { xp, isHigh, highScore: rec.highScore, stars, promotions };
}
