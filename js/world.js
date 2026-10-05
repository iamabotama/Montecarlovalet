'use strict';

/* ------------------------------ GEOMETRY ------------------------------ */
const MAP = CONFIG.map, LOT = CONFIG.lot, SPD = CONFIG.speed;
const NL = LOT.lanes, NS = LOT.stallsPerLane, SW = LOT.stallPx[0], SH = LOT.stallPx[1];
const HALF = Math.ceil(NS / 2);
const LOT_R = MAP.lotX + NS * SW, LOT_B = MAP.lotY + NL * SH;
const laneY = i => MAP.lotY + i * SH + Math.floor(SH / 2);
const stallX = j => MAP.lotX + j * SW + SW / 2;
const aisleX = side => (side === 'west' ? MAP.lotX - 8 : LOT_R + 8);
const LANE_NAMES = 'ABCDEFGHIJ';
const TEMPS = [];
(function () { let n = 1; for (let k = 0; k < LOT.tempSlots.west; k++) TEMPS.push({ x: MAP.lotX - 30, y: MAP.lotY + 11 + k * 18, side: 'west', name: 'T' + n++ });
  for (let k = 0; k < LOT.tempSlots.east; k++) TEMPS.push({ x: LOT_R + 30, y: MAP.lotY + 11 + k * 18, side: 'east', name: 'T' + n++ }); })();
const SPOTS = [84, 236, 68, 252, 52, 268, 36, 284, 20, 300];

