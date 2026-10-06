'use strict';
/* Job planner: turns a job into concrete walk/drive/wait steps with time estimates. */

// Planner: builds steps with precomputed paths from the valet's location; returns {steps, est} | {refuse} | {wait}
function plan(j, from, dry, w) {
  const m = speedMult() * (w ? w.speed : 1);
  let cur = from;
  const steps = [];
  let est = 0;
  const walk = (to, sideB, sideA) => {
    const r = route(cur, to, sideA, sideB);
    if (r.len > 0) {
      steps.push({ k: 'walk', pts: r.pts, to });
      est += walkSec(r.len, m);
    }
    cur = to;
    return r;
  };
  const drive = (carId, to, sideA, sideB, onStart, onEnd) => {
    const r = route(cur, to, sideA, sideB);
    steps.push({ k: 'drive', carId, pts: r.pts, to, onStart, onEnd });
    est += driveSec(r.len, m);
    cur = to;
  };
  const wait = (sec, label) => {
    steps.push({ k: 'wait', sec: sec / m, label });
    est += sec / m;
  };
  const act = fn => steps.push({ k: 'do', fn });
  const car = S.cars.get(j.carId);
  const g = car ? S.guests.get(car.guestId) : null;
  if (j.type === 'park') {
    if (!car || car.loc.t !== 'curb' || !g || g.state !== 'curbDrop') return { refuse: '' };
    const e = parkTarget(j, dry);
    if (!e) return { refuse: parkRefusal(j) };
    const k = car.loc.k;
    walk({ t: 'curb', k });
    act(() => reachCarAtCurb(car, g, j.bags));
    if (j.bags) wait(SPD.bagsExtraSec, 'BAGS');
    drive(
      car.id,
      { t: 'stall', lane: j.lane, idx: e.idx },
      null,
      j.side,
      () => {
        S.curb[k].car = null;
        if (j.vip) takeVipHold();
        S.lanes[j.lane].cars[e.idx] = car.id;
      },
      () => {
        placeInStall(car, j.lane, e.idx);
        S.stats.carsParked++;
      },
    );
    walk({ t: 'stand' }, null, j.side);
    j.depth = e.depth;
  } else if (j.type === 'move') {
    if (!car || car.loc.t !== 'temp') return { refuse: '' };
    const e = parkTarget(j, dry);
    if (!e) return { refuse: parkRefusal(j) };
    const i = car.loc.i;
    walk({ t: 'temp', i });
    drive(
      car.id,
      { t: 'stall', lane: j.lane, idx: e.idx },
      null,
      j.side,
      () => {
        S.temps[i].car = null;
        dropRestowEntry(car.id);
        if (j.vip) takeVipHold();
        S.lanes[j.lane].cars[e.idx] = car.id;
      },
      () => placeInStall(car, j.lane, e.idx),
    );
    walk({ t: 'stand' }, null, j.side);
    j.depth = e.depth;
  } else if (j.type === 'greet') {
    if (!car || car.loc.t !== 'curb' || !g || g.state !== 'curbDrop') return { refuse: '' };
    const k = car.loc.k;
    walk({ t: 'curb', k });
    act(() => {
      g.state = 'greeting';
    });
    wait(SPD.greetSec, 'GREET');
    act(() => greetLimo(car, g));
  } else if (j.type === 'heli') {
    const H = S.heli;
    if (!H || (H.phase !== 'incoming' && H.phase !== 'landed') || H.greeting) return { refuse: '' };
    walk({ t: 'pad' });
    steps.push({ k: 'until', fn: () => S.heli.phase !== 'incoming', label: 'HELI' });
    act(() => {
      if (S.heli.phase === 'landed') S.heli.greeting = true;
    });
    steps.push({ k: 'wait', sec: CONFIG.helo.greetSec / m, label: 'GREET', skip: () => !S.heli.greeting });
    est += CONFIG.helo.greetSec / m;
    act(() => {
      if (S.heli.greeting) heliGreet();
    });
    walk({ t: 'stand' });
  } else if (j.type === 'fetch') {
    if (!car || !g || (g.state !== 'pickWait' && g.state !== 'toSpot')) return { refuse: '' };
    const k = freeCurb(j.id);
    if (k < 0) return { wait: 'CURB FULL' };
    if (car.loc.t === 'temp') {
      const i = car.loc.i;
      if (!dry) S.curb[k].res = j.id;
      walk({ t: 'temp', i });
      drive(
        car.id,
        { t: 'curb', k },
        null,
        null,
        () => {
          S.temps[i].car = null;
          dropRestowEntry(car.id);
          S.curb[k].res = null;
          S.curb[k].car = car.id;
        },
        () => carAtCurbForPickup(car, g, k),
      );
    } else if (car.loc.t === 'stall') {
      const { lane, idx } = car.loc;
      const d = liveDepth(lane, idx);
      const side = d.side;
      const L = S.lanes[lane];
      const blockers = [];
      if (side === 'west') {
        for (let x = 0; x < idx; x++) if (L.cars[x] !== null) blockers.push(x);
      } else {
        for (let x = NS - 1; x > idx; x--) if (L.cars[x] !== null) blockers.push(x);
      }
      const free = freeTemps(j.id);
      if (blockers.length > free.length) return { refuse: 'NO ROOM TO DIG OUT - FREE A TEMP SLOT' };
      const endNode = NODES.get(nk(aisleX(side), laneY(lane)));
      const chosen = free
        .map(i => ({ i, d: pathLen(graphPath(nk(endNode.x, endNode.y), nk(TEMPS[i].x, TEMPS[i].y))) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, blockers.length)
        .map(o => o.i);
      if (!dry) {
        S.curb[k].res = j.id;
        chosen.forEach(i => (S.temps[i].res = j.id));
      }
      const restow = [];
      blockers.forEach((bx, n) => {
        const bid = L.cars[bx];
        const bcar = S.cars.get(bid);
        const ti = chosen[n];
        walk({ t: 'stall', lane, idx: bx }, side);
        drive(
          bid,
          { t: 'temp', i: ti },
          side,
          null,
          () => {
            L.cars[bx] = null;
            L.res[bx] = bid;
          },
          () => placeInTemp(bcar, ti),
        );
        restow.unshift({ carId: bid, lane, idx: bx, side });
      });
      walk({ t: 'stall', lane, idx }, side);
      drive(
        car.id,
        { t: 'curb', k },
        side,
        null,
        () => {
          L.cars[idx] = null;
          S.curb[k].res = null;
          S.curb[k].car = car.id;
        },
        () => carAtCurbForPickup(car, g, k),
      );
      if (restow.length)
        act(() => {
          S.jobs.splice(S.jobs.indexOf(j) + 1, 0, {
            id: nid(),
            type: 'restow',
            list: restow,
            carMoved: false,
            wid: j.wid,
          });
        });
      j.blockers = blockers.length;
      j.depth = d.best;
    } else return { refuse: '' };
  } else if (j.type === 'restow') {
    const items = j.list.filter(e => !e.done);
    if (S.boost.spareKeys > 0 && !dry) {
      act(() => {
        S.boost.spareKeys--;
        for (const e of items) {
          const c = S.cars.get(e.carId);
          if (c && c.loc.t === 'temp') {
            S.temps[c.loc.i].car = null;
            placeInStall(c, e.lane, e.idx);
          } else {
            S.lanes[e.lane].res[e.idx] = null;
          }
          e.done = true;
        }
        floater('SPARE KEYS!', MAP.standX, 60, PAL.peach);
      });
      return { steps, est: 0 };
    }
    for (const e of items) {
      const c = S.cars.get(e.carId);
      if (!c || c.loc.t !== 'temp') continue;
      const i = c.loc.i;
      walk({ t: 'temp', i });
      drive(
        c.id,
        { t: 'stall', lane: e.lane, idx: e.idx },
        null,
        e.side,
        () => {
          S.temps[i].car = null;
          S.lanes[e.lane].cars[e.idx] = c.id;
          S.lanes[e.lane].res[e.idx] = null;
          e.done = true;
        },
        () => placeInStall(c, e.lane, e.idx),
      );
    }
    walk({ t: 'stand' });
  }
  return { steps, est };
}
function estimateFor(j) {
  const w = activeWorker();
  const from = w.job ? { t: 'stand' } : w.loc;
  const p = plan(j, from, true, w);
  return p.steps ? p.est : null;
}
// Where a park/move job puts the car: the deepest free stall of that row end, or the RESERVED hold.
function parkTarget(j, dry) {
  return j.vip ? vipHoldTarget() : entryIndex(j.lane, j.side, dry ? pendingParks(j.lane, j.side, j) : 0);
}
const parkRefusal = j =>
  j.vip ? 'THE VIP SPOT WAS RELEASED' : 'LANE ' + LANE_NAMES[j.lane] + ' ' + j.side.toUpperCase() + ' IS FULL';
