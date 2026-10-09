'use strict';
/* Debug overlay (?debug=1 + backtick, or the title screen's DEBUG menu). Collapsed it is one small strip in
   the top bar (DBG xSPEED / QUIT, over the HI score); DBG opens the full panel under it. Buttons that start
   something you want to watch (events, FILL, EVENT) close the panel again. */
const DBG_TAB = { x: 238, y: 1 };
// Leave debug mode: real speed and odds, overlay off, back to the title (the test shift is abandoned).
function quitDebug() {
  Object.assign(DEBUG, { on: false, open: false, enabled: false, alwaysEvents: false, scale: 1, hit: false });
  UI.paused = false;
  goScreen('title');
  Sound.stopMusic();
}
function debugTabButtons() {
  const tab = [
    ['DBG X' + DEBUG.scale, () => (DEBUG.open = !DEBUG.open)],
    ['QUIT', quitDebug],
  ];
  let x = DBG_TAB.x;
  return tab.map(([label, fn]) => {
    const w = textW(label) + 4;
    const b = { x, y: DBG_TAB.y, w, label, fn };
    x += w + 2;
    return b;
  });
}
// Run fn, then fold the panel away so the result is visible.
const andClose = fn => () => {
  fn();
  DEBUG.open = false;
};
function debugButtons() {
  const b = debugTabButtons();
  if (!DEBUG.open) return b;
  let y = 12;
  const row = items => {
    let x = 222;
    for (const [l, fn] of items) {
      const w = textW(l) + 4;
      b.push({ x, y, w, label: l, fn });
      x += w + 2;
    }
    y += 10;
  };
  const speeds = [0.25, 0.5, 1, 2, 4];
  row([
    [
      'SPD-',
      () => {
        DEBUG.scale = speeds[Math.max(0, speeds.indexOf(DEBUG.scale) - 1)];
      },
    ],
    [
      'SPD+',
      () => {
        DEBUG.scale = speeds[Math.min(4, speeds.indexOf(DEBUG.scale) + 1)];
      },
    ],
    [
      'EVENT',
      andClose(() => {
        S.t = phaseStart(PHASES().findIndex(p => p.event)); // jump to the rush-event wave
      }),
    ],
  ]);
  row([
    [
      'H-10',
      () => {
        S.heat = Math.max(0, S.heat - 10);
        enforceSlots();
      },
    ],
    ['H+10', () => addHeat(10 / (1 + S.heat / 100), 'DEBUG.')],
    [
      'H90',
      () => {
        S.heat = 90;
        enforceSlots();
      },
    ],
  ]);
  row([
    ['B', () => spawnArrival('beater')],
    ['S', () => spawnArrival('standard')],
    ['P', () => spawnArrival('premium')],
    ['W', () => spawnArrival('whale')],
    ['U', () => spawnArrival('ultra')],
    ['L', () => spawnArrival('limo')],
  ]);
  row([
    [
      'FILL',
      andClose(() => {
        for (let l = 0; l < NL; l++)
          for (const s of LOT_SIDES) {
            let e;
            while ((e = entryIndex(l, s))) {
              const g = makeGuest('beater', 0);
              placeInStall(S.cars.get(g.carId), l, e.idx);
              g.state = 'inside';
              g.stay = 999;
            }
          }
      }),
    ],
    [
      'GRANT',
      () => {
        const k = Object.keys(POWER_INFO)[DEBUG.grant++ % 10];
        grantCard(k);
      },
    ],
    [
      'HIT',
      () => {
        DEBUG.hit = !DEBUG.hit;
      },
    ],
    [
      'XP+1K',
      () => {
        SAVE.careerXP += 1000;
        syncRank();
        writeSave();
      },
    ],
  ]);
  // fun events: each event file offers its own trigger buttons (events/director.js eventDebugButtons)
  row(eventDebugButtons().map(([l, fn]) => [l, andClose(fn)]));
  row([
    ['END EV', andClose(debugEndEvent)],
    [
      DEBUG.alwaysEvents ? 'ODDS:ALL' : 'ODDS:LIVE',
      () => {
        DEBUG.alwaysEvents = !DEBUG.alwaysEvents;
      },
    ],
  ]);
  return b;
}
function renderDebug() {
  const btns = debugButtons();
  const tab = btns.slice(0, 2);
  R(DBG_TAB.x - 2, 0, 320 - DBG_TAB.x + 2, 10, PAL.ink); // strip covers the HI score
  const ev = activeEvent();
  if (DEBUG.open) {
    const panel = btns.slice(2);
    const bottom = Math.max(...panel.map(b => b.y)) + 10;
    R(220, 10, 100, bottom + 8, PAL.ink);
    drawText(ctx, 'HEAT ' + S.heat.toFixed(1), 222, bottom, PAL.lime);
    if (ev || S.events.cooldown > 0)
      drawText(
        ctx,
        ev ? 'EV ' + ev.id + ' ' + (ev.phase || '') : 'EV WAIT ' + Math.ceil(S.events.cooldown),
        222,
        bottom + 8,
        PAL.yellow,
      );
  }
  for (const b of btns) {
    const col = tab.includes(b) && b.label === 'QUIT' ? PAL.yellow : PAL.lime;
    RB(b.x, b.y, b.w, 8, col);
    drawText(ctx, b.label, b.x + 2, b.y + 2, col);
  }
  if (!DEBUG.open && ev) R(318, 1, 1, 8, PAL.yellow); // an event is running
  for (const g of S.guests.values())
    if (WAITING.has(g.state) && g.state !== 'queued')
      drawText(ctx, Math.round((100 * g.wait) / g.patience) + '%', g.x, g.y + 10, PAL.lime);
  if (DEBUG.hit) {
    for (const t of hitTargets()) RB(t.x, t.y, t.w, t.h, PAL.blue);
    for (const n of NODES.values()) R(n.x, n.y, 1, 1, PAL.lime);
  }
}