/* ------------------------------ ROUTING GRAPH ------------------------------ */
const NODES = new Map();
const nk = (x, y) => x + ',' + y;
function addNode(x, y) { const k = nk(x, y); if (!NODES.has(k)) NODES.set(k, { x, y, adj: new Set() }); return k; }
function chainNodes(pts) { const ks = pts.map(p => addNode(p[0], p[1])); for (let i = 1; i < ks.length; i++) { NODES.get(ks[i - 1]).adj.add(ks[i]); NODES.get(ks[i]).adj.add(ks[i - 1]); } }
function buildGraph() {
  NODES.clear();
  const xs = [...new Set([MAP.mouthL, ...MAP.curbX, MAP.standX, MAP.mouthR])].sort((a, b) => a - b);
  chainNodes(xs.map(x => [x, MAP.curbY]));
  chainNodes([[MAP.mouthL, MAP.curbY], [MAP.mouthL, MAP.streetY]]);
  chainNodes([[MAP.mouthR, MAP.curbY], [MAP.mouthR, MAP.streetY]]);
  chainNodes([[aisleX('west'), MAP.streetY], [MAP.mouthL, MAP.streetY], [MAP.mouthR, MAP.streetY], [aisleX('east'), MAP.streetY]]);
  for (const side of ['west', 'east']) {
    const ax = aisleX(side); const ys = new Set([MAP.streetY]); for (let i = 0; i < NL; i++) ys.add(laneY(i));
    TEMPS.filter(t => t.side === side).forEach(t => ys.add(t.y));
    chainNodes([...ys].sort((a, b) => a - b).map(y => [ax, y]));
    TEMPS.filter(t => t.side === side).forEach(t => chainNodes([[ax, t.y], [t.x, t.y]]));
  }
}
const pathCache = new Map();
function graphPath(a, b) {
  const ck = a + '|' + b; if (pathCache.has(ck)) return pathCache.get(ck);
  const dist = new Map([[a, 0]]), prev = new Map(), open = new Set([a]);
  while (open.size) { let u = null, du = Infinity; for (const k of open) if (dist.get(k) < du) { du = dist.get(k); u = k; } open.delete(u); if (u === b) break;
    const nu = NODES.get(u); for (const v of nu.adj) { const nv = NODES.get(v); const d = du + Math.abs(nu.x - nv.x) + Math.abs(nu.y - nv.y); if (d < (dist.has(v) ? dist.get(v) : Infinity)) { dist.set(v, d); prev.set(v, u); open.add(v); } } }
  const out = []; let c = b; while (c) { const n = NODES.get(c); out.unshift([n.x, n.y]); if (c === a) break; c = prev.get(c); }
  pathCache.set(ck, out); return out;
}
// Location descriptors: {t:'stand'} {t:'curb',k} {t:'temp',i} {t:'stall',lane,idx}
function locEnds(loc) {
  if (loc.t === 'stand') return [{ node: nk(MAP.standX, MAP.curbY), tail: [[MAP.standX, MAP.standY]] }];
  if (loc.t === 'curb') return [{ node: nk(MAP.curbX[loc.k], MAP.curbY), tail: [] }];
  if (loc.t === 'temp') return [{ node: nk(TEMPS[loc.i].x, TEMPS[loc.i].y), tail: [] }];
  if (loc.t === 'stall') { const y = laneY(loc.lane), x = stallX(loc.idx);
    return ['west', 'east'].map(side => ({ side, node: nk(aisleX(side), y), tail: [[x, y]] })); }
  throw new Error('bad loc');
}
function locPoint(loc) { const e = locEnds(loc)[0]; if (e.tail.length) return e.tail[e.tail.length - 1]; const n = NODES.get(e.node); return [n.x, n.y]; }
function route(a, b, sideA, sideB) {
  let best = null;
  for (const ea of locEnds(a)) { if (sideA && ea.side && ea.side !== sideA) continue;
    for (const eb of locEnds(b)) { if (sideB && eb.side && eb.side !== sideB) continue;
      const pts = dedupe([...ea.tail.slice().reverse(), ...graphPath(ea.node, eb.node), ...eb.tail]);
      if (a.t === 'stall' && b.t === 'stall' && a.lane === b.lane && !sideA && !sideB) { const direct = [locPoint(a), locPoint(b)]; if (!best || pathLen(direct) < best.len) best = { pts: direct, len: pathLen(direct) }; }
      const len = pathLen(pts); if (!best || len < best.len) best = { pts, len, sideA: ea.side, sideB: eb.side }; } }
  return best;
}
function speedMult() { let m = 1; if (S.boost.hustle > 0) m = Math.max(m, CONFIG.power.hustleMult); if (S.boost.coffee > 0) m = Math.max(m, CONFIG.power.coffeeMult); return m; }
const tiles = len => len / SPD.tilePx;
const driveSec = (len, m = 1) => (SPD.driveBaseSec + SPD.drivePerTileSec * tiles(len)) / m;
const walkSec = (len, m = 1) => (SPD.walkPerTileSec * tiles(len)) / m;

/* ------------------------------ SAVE ------------------------------ */
function defaultSave() { return { version: CONFIG.career.saveVersion, careerXP: 0, rank: 0, unlocked: [], loadout: CONFIG.career.defaultLoadout.slice(), cosmetic: { uniform: 'red', nametag: 'none' }, highScore: 0, bestStats: {}, goalsCompletedCount: 0, tutorialSeen: false, muted: false, promotedRanks: [] }; }
let SAVE = defaultSave();
function loadSave() { try { const raw = localStorage.getItem(CONFIG.career.saveKey); if (!raw) return; const d = JSON.parse(raw); if (!d || typeof d !== 'object' || d.version !== CONFIG.career.saveVersion) throw 0; SAVE = Object.assign(defaultSave(), d); } catch (e) { SAVE = defaultSave(); } }
function writeSave() { try { localStorage.setItem(CONFIG.career.saveKey, JSON.stringify(SAVE)); } catch (e) { /* storage unavailable */ } }

