'use strict';
/* Lot model: stall occupancy, stack depth, temp/curb slots, placing cars. */

/* ------------------------------ LOT MODEL ------------------------------ */
const sideLabel = s => t(s === 'west' ? 'side.westShort' : 'side.eastShort');
function blockedAt(lane, j) {
  const L = S.lanes[lane];
  return L.cars[j] !== null || L.res[j] !== null;
}
function freeRun(lane, side) {
  let c = 0;
  for (let p = 0; p < sideSize(side); p++) {
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
    for (const s of LOT_SIDES) if (entryIndex(l, s, pendingParks(l, s)) !== null) return false;
  return true;
}
function freeStalls() {
  let n = 0;
  for (const L of S.lanes) for (let j = 0; j < NS; j++) if (L.cars[j] === null && L.res[j] === null) n++;
  return n;
}
// Can a valet drive this car somewhere else right now? Overflow/premium spots are single-car; a stall
// car needs a clear run to an open row end (otherwise move the cars in front of it first).
function isMovable(car) {
  if (car.loc.t === 'temp' || car.loc.t === 'prem') return true;
  return car.loc.t === 'stall' && liveDepth(car.loc.lane, car.loc.idx).best === 0;
}
// Job type for sending a car to a stall: from the curb it is a park, from anywhere else a move.
const parkJobType = car => (car.loc.t === 'curb' ? 'park' : 'move');
function liveDepth(lane, idx) {
  const L = S.lanes[lane];
  let w = 0,
    e = 0;
  for (let j = 0; j < idx; j++) if (L.cars[j] !== null) w++;
  for (let j = idx + 1; j < NS; j++) if (L.cars[j] !== null) e++;
  // a closed row end can never be dug out from
  if (!sideOpen('west')) w = Infinity;
  if (!sideOpen('east')) e = Infinity;
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
  car.dir = sideOfIdx(idx) === 'west' ? 2 : 0;
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
// Cars that are put away (guest inside): row stalls, temp slots, premium stalls.
const isParked = car => car.loc.t === 'stall' || car.loc.t === 'temp' || car.loc.t === 'prem';
// Short name of where a car is: "A3", "T1", "P1" (null for curb/moving).
function spotName(loc) {
  if (loc.t === 'stall') return stallName(loc.lane, loc.idx);
  if (loc.t === 'temp') return TEMPS[loc.i].name;
  if (loc.t === 'prem') return PREMS[loc.i].name;
  return null;
}
// Park destinations (row stall or premium stall): claim it when the drive starts, settle the car when it ends.
function claimSpot(dest, carId) {
  if (dest.t === 'prem') S.prem[dest.i].car = carId;
  else S.lanes[dest.lane].cars[dest.idx] = carId;
}
function putCarAt(car, dest) {
  if (dest.t === 'prem') placeInPrem(car, dest.i);
  else placeInStall(car, dest.lane, dest.idx);
}
function removeCarFromWorld(car) {
  if (car.loc.t === 'stall') {
    S.lanes[car.loc.lane].cars[car.loc.idx] = null;
  }
  if (car.loc.t === 'temp') {
    S.temps[car.loc.i].car = null;
  }
  if (car.loc.t === 'prem') S.prem[car.loc.i].car = null;
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
  return eventHook('carName', car) || MODELS[car.tier][car.mi][0];
}
function stallName(lane, idx) {
  return LANE_NAMES[lane] + (idx + 1);
}
