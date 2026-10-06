'use strict';
/* Crew economics: hire, wages, send home. */

/* ---- crew: hire / wages / send home ---- */
const HC = CONFIG.helpers;
function hireValet() {
  if (S.helpers.length >= HC.max) {
    toast('CREW IS FULL (' + HC.max + ' HELPERS)');
    Sound.sfx('deny');
    return;
  }
  if (S.money < HC.costPerHour) {
    toast('NEED ' + fmtMoney(HC.costPerHour) + ' TO HIRE A VALET');
    Sound.sfx('deny');
    return;
  }
  S.money -= HC.costPerHour;
  S.stats.wages = (S.stats.wages || 0) + HC.costPerHour;
  const w = {
    id: S.nextWid++,
    speed: HC.speed,
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
  S.activeW = w.id;
  floater('-' + fmtMoney(HC.costPerHour) + ' NEW VALET', MAP.standX, 40, PAL.orange);
  Sound.sfx('power');
  toast(workerName(w) + ' IS ON - YOUR NEXT JOBS GO TO HIM');
}
function sendHome(w) {
  if (!w || w.id === 0) return;
  w.leaving = true;
  for (const j of S.jobs) if (j.wid === w.id && !j.worker) j.wid = 0; // hand his queue back to you
  if (S.activeW === w.id) S.activeW = 0;
  toast(workerName(w) + ' IS GOING HOME' + (w.job ? ' AFTER THIS JOB' : ''));
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
      floater('BYE!', w.x, w.y - 10, PAL.lgrey);
      continue;
    }
    if (S.tutorial || w.leaving) continue;
    w.paidT -= dt;
    if (w.paidT <= 0) {
      if (S.money >= HC.costPerHour) {
        S.money -= HC.costPerHour;
        S.stats.wages = (S.stats.wages || 0) + HC.costPerHour;
        w.paidT += CONFIG.clock.realSecPerGameHour;
        floater('-' + fmtMoney(HC.costPerHour) + ' WAGES', w.x, w.y - 12, PAL.orange);
      } else {
        toast(workerName(w) + ' QUIT - NO MONEY FOR WAGES');
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