/* ------------------------------ RUN STATE ------------------------------ */
let S = null;
function hourNow() { return CONFIG.clock.startHour + S.t / CONFIG.clock.realSecPerGameHour; }
function newRun() {
  S = { t: 0, money: 0, heat: 0, stars: 0, cards: [], cardSeq: 0, warned: {}, cars: new Map(), guests: new Map(), nextId: 1,
    lanes: Array.from({ length: NL }, () => ({ cars: Array(NS).fill(null), res: Array(NS).fill(null) })),
    temps: TEMPS.map(() => ({ car: null, res: null })), curb: MAP.curbX.map(() => ({ car: null, res: null })),
    streetQueue: [], jobs: [], spots: SPOTS.map(() => null),
    valet: { x: MAP.standX, y: MAP.standY, loc: { t: 'stand' }, job: null, dir: 1, walking: false, inCar: null, stepT: 0, anim: 0 },
    spawnT: CONFIG.arrivals.firstSec, galaAt: CONFIG.gala.hour + Math.random() * CONFIG.gala.jitterHours, galaEnd: 0, galaDone: false, galaActive: false,
    floaters: [], particles: [], toasts: [], banners: [], shake: 0, manager: null, phase: 'play', endT: 0, boost: { hustle: 0, coffee: 0, spareKeys: 0 },
    lastHeatReason: 'THE GUESTS COMPLAINED.', heatFloat: 0, meltdown: false, npcs: [], selected: null, armed: null, lotFullFlash: 0,
    stats: { carsParked: 0, whalesServed: 0, biggestTip: 0, longestWhaleWait: 0, longestWhaleName: '', tips: 0, pay: 0, angry: 0, waved: 0, stolen: 0, limos: 0, comped: 0, grawlix: 0 },
  };
  for (const t of CONFIG.career.defaultLoadout.slice(0, CONFIG.career.loadoutCap)) grantCard(t, true);
  prefillLot();
}
const nid = () => S.nextId++;

/* ------------------------------ LOT MODEL ------------------------------ */
const sideLabel = s => (s === 'west' ? 'W' : 'E');
function blockedAt(lane, j) { const L = S.lanes[lane]; return L.cars[j] !== null || L.res[j] !== null; }
function freeRun(lane, side) { let c = 0; for (let p = 0; p < (side === 'west' ? HALF : NS - HALF); p++) { const j = side === 'west' ? p : NS - 1 - p; if (blockedAt(lane, j)) break; c++; } return c; }
function pendingParks(lane, side, exceptJob) { return S.jobs.filter(j => j !== exceptJob && (j.type === 'park' || j.type === 'move') && !j.carMoved && !j.aborted && j.lane === lane && j.side === side).length; }
function entryIndex(lane, side, pending = 0) { const c = freeRun(lane, side); if (c <= pending) return null; const pos = c - 1 - pending; return { idx: side === 'west' ? pos : NS - 1 - pos, depth: pos }; }
function lotFull() { for (let l = 0; l < NL; l++) for (const s of ['west', 'east']) if (entryIndex(l, s, pendingParks(l, s)) !== null) return false; return true; }
function freeStalls() { let n = 0; for (const L of S.lanes) for (let j = 0; j < NS; j++) if (L.cars[j] === null && L.res[j] === null) n++; return n; }
function liveDepth(lane, idx) { const L = S.lanes[lane]; let w = 0, e = 0; for (let j = 0; j < idx; j++) if (L.cars[j] !== null) w++; for (let j = idx + 1; j < NS; j++) if (L.cars[j] !== null) e++; return { west: w, east: e, best: Math.min(w, e), side: w <= e ? 'west' : 'east' }; }
function freeTemps(exceptRes) { const out = []; S.temps.forEach((t, i) => { if (t.car === null && (t.res === null || t.res === exceptRes)) out.push(i); }); return out; }
function freeCurb(exceptRes) { for (let k = 0; k < S.curb.length; k++) { const c = S.curb[k]; if (c.car === null && (c.res === null || c.res === exceptRes)) return k; } return -1; }
function placeInStall(car, lane, idx) { S.lanes[lane].cars[idx] = car.id; S.lanes[lane].res[idx] = null; car.loc = { t: 'stall', lane, idx }; car.x = stallX(idx); car.y = laneY(lane); car.dir = idx < HALF ? 2 : 0; }
function placeInTemp(car, i) { S.temps[i].car = car.id; S.temps[i].res = null; car.loc = { t: 'temp', i }; car.x = TEMPS[i].x; car.y = TEMPS[i].y; car.dir = TEMPS[i].side === 'west' ? 2 : 0; car.tempSince = S.t; car.tempHeatT = 0; }
function removeCarFromWorld(car) {
  if (car.loc.t === 'stall') { S.lanes[car.loc.lane].cars[car.loc.idx] = null; }
  if (car.loc.t === 'temp') { S.temps[car.loc.i].car = null; }
  if (car.loc.t === 'curb') { S.curb[car.loc.k].car = null; }
  dropRestowEntry(car.id);
}
function dropRestowEntry(carId) {
  for (const j of S.jobs) if (j.type === 'restow' && !j.aborted) { const e = j.list.find(e => e.carId === carId);
    if (e && !e.done) { e.done = true; const L = S.lanes[e.lane]; if (L.res[e.idx] === carId) L.res[e.idx] = null; } }
  S.jobs = S.jobs.filter(j => !(j.type === 'restow' && j.list.every(e => e.done) && j !== S.valet.job));
}
function carName(car) { return MODELS[car.tier][car.mi][0]; }
function stallName(lane, idx) { return LANE_NAMES[lane] + (idx + 1); }

