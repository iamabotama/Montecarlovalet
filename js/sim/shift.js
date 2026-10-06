'use strict';
/* Shift end: fired, clock out, results. */

/* ---- shift end ---- */
function fire() {
  if (S.phase !== 'play') return;
  S.phase = 'fired';
  S.endT = 0;
  S.firedLine = pick(CONFIG.lines.fired);
  Sound.stopMusic();
  Sound.sfx('fired');
  S.shake = 0.5;
}
function clockOut() {
  if (S.phase !== 'play') return;
  S.phase = 'clockout';
  S.endT = 0;
  Sound.stopMusic();
  Sound.sfx('shiftover');
}
// Shift is over (fired or clocked out): settle goals, bank everything into the career, show results.
function finishRun() {
  const kind = S.phase;
  const st = S.stats;
  const goals = settleGoals(kind === 'clockout');
  const career = awardShift({
    kind,
    hotel: HOTEL.id,
    money: S.money,
    earned: st.tips + st.pay,
    goalXP: goals.xp,
    goalsDone: goals.done,
    st,
    t: S.t,
    crewJobs: crewJobsThisShift(),
  });
  RESULT = {
    kind,
    hotel: HOTEL,
    money: S.money,
    hour: hourNow(),
    reason: S.lastHeatReason,
    line: S.firedLine,
    st: { ...st },
    t: S.t,
    goals: S.goals.map(g => ({ text: goalText(g), xp: goalDef(g.id).xp, done: g.done })),
    ...career, // xp, isHigh, highScore, promotions
  };
  goScreen(RESULT.promotions.length ? 'promotion' : 'summary');
}
let RESULT = null;
