'use strict';
/* The short list of things an event may do to the game. Events call these (plus the usual
   earn / addHeat / coolHeat / floater / toast / banner helpers) and never reach into lots, jobs
   or routing directly.
     blockSide(side)                 close one end of every lot row (cars there must be dug out the other way)
     errand(opts)                    send the active valet somewhere (planner job 'errand')
     spawnService(ev, look, pts, speed, onDone) / driveService(v, pts, speed, onDone)
                                     police / tow / motorcade vehicles owned by the event
     sirenOn() / sirenOff()          looping siren while a vehicle has it on
     eventBanner(text)               big centre banner                                                  */
function blockSide(side) {
  setSideBlocked(side, true);
  // queued (not yet started) parks into that end can no longer happen
  for (const j of S.jobs.slice())
    if (!j.worker && (j.type === 'park' || j.type === 'move') && j.side === side && j.prem == null) cancelJob(j);
}
function resetBlockedSides() {
  if (typeof LOT_BASE_SIDES !== 'undefined' && LOT_BASE_SIDES) for (const s of SIDES) setSideBlocked(s, false);
}
// opts: { to: loc, sec, labelKey, tag, onArrive(w), onBack(w), back: true }
function errand(opts) {
  return enqueue({ type: 'errand', back: true, ...opts });
}
function errandPending(tag) {
  return S.jobs.some(j => j.type === 'errand' && j.tag === tag && !j.aborted);
}
function errandWorker(tag) {
  return workers().find(w => w.job && w.job.type === 'errand' && w.job.tag === tag) || null;
}
// A point anywhere, reached from an existing road node: { t: 'pt', x, y, node: [nx, ny] }
const pointLoc = (x, y, node) => ({ t: 'pt', x, y, node });

/* ---- service vehicles (event-owned; drawn with the shared car sprites, look = CAR_LOOKS.service[i]) ---- */
const SERVICE = { police: 0, tow: 1, suv: 2, agent: 3, henchman: 4 };
function spawnService(ev, kind, pts, speed, onDone) {
  const v = { kind, x: pts[0][0], y: pts[0][1], dir: pts[1][0] < pts[0][0] ? 2 : 0, lights: false, mv: null };
  ev.vehicles.push(v);
  driveService(v, pts.slice(1), speed, onDone);
  return v;
}
function driveService(v, pts, speed, onDone) {
  v.mv = { pts, pi: 0, speed, done: onDone };
}
function updateServiceVehicles(ev, dt) {
  for (const v of ev.vehicles) {
    if (v.mv) {
      const o = { x: v.x, y: v.y, pi: v.mv.pi, dir: v.dir };
      const done = advanceAlong(o, v.mv.pts, v.mv.speed * dt);
      Object.assign(v, { x: o.x, y: o.y, dir: o.dir });
      v.mv.pi = o.pi;
      if (done) {
        const cb = v.mv.done;
        v.mv = null;
        if (cb) cb(v);
      }
    }
    if (v.tows) Object.assign(v.tows, { x: v.x - (v.dir === 2 ? -1 : 1) * TOW.hitch, y: v.y, dir: v.dir });
  }
  ev.vehicles = ev.vehicles.filter(v => !v.gone);
}
function drawServiceVehicles(ev) {
  for (const v of ev.vehicles) {
    if (v.kind === 'tow') {
      drawTowTruck(v.x, v.y, v.dir, true); // art/tow_truck.js: amber lights always running on scene
      continue;
    }
    drawCarSprite(ctx, carSprite('service', SERVICE[v.kind], v.dir), v.x, v.y);
    if (v.lights) {
      const on = Math.floor(UI.t * 8) % 2;
      R(v.x - 3, v.y - 1, 3, 2, on ? PAL.red : PAL.white);
      R(v.x, v.y - 1, 3, 2, on ? PAL.white : PAL.blue);
      ctx.globalAlpha = 0.35; // small flash on the road beside the car
      R(v.x + (on ? -6 : 3), v.y - 6, 3, 2, on ? PAL.red : PAL.blue);
      ctx.globalAlpha = 1;
    }
  }
}
/* ---- siren ---- */
const SIREN = { on: false, t: 0 };
function sirenOn() {
  SIREN.on = true;
  SIREN.t = 0;
}
function sirenOff() {
  SIREN.on = false;
}
function updateSiren(dt) {
  if (!SIREN.on) return;
  SIREN.t -= dt;
  if (SIREN.t <= 0) {
    Sound.sfx('siren');
    SIREN.t = 1.2;
  }
}
// Count something an event did, for career awards (data/awards.js reads lifetime L.marks.<key>).
function eventMark(key) {
  S.stats.marks[key] = (S.stats.marks[key] || 0) + 1;
}
function eventShout(who, text, sec) {
  shout(who, text, sec);
}
function eventBanner(text) {
  S.banners.push({ text, t: 3 });
}