/* ------------------------------ JOBS ------------------------------ */
function jobLabel(j) {
  const car = S.cars.get(j.carId);
  switch (j.type) {
    case 'park': return 'PARK ' + LANE_NAMES[j.lane] + '-' + sideLabel(j.side);
    case 'move': return 'MOVE ' + LANE_NAMES[j.lane] + '-' + sideLabel(j.side);
    case 'fetch': return car && car.loc.t === 'stall' ? 'FETCH ' + stallName(car.loc.lane, car.loc.idx) : car && car.loc.t === 'temp' ? 'FETCH ' + TEMPS[car.loc.i].name : 'FETCH';
    case 'restow': return 'RESTOW ' + j.list.filter(e => !e.done).length;
    case 'greet': return 'GREET';
  }
  return j.type.toUpperCase();
}
function queuedCount() { return S.jobs.filter(j => j.type !== 'restow' && !j.aborted).length; }
function enqueue(job) {
  if (queuedCount() >= SPD.jobQueueMax) { toast('JOB QUEUE FULL (' + SPD.jobQueueMax + ')'); Sound.sfx('deny'); return false; }
  job.id = nid(); job.carMoved = false; S.jobs.push(job); Sound.sfx('click'); return true;
}
function releaseJob(j) {
  S.curb.forEach(c => { if (c.res === j.id) c.res = null; }); S.temps.forEach(t => { if (t.res === j.id) t.res = null; });
}
function cancelJob(j) {
  if (j === S.valet.job) { if (j.carMoved) { toast('CAN\'T CANCEL - CAR IN MOTION'); Sound.sfx('deny'); return; } j.aborted = true; releaseJob(j); }
  else S.jobs.splice(S.jobs.indexOf(j), 1);
  if (j.type === 'restow') { for (const e of j.list) if (!e.done) { e.done = true; const L = S.lanes[e.lane]; if (L.res[e.idx] === e.carId) L.res[e.idx] = null; } toast('BLOCKERS LEFT IN TEMP - TAP ONE TO RE-PARK'); }
  Sound.sfx('click');
}
function promoteJob(j) { const i = S.jobs.indexOf(j); const first = S.valet.job ? 1 : 0; if (i > first) { S.jobs.splice(i, 1); S.jobs.splice(first, 0, j); Sound.sfx('click'); } }

