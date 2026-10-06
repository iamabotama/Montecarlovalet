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
function finishRun() {
  const kind = S.phase;
  const st = S.stats;
  const xp = Math.round((st.tips + st.pay) * CONFIG.career.xpPerDollar);
  const isHigh = S.money > SAVE.highScore;
  if (isHigh) SAVE.highScore = Math.round(S.money);
  SAVE.careerXP += xp;
  const best = SAVE.bestStats;
  best.biggestTip = Math.max(best.biggestTip || 0, st.biggestTip);
  best.longestShift = Math.max(best.longestShift || 0, S.t);
  best.whalesServed = Math.max(best.whalesServed || 0, st.whalesServed);
  writeSave();
  RESULT = {
    kind,
    money: S.money,
    xp,
    isHigh,
    hour: hourNow(),
    reason: S.lastHeatReason,
    line: S.firedLine,
    st: { ...st },
    t: S.t,
  };
  UI.screen = 'summary';
}
let RESULT = null;
