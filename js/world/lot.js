'use strict';
/* Lot model: stall occupancy, stack depth, temp/curb slots, placing cars. */

/* ------------------------------ LOT MODEL ------------------------------ */
const sideLabel = s => (s === 'west' ? 'W' : 'E');
function blockedAt(lane, j) {
  const L = S.lanes[lane];
  return L.cars[j] !== null || L.res[j] !== null;
}
function freeRun(lane, side) {
  let c = 0;
  for (let p = 0; p < (side === 'west' ? HALF : NS - HALF); p++) {
    const j = side === 'west' ? p : NS - 1 - p;
    if (blockedAt(lane, j)) break;
    c++;
  }
  return c;
}
function pendingParks(lane, side, exceptJob) {
  return S.jobs.filter(
    j =>
      j !== exceptJob &&
      (j.type === 'park' || j.type === 'move') &&
      !j.carMoved &&
      !j.aborted &&
      j.lane === lane &&
      j.side === side,
  ).length;
}
function entryIndex(lane, side, pending = 0) {
  const c = freeRun(lane, side);
  if (c <= pending) return null;
  const pos = c - 1 - pending;
  return { idx: side === 'west' ? pos : NS - 1 - pos, depth: pos };
}
function lotFull() {
  for (let l = 0; l < NL; l++)
    for (const s of ['west', 'east']) if (entryIndex(l, s, pendingParks(l, s)) !== null) return false;
  return true;
}
function freeStalls() {
  let n = 0;
  for (const L of S.lanes) for (let j = 0; j < NS; j++) if (L.cars[j] === null && L.res[j] === null) n++;
  return n;
}
function liveDepth(lane, idx) {
  const L = S.lanes[lane];
  let w = 0,
    e = 0;
  for (let j = 0; j < idx; j++) if (L.cars[j] !== null) w++;
  for (let j = idx + 1; j < NS; j++) if (L.cars[j] !== null) e++;
  return { west: w, east: e, best: Math.min(w, e), side: w <= e ? 'west' : 'east' };
}
function freeTemps(exceptRes) {
  const out = [];
  S.temps.forEach((t, i) => {
    if (t.car === null && (t.res === null || t.res === exceptRes)) out.push(i);
  });
  return out;
}
function freeCurb(exceptRes) {
  for (let k = 0; k < S.curb.length; k++) {
    const c = S.curb[k];
    if (c.car === null && (c.res === null || c.res === exceptRes)) return k;
  }
  return -1;
}
function placeInStall(car, lane, idx) {
  S.lanes[lane].cars[idx] = car.id;
  S.lanes[lane].res[idx] = null;
  car.loc = { t: 'stall', lane, idx };
  car.x = stallX(idx);
  car.y = laneY(lane);
  car.dir = idx < HALF ? 2 : 0;
}
function placeInTemp(car, i) {
  S.temps[i].car = car.id;
  S.temps[i].res = null;
  car.loc = { t: 'temp', i };
  car.x = TEMPS[i].x;
  car.y = TEMPS[i].y;
  car.dir = TEMPS[i].side === 'west' ? 2 : 0;
  car.tempSince = S.t;
  car.tempHeatT = 0;
}
function removeCarFromWorld(car) {
  if (car.loc.t === 'stall') {
    S.lanes[car.loc.lane].cars[car.loc.idx] = null;
  }
  if (car.loc.t === 'temp') {
    S.temps[car.loc.i].car = null;
  }
  if (car.loc.t === 'curb') {
    S.curb[car.loc.k].car = null;
  }
  dropRestowEntry(car.id);
}
function dropRestowEntry(carId) {
  for (const j of S.jobs)
    if (j.type === 'restow' && !j.aborted) {
      const e = j.list.find(e => e.carId === carId);
      if (e && !e.done) {
        e.done = true;
        const L = S.lanes[e.lane];
        if (L.res[e.idx] === carId) L.res[e.idx] = null;
      }
    }
  S.jobs = S.jobs.filter(j => !(j.type === 'restow' && j.list.every(e => e.done) && !j.worker));
}
function carName(car) {
  return MODELS[car.tier][car.mi][0];
}
function stallName(lane, idx) {
  return LANE_NAMES[lane] + (idx + 1);
}
