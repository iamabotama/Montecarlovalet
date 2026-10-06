'use strict';
/* Nightly goals for the current shift (definitions: data/goals.js).
   S.goals = [{ id, done }]. Live goals tick off the moment their value reaches the target;
   atEnd goals are judged by settleGoals() when the shift ends (failed if you were fired). */
const goalDef = id => GOALS.find(g => g.id === id);

function drawGoals(hotel, n = CONFIG.career.goalsPerNight) {
  const pool = GOALS.filter(g => !g.when || g.when(hotel)).map(g => g.id);
  const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(rndi(0, pool.length - 1), 1)[0]);
  return out.map(id => ({ id, done: false }));
}
const goalProgress = g => Math.min(goalDef(g.id).target, goalDef(g.id).value(S));
const goalTextFor = (g, hotel) => goalDef(g.id).text.replace('THE RUSH EVENT', hotel.event.name);
const goalText = g => goalTextFor(g, HOTEL);

function updateGoals() {
  if (S.tutorial || S.phase !== 'play') return;
  for (const g of S.goals) {
    const d = goalDef(g.id);
    if (g.done || d.atEnd || d.value(S) < d.target) continue;
    g.done = true;
    S.banners.push({ text: 'GOAL! ' + goalText(g), t: 3 });
    floater('+' + d.xp + ' XP', 160, 30, PAL.lime);
    Sound.sfx('power');
  }
}
// Called once at shift end. Returns { done, xp }.
function settleGoals(clockedOut) {
  for (const g of S.goals) {
    const d = goalDef(g.id);
    if (d.atEnd) g.done = clockedOut && d.value(S) >= d.target;
  }
  const done = S.goals.filter(g => g.done);
  return { done: done.length, xp: done.reduce((a, g) => a + goalDef(g.id).xp, 0) };
}