// Planner: builds steps with precomputed paths from the valet's location; returns {steps, est} | {refuse} | {wait}
function plan(j, from, dry) {
  const m = speedMult(); let cur = from; const steps = []; let est = 0;
  const walk = (to, sideB, sideA) => { const r = route(cur, to, sideA, sideB); if (r.len > 0) { steps.push({ k: 'walk', pts: r.pts, to }); est += walkSec(r.len, m); } cur = to; return r; };
  const drive = (carId, to, sideA, sideB, onStart, onEnd) => { const r = route(cur, to, sideA, sideB); steps.push({ k: 'drive', carId, pts: r.pts, to, onStart, onEnd }); est += driveSec(r.len, m); cur = to; };
  const wait = (sec, label) => { steps.push({ k: 'wait', sec: sec / m, label }); est += sec / m; };
  const act = fn => steps.push({ k: 'do', fn });
  const car = S.cars.get(j.carId); const g = car ? S.guests.get(car.guestId) : null;
  if (j.type === 'park') {
    if (!car || car.loc.t !== 'curb' || !g || g.state !== 'curbDrop') return { refuse: '' };
    const e = entryIndex(j.lane, j.side, dry ? pendingParks(j.lane, j.side, j) : 0); if (!e) return { refuse: 'LANE ' + LANE_NAMES[j.lane] + ' ' + j.side.toUpperCase() + ' IS FULL' };
    const k = car.loc.k; walk({ t: 'curb', k });
    act(() => reachCarAtCurb(car, g, j.bags));
    if (j.bags) wait(SPD.bagsExtraSec, 'BAGS');
    drive(car.id, { t: 'stall', lane: j.lane, idx: e.idx }, null, j.side,
      () => { S.curb[k].car = null; S.lanes[j.lane].cars[e.idx] = car.id; },
      () => { placeInStall(car, j.lane, e.idx); S.stats.carsParked++; });
    walk({ t: 'stand' }, null, j.side); j.depth = e.depth;
  } else if (j.type === 'move') {
    if (!car || car.loc.t !== 'temp') return { refuse: '' };
    const e = entryIndex(j.lane, j.side, dry ? pendingParks(j.lane, j.side, j) : 0); if (!e) return { refuse: 'LANE ' + LANE_NAMES[j.lane] + ' ' + j.side.toUpperCase() + ' IS FULL' };
    const i = car.loc.i; walk({ t: 'temp', i });
    drive(car.id, { t: 'stall', lane: j.lane, idx: e.idx }, null, j.side,
      () => { S.temps[i].car = null; dropRestowEntry(car.id); S.lanes[j.lane].cars[e.idx] = car.id; }, () => placeInStall(car, j.lane, e.idx));
    walk({ t: 'stand' }, null, j.side); j.depth = e.depth;
  } else if (j.type === 'greet') {
    if (!car || car.loc.t !== 'curb' || !g || g.state !== 'curbDrop') return { refuse: '' };
    const k = car.loc.k; walk({ t: 'curb', k }); act(() => { g.state = 'greeting'; }); wait(SPD.greetSec, 'GREET'); act(() => greetLimo(car, g));
  } else if (j.type === 'fetch') {
    if (!car || !g || (g.state !== 'pickWait' && g.state !== 'pickWalk')) return { refuse: '' };
    const k = freeCurb(j.id); if (k < 0) return { wait: 'CURB FULL' };
    if (car.loc.t === 'temp') {
      const i = car.loc.i; walk({ t: 'temp', i });
      drive(car.id, { t: 'curb', k }, null, null, () => { S.temps[i].car = null; dropRestowEntry(car.id); S.curb[k].res = null; S.curb[k].car = car.id; }, () => carAtCurbForPickup(car, g, k));
    } else if (car.loc.t === 'stall') {
      const { lane, idx } = car.loc; const d = liveDepth(lane, idx); const side = d.side; const L = S.lanes[lane];
      const blockers = []; if (side === 'west') { for (let x = 0; x < idx; x++) if (L.cars[x] !== null) blockers.push(x); } else { for (let x = NS - 1; x > idx; x--) if (L.cars[x] !== null) blockers.push(x); }
      const free = freeTemps(j.id);
      if (blockers.length > free.length) return { refuse: 'NO ROOM TO DIG OUT - FREE A TEMP SLOT' };
      const endNode = NODES.get(nk(aisleX(side), laneY(lane)));
      const chosen = free.map(i => ({ i, d: pathLen(graphPath(nk(endNode.x, endNode.y), nk(TEMPS[i].x, TEMPS[i].y))) })).sort((a, b) => a.d - b.d).slice(0, blockers.length).map(o => o.i);
      if (!dry) { S.curb[k].res = j.id; chosen.forEach(i => (S.temps[i].res = j.id)); }
      const restow = [];
      blockers.forEach((bx, n) => { const bid = L.cars[bx]; const bcar = S.cars.get(bid); const ti = chosen[n];
        walk({ t: 'stall', lane, idx: bx }, side);
        drive(bid, { t: 'temp', i: ti }, side, null, () => { L.cars[bx] = null; L.res[bx] = bid; }, () => placeInTemp(bcar, ti));
        restow.unshift({ carId: bid, lane, idx: bx, side }); });
      walk({ t: 'stall', lane, idx }, side);
      drive(car.id, { t: 'curb', k }, side, null, () => { L.cars[idx] = null; S.curb[k].res = null; S.curb[k].car = car.id; }, () => carAtCurbForPickup(car, g, k));
      if (restow.length) act(() => { S.jobs.splice(1, 0, { id: nid(), type: 'restow', list: restow, carMoved: false }); });
      j.blockers = blockers.length; j.depth = d.best;
    } else return { refuse: '' };
  } else if (j.type === 'restow') {
    const items = j.list.filter(e => !e.done);
    if (S.boost.spareKeys > 0 && !dry) { act(() => { S.boost.spareKeys--; for (const e of items) { const c = S.cars.get(e.carId); if (c && c.loc.t === 'temp') { S.temps[c.loc.i].car = null; placeInStall(c, e.lane, e.idx); } else { S.lanes[e.lane].res[e.idx] = null; } e.done = true; } floater('SPARE KEYS!', MAP.standX, 60, PAL.peach); }); return { steps, est: 0 }; }
    for (const e of items) { const c = S.cars.get(e.carId); if (!c || c.loc.t !== 'temp') continue; const i = c.loc.i;
      walk({ t: 'temp', i });
      drive(c.id, { t: 'stall', lane: e.lane, idx: e.idx }, null, e.side, () => { S.temps[i].car = null; S.lanes[e.lane].cars[e.idx] = c.id; S.lanes[e.lane].res[e.idx] = null; e.done = true; }, () => placeInStall(c, e.lane, e.idx)); }
    walk({ t: 'stand' });
  }
  return { steps, est };
}
function estimateFor(j) { const from = S.valet.job ? { t: 'stand' } : S.valet.loc; const p = plan(j, from, true); return p.steps ? p.est : null; }

