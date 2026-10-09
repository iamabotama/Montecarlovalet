'use strict';
/* Job runner: advances each worker through its planned steps every tick. */

function startNextJob(v) {
  for (let n = 0; n < S.jobs.length; n++) {
    const j = S.jobs[n];
    if (j.aborted && !j.worker) {
      S.jobs.splice(n--, 1);
      continue;
    }
    if (j.worker || j.wid !== v.id) continue;
    if (laneBusy(j, v)) {
      j.waitMsg = t('wait.laneBusy');
      continue;
    }
    const p = plan(j, v.loc, false, v);
    if (p.refuse !== undefined) {
      if (p.refuse) {
        toast(p.refuse);
        Sound.sfx('deny');
      }
      releaseJob(j);
      S.jobs.splice(n--, 1);
      continue;
    }
    if (p.wait) {
      j.waitMsg = p.wait;
      continue;
    }
    j.waitMsg = null;
    j.steps = p.steps;
    j.est = p.est;
    j.si = 0;
    j.elapsed = 0;
    j.phase = 0;
    j.startT = S.t;
    S.jobs.splice(n, 1);
    S.jobs.unshift(j);
    v.job = j;
    j.worker = v;
    claimSecondWind(v, j);
    return;
  }
}
function endJob(j) {
  const v = j.worker || S.valet;
  const i = S.jobs.indexOf(j);
  if (i >= 0) S.jobs.splice(i, 1);
  v.job = null;
  v.inCar = null;
  j.worker = null;
  releaseJob(j);
  if (!j.aborted) {
    if (v.memberId) v.jobsDone++;
    const actual = S.t - j.startT;
    const rec = {
      type: j.type,
      label: jobLabel(j),
      planned: +j.est.toFixed(2),
      actual: +actual.toFixed(2),
      depth: j.depth,
      blockers: j.blockers || 0,
    };
    JOBLOG.push(rec);
    if (JOBLOG.length > 200) JOBLOG.shift();
    if (DEBUG.on || CONFIG.debug)
      console.log('[job]', rec.label, 'planned', rec.planned + 's', 'actual', rec.actual + 's');
  }
}
const JOBLOG = [];
function dirOf(dx, dy) {
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 0 : 2;
  return dy >= 0 ? 1 : 3;
}
function advanceAlong(o, pts, dist) {
  // o: {x,y,pi}; returns true when finished
  while (dist > 0 && o.pi < pts.length) {
    const [tx, ty] = pts[o.pi];
    const dx = tx - o.x,
      dy = ty - o.y;
    const d = Math.abs(dx) + Math.abs(dy);
    if (d <= dist) {
      o.x = tx;
      o.y = ty;
      o.pi++;
      dist -= d;
    } else {
      const f = dist / d;
      o.x += dx * f;
      o.y += dy * f;
      o.dir = dirOf(dx, dy);
      dist = 0;
    }
  }
  return o.pi >= pts.length;
}
function runValet(dt) {
  for (const w of workers()) runWorker(w, dt);
  updateCrew(dt);
}
function runWorker(v, dt) {
  if (v.arriveT > 0 || v.away) return; // away: an event has him (events/joyride.js)
  if (!v.job) startNextJob(v);
  const j = v.job;
  if (!j) {
    v.walking = false;
    return;
  }
  j.elapsed += dt;
  let budget = dt;
  while (budget > 0 && v.job === j) {
    const st = j.steps[j.si];
    if (!st) {
      endJob(j);
      break;
    }
    const m = speedMult() * v.speed * jobWind(j);
    if (st.k === 'do') {
      st.fn();
      j.si++;
      continue;
    }
    if (st.k === 'until') {
      if (st.fn()) {
        j.si++;
        v.waitLabel = null;
        continue;
      }
      v.walking = false;
      v.waitLabel = st.label;
      budget = 0;
      continue;
    }
    if (st.k === 'wait' && st.skip && st.skip()) {
      j.si++;
      continue;
    }
    if (st.k === 'wait') {
      st.t = (st.t || 0) + budget;
      budget = 0;
      v.walking = false;
      v.waitLabel = st.label;
      if (st.t >= st.sec) {
        budget = st.t - st.sec;
        j.si++;
        v.waitLabel = null;
      }
      continue;
    }
    if (st.k === 'walk') {
      if (!st.started) {
        st.started = true;
        v.pi = 1;
        v.x = st.pts[0][0];
        v.y = st.pts[0][1];
      }
      const speed = (SPD.tilePx / SPD.walkPerTileSec) * m * valetWalkRate();
      v.walking = true;
      const before = budget;
      const o = { x: v.x, y: v.y, pi: v.pi, dir: v.dir };
      const done = advanceAlong(o, st.pts, speed * budget);
      v.x = o.x;
      v.y = o.y;
      v.pi = o.pi;
      v.dir = o.dir;
      if (done) {
        v.loc = st.to;
        j.si++;
        budget = 0;
        if (j.aborted) {
          endJob(j);
          break;
        }
      } else budget = 0;
      void before;
      continue;
    }
    if (st.k === 'drive') {
      const car = S.cars.get(st.carId);
      if (!car) {
        j.si++;
        continue;
      }
      if (!st.started) {
        st.started = true;
        st.ph = 0;
        st.t = 0;
        j.carMoved = true;
        if (st.onStart) st.onStart();
        if (j.type === 'park' && eventHook('parkDriveStart', v, car, j, st)) break; // event took the car
        car.loc = { t: 'moving' };
        v.inCar = car.id;
        v.walking = false;
        v.pi = 1;
        v.x = st.pts[0][0];
        v.y = st.pts[0][1];
        Sound.sfx('door');
      }
      const half = SPD.driveBaseSec / 2 / (m * driveMult() * vehicleSpeed(car));
      if (st.ph === 0) {
        st.t += budget;
        budget = 0;
        if (st.t >= half) {
          budget = st.t - half;
          st.ph = 1;
        }
        continue;
      }
      if (st.ph === 1) {
        const speed = (SPD.tilePx / SPD.drivePerTileSec) * m * driveMult() * vehicleSpeed(car);
        const o = { x: v.x, y: v.y, pi: v.pi, dir: car.dir };
        const done = advanceAlong(o, st.pts, speed * budget);
        v.x = o.x;
        v.y = o.y;
        v.pi = o.pi;
        car.x = o.x;
        car.y = o.y;
        car.dir = o.dir;
        budget = 0;
        v.engineT = (v.engineT || 0) - dt;
        if (v.engineT <= 0) {
          Sound.sfx('engine');
          v.engineT = 0.12;
        }
        if (Math.random() < 0.3) puff(car);
        if (done) {
          st.ph = 2;
          st.t = 0;
        }
        continue;
      }
      if (st.ph === 2) {
        st.t += budget;
        budget = 0;
        if (st.t >= half) {
          budget = st.t - half;
          if (st.onEnd) st.onEnd();
          v.loc = st.to;
          v.inCar = null;
          j.si++;
        }
        continue;
      }
    }
  }
}
