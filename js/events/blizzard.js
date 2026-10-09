'use strict';
/* Blizzard (Swiss Alps signature). Mid-wave, the snow suddenly thickens: a white-out sweeps across the
   screen, everyone (valets and guests) walks slower, and guests are more forgiving while it lasts.
   It eases off on its own. Uses only director settings (walkRate, waitRate) and a full-screen overlay.
   Tuning: EVENT_CONFIG.blizzard. */
const BLZ = () => EVENT_CONFIG.blizzard;
defineEvent('blizzard', {
  eligible: () => !!(HOTEL && HOTEL.theme && HOTEL.theme.weather === 'snow'),
  get walkRate() {
    return BLZ().walkMult;
  },
  get waitRate() {
    return BLZ().waitMult;
  },
  idle(dt) {
    // rolled once a second during waves
    BLZ_ROLL.t += dt;
    if (BLZ_ROLL.t < 1) return;
    BLZ_ROLL.t = 0;
    if (eventCanStart('blizzard') && Math.random() < eventChance('blizzard')) blizzardStart();
  },
  update(ev, dt) {
    if (ev.t >= BLZ().durationSec) endEvent(); // the director advances ev.t
  },
  overlay: ev => drawBlizzard(ev), // above cars and people
  debug: {
    BLIZZARD: () => blizzardStart(),
  },
});
const BLZ_ROLL = { t: 0 };
function blizzardStart() {
  startEvent('blizzard', { t: 0 });
  eventBanner(t('event.blizzard'));
  Sound.sfx('wind');
}
// Strength ramps in and out over rampSec so it never pops.
function blizzardStrength(ev) {
  const r = BLZ().rampSec;
  return clamp(Math.min(ev.t / r, (BLZ().durationSec - ev.t) / r), 0, 1);
}
function drawBlizzard(ev) {
  const k = blizzardStrength(ev);
  if (k <= 0) return;
  ctx.globalAlpha = 0.28 * k; // white-out haze
  R(0, 10, 320, 170, '#e8eef8');
  ctx.globalAlpha = 1;
  const n = Math.round(260 * k); // sideways driving snow
  for (let i = 0; i < n; i++) {
    const sp = 70 + (i % 9) * 12;
    const x = ((i * 53 + UI.t * sp) % 340) - 10;
    const y = ((i * 31 + UI.t * (18 + (i % 5) * 4)) % 175) + 5;
    R(x, y, i % 4 ? 1 : 2, 1, i % 3 ? PAL.white : PAL.lgrey);
  }
}
