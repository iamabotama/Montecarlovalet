'use strict';
/* Lifetime stats + awards for the active character. Called once per finished shift by awardShift()
   (career/progression.js); nothing in the simulation knows awards exist. */

// Stats where the lifetime value is the best single shift rather than a sum.
const LIFE_MAX = new Set(['biggestTip', 'longestWhaleWait']);

// Fold one shift's stats into character.life: numbers add up (or keep the max), marks add up per key.
function bankLifetime(st) {
  const L = activeChar().life;
  L.shifts = (L.shifts || 0) + 1;
  for (const k in st) {
    const v = st[k];
    if (typeof v !== 'number') continue;
    L[k] = LIFE_MAX.has(k) ? Math.max(L[k] || 0, v) : (L[k] || 0) + v;
  }
  for (const k in st.marks || {}) L.marks[k] = (L.marks[k] || 0) + st.marks[k];
  return L;
}
// Judge every award not yet held. Returns the newly earned awards (and marks them NEW for the Career button).
function checkAwards(r) {
  const c = activeChar();
  const fresh = [];
  for (const a of AWARDS) {
    if (c.awards[a.id]) continue;
    let ok = false;
    try {
      ok = !!a.check(c.life, r, c);
    } catch (e) {
      console.warn('award check failed:', a.id, e.message);
    }
    if (!ok) continue;
    c.awards[a.id] = localDay();
    fresh.push(a);
  }
  c.awardsUnseen += fresh.length;
  return fresh;
}
const awardXP = list => list.reduce((n, a) => n + AWARD_XP[a.tier], 0);
const awardsEarned = (c = activeChar()) => AWARDS.filter(a => c.awards[a.id]).length;
function markAwardsSeen() {
  if (!activeChar().awardsUnseen) return;
  activeChar().awardsUnseen = 0;
  writeSave();
}
