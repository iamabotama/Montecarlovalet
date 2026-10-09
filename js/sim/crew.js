'use strict';
/* Crew economics: hire, wages, send home. */

/* ---- crew: hire / wages / send home ---- */
const HC = CONFIG.helpers;
// Who answers the next hire call (career/roster.js keeps the regulars between shifts).
const hireCandidate = () => rosterCandidate(S.helpers.map(w => w.memberId));
// Jobs each regular finished this shift, banked into the roster at shift end.
function crewJobsThisShift() {
  const out = {};
  for (const w of S.crewLog) out[w.memberId] = (out[w.memberId] || 0) + w.jobsDone;
  return out;
}
// How many helpers this player may hire (the 3rd and 4th valet are a premium perk).
const helperCap = () => (premiumFeature('crew:extra') ? HC.max : Math.min(HC.freeMax, HC.max));
function hireValet() {
  if (S.helpers.length >= helperCap()) {
    toast(helperCap() < HC.max ? t('toast.crewPremium') : t('toast.crewFull', { n: HC.max }));
    Sound.sfx('deny');
    return;
  }
  const m = hireCandidate();
  const wage = helperWage(m);
  if (S.money < wage) {
    toast(t('toast.needToHire', { money: fmtMoney(wage), name: m.name }));
    Sound.sfx('deny');
    return;
  }
  rosterEnlist(m);
  S.money -= wage;
  S.stats.wages += wage;
  const w = {
    id: S.nextWid++,
    memberId: m.id,
    name: m.name,
    wage,
    jobsDone: 0,
    speed: memberSpeed(m),
    x: MAP.standX,
    y: 30,
    loc: { t: 'stand' },
    job: null,
    dir: 1,
    walking: true,
    inCar: null,
    paidT: CONFIG.clock.realSecPerGameHour,
    leaving: false,
    off: 0,
    arriveT: 1.2,
  };
  S.helpers.push(w);
  S.crewLog.push(w); // stays after he goes home, for roster XP
  S.activeW = w.id;
  floater('-' + fmtMoney(wage) + ' ' + m.name, MAP.standX, 40, PAL.orange);
  Sound.sfx('power');
  toast(t('toast.helperOn', { name: workerName(w) }));
}
function sendHome(w) {
  if (!w || w.id === 0) return;
  w.leaving = true;
  for (const j of S.jobs) if (j.wid === w.id && !j.worker) j.wid = 0; // hand his queue back to you
  if (S.activeW === w.id) S.activeW = 0;
  toast(t(w.job ? 'toast.goingHomeAfter' : 'toast.goingHome', { name: workerName(w) }));
  Sound.sfx('click');
}
function selectWorker(w) {
  S.activeW = w.id;
  S.selected = null;
  Sound.sfx('blip', 2);
  floater(workerName(w), w.x, w.y - 14, PAL.yellow);
}
function updateCrew(dt) {
  for (const w of S.helpers.slice()) {
    if (w.arriveT > 0) {
      w.arriveT -= dt;
      w.y = lerp(MAP.standY, 30, Math.max(0, w.arriveT) / 1.2);
      if (w.arriveT <= 0) {
        w.y = MAP.standY;
        w.walking = false;
      }
    }
    if (w.leaving && !w.job) {
      for (const j of S.jobs) if (j.wid === w.id) j.wid = 0;
      S.helpers.splice(S.helpers.indexOf(w), 1);
      floater(t('float.bye'), w.x, w.y - 10, PAL.lgrey);
      continue;
    }
    if (S.tutorial || w.leaving) continue;
    w.paidT -= dt;
    if (w.paidT <= 0) {
      if (S.money >= w.wage) {
        S.money -= w.wage;
        S.stats.wages += w.wage;
        w.paidT += CONFIG.clock.realSecPerGameHour;
        floater(t('float.wages', { money: fmtMoney(w.wage) }), w.x, w.y - 12, PAL.orange);
      } else {
        toast(t('toast.quitNoWages', { name: workerName(w) }));
        sendHome(w);
      }
    }
  }
  // idle valets spread out around the stand instead of stacking
  workers().forEach((w, i) => {
    const atStand = !w.job && w.loc.t === 'stand' && !(w.arriveT > 0);
    const target = atStand ? HC.idleOffsets[i % HC.idleOffsets.length] : 0;
    w.off = (w.off || 0) + clamp(target - (w.off || 0), -dt * 30, dt * 30);
  });
}
