'use strict';
/* The manager's heat meter. */

/* ---- heat ---- */
// The manager is pleased: heat goes down (never below 0).
function coolHeat(amt) {
  if (S.phase === 'play' && !S.tutorial) S.heat = Math.max(0, S.heat - amt);
}
function addHeat(amt, reason, x, y) {
  if (S.phase !== 'play' || amt <= 0 || S.tutorial) return;
  const gain = amt * (CONFIG.heat.spiral ? 1 + S.heat / 100 : 1);
  S.heat = Math.min(CONFIG.heat.max, S.heat + gain);
  if (reason) S.lastHeatReason = reason;
  S.heatFloat += gain;
  if (S.heatFloat >= 1) {
    floater('+' + Math.round(S.heatFloat), 140, 10, PAL.red);
    S.heatFloat = 0;
    Sound.sfx('heat');
  }
  for (const w of CONFIG.heat.warnings)
    if (S.heat >= w && !S.warned[w]) {
      S.warned[w] = true;
      S.manager = { line: t(hasText('manager.warn' + w) ? 'manager.warn' + w : 'manager.watchIt'), t: 3 };
      S.shake = CONFIG.fx.shakeSec;
      Sound.sfx('whistle');
    }
  enforceSlots();
  if (S.heat >= CONFIG.heat.max) fire();
}
function repairHeat(amt) {
  S.heat = Math.max(0, S.heat - amt);
  S.stars++;
  floater(t('float.heatDown', { n: Math.round(amt) }), 140, 12, PAL.lime);
  Sound.sfx('star');
  tryGrantStars();
}
