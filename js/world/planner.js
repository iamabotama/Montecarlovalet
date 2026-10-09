'use strict';
/* Job planner: turns a job into concrete walk/drive/wait steps with time estimates. */

// Where a park/move job puts the car: a premium stall (j.prem) or the next free stall of a row end.
// Returns { dest, depth } or { refuse }.
const HANDLED_STEPS = new Set(['bags', 'greet']); // hands-on steps sped up by the Fast Hands skill
function parkDest(j, dry) {
  if (j.prem != null)
    return premFree(j.prem, j) ? { dest: { t: 'prem', i: j.prem }, depth: 0 } : { refuse: t('toast.premTaken') };
  const e = parkTarget(j, dry);
  return e ? { dest: { t: 'stall', lane: j.lane, idx: e.idx }, depth: e.depth } : { refuse: parkRefusal(j) };
}
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
    est += driveSec(r.len, m * vehicleSpeed(S.cars.get(carId)));
    cur = to;
  };
  const wait = (sec, label) => {
    if (HANDLED_STEPS.has(label)) sec /= perk('handle'); // Fast Hands
    steps.push({ k: 'wait', sec: sec / m, label });
    est += sec / m;
  };
  const act = fn => steps.push({ k: 'do', fn });
  const car = S.cars.get(j.carId);
  const g = car ? S.guests.get(car.guestId) : null;
  if (j.type === 'park') {
    if (!car || car.loc.t !== 'curb' || !g || g.state !== 'curbDrop') return { refuse: '' };
    const e = parkDest(j, dry);
    if (e.refuse !== undefined) return e;
    const k = car.loc.k;
    walk({ t: 'curb', k });
    act(() => reachCarAtCurb(car, g, j.bags));
    if (j.bags) wait(SPD.bagsExtraSec, 'bags'); // step label (id, not shown)
    drive(
      car.id,
      e.dest,
      null,
      j.side,
      () => {
        S.curb[k].car = null;
        if (j.vip) takeVipHold();
        claimSpot(e.dest, car.id);
      },
      () => {
        putCarAt(car, e.dest);
        S.stats.carsParked++;
      },
    );
    walk({ t: 'stand' }, null, j.side);
    j.depth = e.depth;
  } else if (j.type === 'move') {
    if (!car || !isMovable(car)) return { refuse: car && car.loc.t === 'stall' ? t('toast.moveBlocked') : '' };
    const e = parkDest(j, dry);
    if (e.refuse !== undefined) return e;
    const from = { ...car.loc }; // temp, prem or an unblocked stall
    const out = from.t === 'stall' ? liveDepth(from.lane, from.idx).side : null;
    walk(from, out);
    drive(
      car.id,
      e.dest,
      out,
      j.side,
      () => {
        if (from.t === 'stall') S.lanes[from.lane].cars[from.idx] = null;
        else (from.t === 'temp' ? S.temps : S.prem)[from.i].car = null;
        dropRestowEntry(car.id);
        if (j.vip) takeVipHold();
        claimSpot(e.dest, car.id);
      },
      () => putCarAt(car, e.dest),
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
    wait(SPD.greetSec, 'greet');
    act(() => greetLimo(car, g));
  } else if (j.type === 'errand') {
    // generic event errand (events/actions.js): walk there, wait, act, optionally walk back
    walk(j.to);
    if (j.sec) wait(j.sec, j.label);
    act(() => j.onArrive && j.onArrive(workers().find(x => x.job === j)));
    if (j.back) {
      walk({ t: 'stand' });
      act(() => j.onBack && j.onBack(workers().find(x => x.job === j)));
    }
  } else if (j.type === 'heli') {
    const H = S.heli;
    if (!H || (H.phase !== 'incoming' && H.phase !== 'landed') || H.greeting) return { refuse: '' };
    walk({ t: 'pad' });
    steps.push({ k: 'until', fn: () => S.heli.phase !== 'incoming', label: 'heli' });
    act(() => {
      if (S.heli.phase === 'landed') S.heli.greeting = true;
    });
    steps.push({ k: 'wait', sec: CONFIG.helo.greetSec / m, label: 'greet', skip: () => !S.heli.greeting });
    est += CONFIG.helo.greetSec / m;
    act(() => {
      if (S.heli.greeting) heliGreet();
      j.greetDone = true; // walking back now: no longer "on the way" to the next landing (heliJob)
    });
    walk({ t: 'stand' });
  } else if (j.type === 'fetch') {
    if (!car || !g || (g.state !== 'pickWait' && g.state !== 'toSpot')) return { refuse: '' };
    if (car.loc.t === 'away' || car.loc.t === 'moving') return { wait: t('wait.carAway') }; // not in a spot yet
    const k = freeCurb(j.id);
    if (k < 0) return { wait: t('wait.curbFull') };
    if (car.loc.t === 'temp' || car.loc.t === 'prem') {
      const from = { ...car.loc }; // single-car spot: nothing to dig out
      if (!dry) S.curb[k].res = j.id;
      walk(from);
      drive(
        car.id,
        { t: 'curb', k },
        null,
        null,
        () => {
          (from.t === 'temp' ? S.temps : S.prem)[from.i].car = null;
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
      if (blockers.length > free.length) return { refuse: t('toast.noRoomDigOut') };
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
        floater(t('float.spareKeys'), MAP.standX, 60, PAL.peach);
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
  j.vip ? t('wait.vipReleased') : t('wait.laneFull', { lane: LANE_NAMES[j.lane], side: t('side.' + j.side) });
