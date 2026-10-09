'use strict';
/* In-game hit targets and pointer/keyboard dispatch. */

/* ---- input: tap-target then tap-destination, nearest hitbox wins ---- */
function hitTargets() {
  const T = [];
  const add = (x, y, w, h, pri, fn) => {
    const cx = x + w / 2,
      cy = y + h / 2;
    const W = Math.max(16, w),
      H = Math.max(16, h);
    T.push({ x: cx - W / 2, y: cy - H / 2, w: W, h: H, cx, cy, pri, fn });
  };
  if (DEBUG.on) debugButtons().forEach(b => add(b.x, b.y, b.w, 8, 9, b.fn));
  if (S.phase !== 'play') {
    add(0, 0, 320, 180, 0, () => {
      if (S.endT > 1.5) finishRun();
    });
    return T;
  }
  add(308, 170, 10, 10, 5, () => {
    UI.paused = true;
  });
  add(294, 170, 10, 10, 5, toggleMute);
  if (canClockOut()) add(226, 158, 88, 12, 5, clockOut);
  if (!S.tutorial) {
    add(2, 124, 28, 44, 5, crewButton);
    for (const b of crewTabs()) if (b.w) add(b.x, b.y, b.w_, b.h, 6, () => selectWorker(b.w));
  }
  if (heliVisible() && S.heli.phase !== 'leaving') add(PAD.x - 18, PAD.y - 18, 36, 36, 5, tapHeli);
  if (S.helpers.length)
    for (const w of workers())
      if (!w.inCar && !w.leaving) add(w.x + (w.off || 0) - 4, w.y - 10, 8, 12, 6, () => selectWorker(w));
  for (const { g, y } of boardRows().rows) add(222, y, 96, 9, 5, () => tapGuest(g));
  for (let i = 0; i < slotsAllowed(); i++) if (S.cards[i]) add(178 + i * 12, 1, 9, 8, 5, () => armCard(i));
  for (const q of queueItems()) {
    add(q.x, 172, q.w, 8, 5, () => promoteJob(q.j));
    add(q.x + q.w + 1, 172, 5, 8, 6, () => cancelJob(q.j));
  }
  PREMS.forEach((p, i) => add(p.x - 10, p.y - 7, 20, 14, 1, () => tapPremiumPad(i)));
  eventTargets(add);
  compMenuTargets(add);
  const o = selectionOptions();
  for (const m of o.menu) add(m.x, m.y, m.w, 9, 5, m.fn);
  for (const s of o.stalls)
    if (!s.bad)
      add(...optionRect(s), 4, () => {
        if (enqueue(s.job)) {
          if (s.job.type === 'park') {
            const g = S.guests.get(S.cars.get(s.job.carId).guestId);
            if (g) g.claimed = true;
          }
          S.selected = null;
        }
      });
  for (const g of S.guests.values())
    if (WAITING.has(g.state) && g.state !== 'queued') add(g.x + crowdOff(g) - 2, g.y - 1, 9, 11, 2, () => tapGuest(g));
  for (const car of S.cars.values()) {
    const g = S.guests.get(car.guestId);
    if (!g) continue;
    if (car.loc.t === 'curb' || isParked(car))
      add(car.x - 8, car.y - 4, 16, 8, car.loc.t === 'stall' ? 1 : 3, () => tapCar(car, g));
  }
  S.streetQueue.slice(0, LOT.streetQueueMax).forEach(id => {
    const c = S.cars.get(id);
    add(c.x - 8, c.y - 4, 16, 8, 3, () => tapGuest(S.guests.get(c.guestId)));
  });
  add(0, 0, 320, 180, 0, () => {
    S.selected = null;
    S.armed = null;
  });
  return T;
}
function toggleMute() {
  Sound.setMuted(!Sound.muted);
  SAVE.muted = Sound.muted;
  writeSave();
}
function pointerAt(e) {
  const r = cv.getBoundingClientRect();
  return [((e.clientX - r.left) / r.width) * 320, ((e.clientY - r.top) / r.height) * 180];
}
function dispatch(T, x, y) {
  const hits = T.filter(t => x >= t.x && x < t.x + t.w && y >= t.y && y < t.y + t.h);
  if (!hits.length) return;
  const top = Math.max(...hits.map(h => h.pri));
  const c = hits
    .filter(h => h.pri === top)
    .sort((a, b) => Math.hypot(a.cx - x, a.cy - y) - Math.hypot(b.cx - x, b.cy - y))[0];
  c.fn();
}
cv.addEventListener('pointerdown', e => {
  e.preventDefault();
  Sound.unlock();
  if (UI.screen === 'game' && !UI.paused) Sound.startMusic();
  const [x, y] = pointerAt(e);
  if (UI.screen === 'game' && S && S.tutorial && !UI.paused && tutTap(x, y)) return;
  if (UI.screen === 'game') compMenuTapAway(x, y);
  dispatch(currentTargets(), x, y);
});
document.addEventListener('keydown', e => {
  if (e.key === '`' && DEBUG.enabled) DEBUG.on = !DEBUG.on;
  if (UI.screen !== 'game' || !S) return;
  if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') UI.paused = !UI.paused;
  if (e.key === 'Tab' && !UI.paused && !S.tutorial) {
    e.preventDefault();
    cycleWorker();
  }
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= 5 && !UI.paused) armCard(n - 1);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && UI.screen === 'game') UI.paused = true;
});
// Active screen's tap targets: its menu buttons if it has any, otherwise its own targets().
function currentTargets() {
  const sc = SCREENS[UI.screen];
  const bs = sc.buttons ? sc.buttons() : [];
  if (bs.length || !sc.targets)
    return bs.map(b => ({
      x: b.x,
      y: b.y - 2,
      w: b.w,
      h: (b.h || 12) + 4,
      cx: b.x + b.w / 2,
      cy: b.y + 6,
      pri: 5,
      fn: () => {
        Sound.sfx('click');
        b.fn();
      },
    }));
  return sc.targets();
}