function startNextJob() {
  const v = S.valet;
  for (let n = 0; n < S.jobs.length; n++) {
    const j = S.jobs[n]; if (j.aborted) { S.jobs.splice(n--, 1); continue; }
    const p = plan(j, v.loc, false);
    if (p.refuse !== undefined) { if (p.refuse) { toast(p.refuse); Sound.sfx('deny'); } releaseJob(j); S.jobs.splice(n--, 1); continue; }
    if (p.wait) { j.waitMsg = p.wait; continue; }
    j.waitMsg = null; j.steps = p.steps; j.est = p.est; j.si = 0; j.elapsed = 0; j.phase = 0; j.startT = S.t;
    S.jobs.splice(n, 1); S.jobs.unshift(j); v.job = j; return;
  }
}
function endJob(j) {
  const v = S.valet; const i = S.jobs.indexOf(j); if (i >= 0) S.jobs.splice(i, 1); v.job = null; v.inCar = null; releaseJob(j);
  if (!j.aborted) { const actual = S.t - j.startT; const rec = { type: j.type, label: jobLabel(j), planned: +j.est.toFixed(2), actual: +actual.toFixed(2), depth: j.depth, blockers: j.blockers || 0 };
    JOBLOG.push(rec); if (JOBLOG.length > 200) JOBLOG.shift(); if (DEBUG.on || CONFIG.debug) console.log('[job]', rec.label, 'planned', rec.planned + 's', 'actual', rec.actual + 's'); }
}
const JOBLOG = [];
function dirOf(dx, dy) { if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 0 : 2; return dy >= 0 ? 1 : 3; }
function advanceAlong(o, pts, dist) { // o: {x,y,pi}; returns true when finished
  while (dist > 0 && o.pi < pts.length) { const [tx, ty] = pts[o.pi]; const dx = tx - o.x, dy = ty - o.y; const d = Math.abs(dx) + Math.abs(dy);
    if (d <= dist) { o.x = tx; o.y = ty; o.pi++; dist -= d; } else { const f = dist / d; o.x += dx * f; o.y += dy * f; o.dir = dirOf(dx, dy); dist = 0; } }
  return o.pi >= pts.length;
}
function runValet(dt) {
  const v = S.valet; if (!v.job) startNextJob(); const j = v.job; if (!j) { v.walking = false; return; }
  j.elapsed += dt; let budget = dt;
  while (budget > 0 && v.job === j) {
    const st = j.steps[j.si]; if (!st) { endJob(j); break; }
    const m = speedMult();
    if (st.k === 'do') { st.fn(); j.si++; continue; }
    if (st.k === 'wait') { st.t = (st.t || 0) + budget; budget = 0; v.walking = false; v.waitLabel = st.label; if (st.t >= st.sec) { budget = st.t - st.sec; j.si++; v.waitLabel = null; } continue; }
    if (st.k === 'walk') {
      if (!st.started) { st.started = true; v.pi = 1; v.x = st.pts[0][0]; v.y = st.pts[0][1]; }
      const speed = SPD.tilePx / SPD.walkPerTileSec * m; v.walking = true;
      const before = budget; const o = { x: v.x, y: v.y, pi: v.pi, dir: v.dir }; const done = advanceAlong(o, st.pts, speed * budget); v.x = o.x; v.y = o.y; v.pi = o.pi; v.dir = o.dir;
      if (done) { v.loc = st.to; j.si++; budget = 0; if (j.aborted) { endJob(j); break; } } else budget = 0;
      void before; continue;
    }
    if (st.k === 'drive') {
      const car = S.cars.get(st.carId); if (!car) { j.si++; continue; }
      if (!st.started) { st.started = true; st.ph = 0; st.t = 0; j.carMoved = true; if (st.onStart) st.onStart(); car.loc = { t: 'moving' }; v.inCar = car.id; v.walking = false; v.pi = 1; v.x = st.pts[0][0]; v.y = st.pts[0][1]; Sound.sfx('door'); }
      const half = SPD.driveBaseSec / 2 / m;
      if (st.ph === 0) { st.t += budget; budget = 0; if (st.t >= half) { budget = st.t - half; st.ph = 1; } continue; }
      if (st.ph === 1) { const speed = SPD.tilePx / SPD.drivePerTileSec * m; const o = { x: v.x, y: v.y, pi: v.pi, dir: car.dir }; const done = advanceAlong(o, st.pts, speed * budget);
        v.x = o.x; v.y = o.y; v.pi = o.pi; car.x = o.x; car.y = o.y; car.dir = o.dir; budget = 0; v.engineT = (v.engineT || 0) - dt; if (v.engineT <= 0) { Sound.sfx('engine'); v.engineT = 0.12; }
        if (Math.random() < 0.3) puff(car); if (done) { st.ph = 2; st.t = 0; } continue; }
      if (st.ph === 2) { st.t += budget; budget = 0; if (st.t >= half) { budget = st.t - half; if (st.onEnd) st.onEnd(); v.loc = st.to; v.inCar = null; j.si++; } continue; }
    }
  }
}
