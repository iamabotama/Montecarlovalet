'use strict';
/* The shape of a night (data: CONFIG.shift.phases).
   Arrival WAVES that get harder, a BREAK after each one (no new cars; guests come out for theirs), then
   LAST CALL until the shift ends. Surviving to the end completes the shift; during a break after
   CONFIG.shift.clockOutFromWave waves you may clock out early instead.
   This module owns which phase we are in and everything derived from it: arrival pace + mix, patience,
   pickup cap, how fast guests finish inside, banners, the hotel's rush event and shift completion.
   The tutorial scripts its own pacing, so every helper returns the neutral value there. */
const PHASES = () => CONFIG.shift.phases;
function phaseStart(i) {
  let t = 0;
  for (let k = 0; k < i; k++) t += PHASES()[k].sec;
  return t;
}
const shiftLengthSec = () => phaseStart(PHASES().length);
const shiftEndHour = () => CONFIG.clock.startHour + shiftLengthSec() / CONFIG.clock.realSecPerGameHour;
function phaseIndexAt(t) {
  const P = PHASES();
  let acc = 0;
  for (let i = 0; i < P.length; i++) if (t < (acc += P[i].sec)) return i;
  return P.length - 1;
}
const curPhase = () => (S.tutorial ? null : PHASES()[phaseIndexAt(S.t)]);
const phaseName = p => (p.event ? HOTEL.event.name : p.name);
const waveCount = () => PHASES().filter(p => p.kind === 'wave').length;
// 1-based number of the wave at or before phase i (a break reports the wave it follows).
const waveNumber = i =>
  PHASES()
    .slice(0, i + 1)
    .filter(p => p.kind === 'wave').length;
const phaseLeftSec = () => phaseStart(phaseIndexAt(S.t) + 1) - S.t;

const patienceMult = () => (curPhase() ? curPhase().patienceMult : 1);
const maxPickups = () => (curPhase() ? curPhase().maxPickups : Infinity);
const stayRate = () => (curPhase() && curPhase().stayRate) || 1;
const pickupsAllowed = () => maxPickups() > 0;

// Seconds until the next arrival, or null when this phase has no arrivals (breaks, last call).
// Wave 1 is the learning wave and plays the same at every hotel; later waves use the hotel's pace.
function nextInterval() {
  const p = curPhase();
  if (!p || !p.interval) return null;
  const iv = rnd(...p.interval);
  return waveNumber(phaseIndexAt(S.t)) > 1 ? iv * HOTEL.arrivals.intervalMult : iv;
}
const arrivalMix = () => (curPhase() || PHASES()[0]).mix;

function canClockOut() {
  const p = curPhase();
  return S.phase === 'play' && !!p && p.kind === 'break' && S.stats.wavesCleared >= CONFIG.shift.clockOutFromWave;
}

function updateWaves() {
  if (S.tutorial || S.phase !== 'play') return;
  if (S.t >= shiftLengthSec()) return completeShift();
  const i = phaseIndexAt(S.t);
  if (i !== S.phaseI) {
    const prev = PHASES()[S.phaseI];
    S.phaseI = i;
    enterPhase(PHASES()[i], prev);
  }
}
function enterPhase(p, prev) {
  if (prev && prev.kind === 'wave') S.stats.wavesCleared++;
  if (prev && prev.event) S.stats.eventsSurvived++;
  if (p.kind === 'wave') {
    const n = waveNumber(S.phaseI);
    S.banners.push({ text: 'WAVE ' + n + '/' + waveCount() + ': ' + phaseName(p), sub: p.banner, t: 3 });
    if (p.event) Sound.sfx('gala');
    S.spawnT = Math.min(S.spawnT, rnd(1, 3));
  } else if (p.kind === 'break') {
    const sub = canClockOut() ? 'CLOCK OUT NOW, OR STAY FOR A HARDER WAVE' : p.banner;
    S.banners.push({ text: 'BREAK - NO NEW CARS', sub, t: 3 });
  } else {
    // last call: everyone still inside comes out within callOutSec
    for (const g of S.guests.values()) if (g.state === 'inside') g.stay = Math.min(g.stay, rnd(2, p.callOutSec));
    S.banners.push({ text: p.name, sub: p.banner, t: 3 });
  }
}
function completeShift() {
  if (S.phase !== 'play') return;
  S.stats.wavesCleared = waveCount();
  S.shiftComplete = true;
  earn(CONFIG.shift.completeBonus, 'pay');
  clockOut();
}
