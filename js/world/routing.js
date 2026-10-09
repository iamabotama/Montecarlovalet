'use strict';
/* Routing graph (aisles, curb, street), shortest paths, travel times. */

/* ------------------------------ ROUTING GRAPH ------------------------------ */
const NODES = new Map();
const nk = (x, y) => x + ',' + y;
function addNode(x, y) {
  const k = nk(x, y);
  if (!NODES.has(k)) NODES.set(k, { x, y, adj: new Set() });
  return k;
}
function chainNodes(pts) {
  const ks = pts.map(p => addNode(p[0], p[1]));
  for (let i = 1; i < ks.length; i++) {
    NODES.get(ks[i - 1]).adj.add(ks[i]);
    NODES.get(ks[i]).adj.add(ks[i - 1]);
  }
}
function buildGraph() {
  NODES.clear();
  pathCache.clear();
  const xs = [...new Set([MAP.mouthL, ...MAP.curbX, MAP.standX, MAP.mouthR])].sort((a, b) => a - b);
  chainNodes(xs.map(x => [x, MAP.curbY]));
  chainNodes([
    [MAP.mouthL, MAP.curbY],
    [MAP.mouthL, MAP.streetY],
  ]);
  chainNodes([
    [MAP.mouthR, MAP.curbY],
    [MAP.mouthR, MAP.streetY],
  ]);
  chainNodes([
    [aisleX('west'), MAP.streetY],
    [MAP.mouthL, MAP.streetY],
    [MAP.mouthR, MAP.streetY],
    [aisleX('east'), MAP.streetY],
  ]);
  for (const side of SIDES) {
    const ax = aisleX(side);
    const ys = new Set([MAP.streetY]);
    for (let i = 0; i < NL; i++) ys.add(laneY(i));
    TEMPS.filter(t => t.side === side).forEach(t => ys.add(t.y));
    if (side === 'east' && PAD) ys.add(PAD.y);
    chainNodes([...ys].sort((a, b) => a - b).map(y => [ax, y]));
    TEMPS.filter(t => t.side === side).forEach(t =>
      chainNodes([
        [ax, t.y],
        [t.x, t.y],
      ]),
    );
  }
  if (PAD) chainNodes([[aisleX('east'), PAD.y], PAD_MEET]);
  linkPremiumStalls();
}
const pathCache = new Map();
function graphPath(a, b) {
  const ck = a + '|' + b;
  if (pathCache.has(ck)) return pathCache.get(ck);
  const dist = new Map([[a, 0]]),
    prev = new Map(),
    open = new Set([a]);
  while (open.size) {
    let u = null,
      du = Infinity;
    for (const k of open)
      if (dist.get(k) < du) {
        du = dist.get(k);
        u = k;
      }
    open.delete(u);
    if (u === b) break;
    const nu = NODES.get(u);
    for (const v of nu.adj) {
      const nv = NODES.get(v);
      const d = du + Math.abs(nu.x - nv.x) + Math.abs(nu.y - nv.y);
      if (d < (dist.has(v) ? dist.get(v) : Infinity)) {
        dist.set(v, d);
        prev.set(v, u);
        open.add(v);
      }
    }
  }
  const out = [];
  let c = b;
  while (c) {
    const n = NODES.get(c);
    out.unshift([n.x, n.y]);
    if (c === a) break;
    c = prev.get(c);
  }
  pathCache.set(ck, out);
  return out;
}
// Location descriptors: {t:'stand'} {t:'curb',k} {t:'temp',i} {t:'prem',i} {t:'pad'} {t:'stall',lane,idx}
function locEnds(loc) {
  if (loc.t === 'stand') return [{ node: nk(MAP.standX, MAP.curbY), tail: [[MAP.standX, MAP.standY]] }];
  if (loc.t === 'curb') return [{ node: nk(MAP.curbX[loc.k], MAP.curbY), tail: [] }];
  if (loc.t === 'temp') return [{ node: nk(TEMPS[loc.i].x, TEMPS[loc.i].y), tail: [] }];
  if (loc.t === 'prem') return [{ node: nk(PREMS[loc.i].x, PREMS[loc.i].y), tail: [] }];
  if (loc.t === 'pad') return [{ node: nk(PAD_MEET[0], PAD_MEET[1]), tail: [] }];
  if (loc.t === 'stall') {
    const y = laneY(loc.lane),
      x = stallX(loc.idx);
    return LOT_SIDES.map(side => ({ side, node: nk(aisleX(side), y), tail: [[x, y]] }));
  }
  throw new Error('bad loc');
}
function locPoint(loc) {
  const e = locEnds(loc)[0];
  if (e.tail.length) return e.tail[e.tail.length - 1];
  const n = NODES.get(e.node);
  return [n.x, n.y];
}
function route(a, b, sideA, sideB) {
  let best = null;
  for (const ea of locEnds(a)) {
    if (sideA && ea.side && ea.side !== sideA) continue;
    for (const eb of locEnds(b)) {
      if (sideB && eb.side && eb.side !== sideB) continue;
      const pts = dedupe([...ea.tail.slice().reverse(), ...graphPath(ea.node, eb.node), ...eb.tail]);
      if (a.t === 'stall' && b.t === 'stall' && a.lane === b.lane && !sideA && !sideB) {
        const direct = [locPoint(a), locPoint(b)];
        if (!best || pathLen(direct) < best.len) best = { pts: direct, len: pathLen(direct) };
      }
      const len = pathLen(pts);
      if (!best || len < best.len) best = { pts, len, sideA: ea.side, sideB: eb.side };
    }
  }
  return best;
}
function speedMult() {
  let m = 1;
  if (S.boost.hustle > 0) m = Math.max(m, CONFIG.power.hustleMult);
  if (S.boost.coffee > 0) m = Math.max(m, CONFIG.power.coffeeMult);
  return m;
}
const tiles = len => len / SPD.tilePx;
// Driving is also scaled by the hotel (snow in the Alps); walking is not.
const driveMult = () => HOTEL.mods.driveMult;
const driveSec = (len, m = 1) => (SPD.driveBaseSec + SPD.drivePerTileSec * tiles(len)) / (m * driveMult());
const walkSec = (len, m = 1) => (SPD.walkPerTileSec * tiles(len)) / m;
