'use strict';
/* Daily play streak for the active character: finishing at least one shift (any outcome) on consecutive local
   days grows it; missing a day resets it to 1. Each day past the first adds CONFIG.career.streak.xpPerDay to
   that shift's XP, capped at maxBonus. Days are the player's local calendar days, so it works offline. */
function localDay(d = new Date()) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function dayBefore(day) {
  const [y, m, dd] = day.split('-').map(Number);
  return localDay(new Date(y, m - 1, dd - 1));
}
// Count today's play. Returns the streak after this shift.
function bankStreak() {
  const s = activeChar().streak;
  const today = localDay();
  if (s.last !== today) s.count = s.last && s.last === dayBefore(today) ? s.count + 1 : 1;
  s.last = today;
  s.best = Math.max(s.best, s.count);
  return s;
}
// A streak is still "alive" if it was played today or yesterday (today's shift will extend it).
function liveStreak(c = activeChar()) {
  const s = c.streak;
  if (!s.last) return 0;
  const today = localDay();
  return s.last === today || s.last === dayBefore(today) ? s.count : 0;
}
// XP multiplier for a shift played with this streak count.
function streakMult(count) {
  const k = CONFIG.career.streak;
  return 1 + Math.min(Math.max(count - 1, 0) * k.xpPerDay, k.maxBonus);
}
