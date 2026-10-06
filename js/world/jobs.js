'use strict';
/* Job queue: labels, enqueue, cancel, promote. */

/* ------------------------------ JOBS ------------------------------ */
function jobLabel(j) {
  const car = S.cars.get(j.carId);
  switch (j.type) {
    case 'park':
      return 'PARK ' + LANE_NAMES[j.lane] + '-' + sideLabel(j.side);
    case 'move':
      return 'MOVE ' + LANE_NAMES[j.lane] + '-' + sideLabel(j.side);
    case 'fetch':
      return car && car.loc.t === 'stall'
        ? 'FETCH ' + stallName(car.loc.lane, car.loc.idx)
        : car && car.loc.t === 'temp'
          ? 'FETCH ' + TEMPS[car.loc.i].name
          : 'FETCH';
    case 'restow':
      return 'RESTOW ' + j.list.filter(e => !e.done).length;
    case 'greet':
      return 'GREET';
    case 'heli':
      return 'HELIPAD';
  }
  return j.type.toUpperCase();
}
function enqueue(job) {
  const w = activeWorker();
  if (job.wid === undefined) job.wid = w.id;
  if (queuedCount(job.wid) >= SPD.jobQueueMax) {
    toast(workerName(w) + ': QUEUE FULL (' + SPD.jobQueueMax + ')');
    Sound.sfx('deny');
    return false;
  }
  job.id = nid();
  job.carMoved = false;
  S.jobs.push(job);
  Sound.sfx('click');
  return true;
}
function releaseJob(j) {
  S.curb.forEach(c => {
    if (c.res === j.id) c.res = null;
  });
  S.temps.forEach(t => {
    if (t.res === j.id) t.res = null;
  });
}
function cancelJob(j) {
  if (j.worker) {
    if (j.carMoved) {
      toast("CAN'T CANCEL - CAR IN MOTION");
      Sound.sfx('deny');
      return;
    }
    j.aborted = true;
    releaseJob(j);
  } else S.jobs.splice(S.jobs.indexOf(j), 1);
  if (j.type === 'restow') {
    for (const e of j.list)
      if (!e.done) {
        e.done = true;
        const L = S.lanes[e.lane];
        if (L.res[e.idx] === e.carId) L.res[e.idx] = null;
      }
    toast('BLOCKERS LEFT IN TEMP - TAP ONE TO RE-PARK');
  }
  Sound.sfx('click');
}
function promoteJob(j) {
  if (j.worker) return;
  const i = S.jobs.indexOf(j);
  const first = S.jobs.findIndex(x => x.wid === j.wid && !x.worker);
  if (first >= 0 && i > first) {
    S.jobs.splice(i, 1);
    S.jobs.splice(first, 0, j);
    Sound.sfx('click');
  }
}
