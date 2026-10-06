'use strict';
/* Power-up cards: slots, granting, targeting, using. */

function slotsAllowed() {
  return CONFIG.power.maxSlots - CONFIG.heat.slotThresholds.filter(t => S.heat >= t).length;
}
function enforceSlots() {
  const n = slotsAllowed();
  while (S.cards.length > n) {
    let mi = 0;
    S.cards.forEach((c, i) => {
      if (c.at > S.cards[mi].at) mi = i;
    });
    S.cards.splice(mi, 1);
    toast('POWER-UP SLOT LOST');
  }
  tryGrantStars();
}
// Cards earned mid-shift come from everything the career has unlocked (career/progression.js).
const powerPool = () => unlockedPowerups();
function grantCard(type, silent) {
  if (S.cards.length >= slotsAllowed()) return false;
  S.cards.push({ type, at: ++S.cardSeq });
  if (!silent) {
    Sound.sfx('power');
    floater(POWER_INFO[type].name, 250, 12, PAL.yellow);
  }
  return true;
}
function tryGrantStars() {
  const pool = powerPool();
  while (S.stars >= CONFIG.power.starsPerPowerup && S.cards.length < slotsAllowed()) {
    S.stars -= CONFIG.power.starsPerPowerup;
    grantCard(pool[weightedIndex(pool.map(k => CONFIG.power.weights[k]))]);
  }
}
/* ---- power-ups ---- */
function powerTargets(type, g, car) {
  const t = POWER_INFO[type].target;
  const atCurb = g && g.state === 'curbDrop' && car && car.loc.t === 'curb';
  if (t === 'guest') return g && WAITING.has(g.state);
  if (t === 'curbNonWhale') return atCurb && !isWhale(g.tier) && g.tier !== 'limo';
  if (t === 'curbStdPrem') return atCurb && (g.tier === 'standard' || g.tier === 'premium');
  if (t === 'curbWhale') return atCurb && isWhale(g.tier);
  if (t === 'curbLimo') return atCurb && g.tier === 'limo';
  return false;
}
function useCard(idx, g) {
  const card = S.cards[idx];
  if (!card) return;
  const type = card.type;
  const car = g && S.cars.get(g.carId);
  const P = CONFIG.power;
  if (POWER_INFO[type].target === 'self') {
    if (type === 'hustle') S.boost.hustle = P.hustleSec;
    if (type === 'coffee') S.boost.coffee = P.coffeeSec;
    if (type === 'spareKeys') S.boost.spareKeys++;
    if (type === 'reserved' && !holdVipStall()) return Sound.sfx('deny');
  } else if (!powerTargets(type, g, car)) {
    Sound.sfx('deny');
    return;
  } else if (type === 'pawnOff') {
    removeQueuedJobsFor(car.id);
    S.npcs.push({ kind: 'newbie', x: g.x, y: 34, t: 1.2 });
    floater('PAWNED!', g.x, g.y - 6, PAL.lime);
    departCar(car);
    guestGone(g);
  } else if (type === 'directAway') {
    removeQueuedJobsFor(car.id);
    S.stats.waved++;
    floater('GENERAL PARKING >', g.x, g.y - 6, PAL.lime);
    departCar(car);
    guestGone(g);
  } else if (type === 'ignore') {
    g.ignoreT = P.ignoreSec;
  } else if (type === 'fakeSmile') {
    const lo = [0, 0, 0.2, 0.45, 0.7, 0.9];
    g.wait = Math.min(g.wait, lo[Math.max(0, g.stage - 1)] * g.patience);
    g.over = 0;
    g.stage = stageOf(g);
  } else if (type === 'bribe') {
    removeQueuedJobsFor(car.id);
    greetLimo(car, g);
  } else if (type === 'bags') {
    S.selected = { carId: car.id, bags: true };
    g.claimed = true;
  }
  S.cards.splice(idx, 1);
  S.armed = null;
  Sound.sfx('power');
  tryGrantStars();
}
