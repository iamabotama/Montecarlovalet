'use strict';
/* The crew as job executors: you (id 0) + hired valets, lane locking. */

/* ---- crew: S.valet (you, id 0) + up to CONFIG.helpers.max hired valets, each with its own job queue ---- */
function workers() {
  return [S.valet, ...S.helpers];
}
function activeWorker() {
  return workers().find(w => w.id === S.activeW) || S.valet;
}
function workerName(w) {
  return w.id === 0 ? 'YOU' : w.name;
}
function jobLanes(j) {
  const car = S.cars.get(j.carId);
  if (j.type === 'park' || j.type === 'move') return [j.lane];
  if (j.type === 'fetch') return car && car.loc.t === 'stall' ? [car.loc.lane] : [];
  if (j.type === 'restow') return j.list.filter(e => !e.done).map(e => e.lane);
  return [];
}
function laneBusy(j, w) {
  const mine = jobLanes(j);
  if (!mine.length) return false;
  for (const o of workers())
    if (o !== w && o.job && !o.job.aborted && jobLanes(o.job).some(l => mine.includes(l))) return true;
  return false;
}
function queuedCount(wid) {
  return S.jobs.filter(j => j.type !== 'restow' && !j.aborted && j.wid === wid).length;
}
