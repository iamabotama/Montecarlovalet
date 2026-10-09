'use strict';
/* Debug menu (title screen corner button, shown while CONFIG.debugMenu is on). Developer tool, English only.
   Pick a hotel, then a scenario: it starts a shift there (or uses the running one), jumps to a wave where
   pickups happen, opens the debug overlay and fires the scenario. Fun events list themselves here
   automatically from their own `debug` buttons (events/director.js eventDebugButtons). */
const DBG_MENU = { hotel: null };
// The title screen's corner button (none when CONFIG.debugMenu is off).
const debugTitleButtons = () =>
  CONFIG.debugMenu ? [button(4, 4, 40, 'DEBUG', () => goScreen('debugMenu'), PAL.lgrey)] : [];

// 'drunkDriver' -> 'Drunk driver'
const debugEventName = id =>
  id
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase()
    .replace(/^./, c => c.toUpperCase())
    .replace(/^Vip /, 'VIP ');
// Core scenarios that are not fun events: helicopter now, jump to a wave.
function debugCoreScenarios() {
  const jump = id => () => {
    S.t = phaseTime(id, 0);
  };
  return [
    [
      'Helicopter now',
      () => {
        if (!PAD) return;
        S.heli = newHeliState() || S.heli;
        if (S.heli) Object.assign(S.heli, { phase: 'wait', at: S.t + 2 });
      },
    ],
    [
      'Upset whale (comp)',
      () => {
        const g = spawnArrival('whale');
        g.wait = g.patience * 0.75; // annoyed: tap them for the comp menu once they are at the podium
      },
    ],
    ['End current event', debugEndEvent],
    ['Jump: High Rollers', jump('high')],
    ['Jump: big event wave', jump('event')],
    ['Jump: After Party', jump('after')],
    ['Jump: Last Call', jump('last')],
  ];
}
// Start (or reuse) a shift at the chosen hotel, put it in a pickup-heavy wave, then run the scenario.
// needsPad: helicopter scenarios move to Monte Carlo when the chosen hotel has no helipad.
function debugRun(fn, jumpToPickups, needsPad) {
  let id = DBG_MENU.hotel || HOTEL_ORDER[0];
  if (needsPad && !HOTELS[id].pad) id = 'monte_carlo';
  if (UI.screen !== 'game' || !HOTEL || HOTEL.id !== id) {
    startGame(id);
    if (jumpToPickups) S.t = phaseTime('high', 0.05);
  }
  UI.screen = 'game';
  UI.paused = false;
  DEBUG.enabled = DEBUG.on = true;
  DEBUG.open = false; // just the strip: the scene stays visible
  fn();
}
defineScreen('debugMenu', {
  buttons() {
    const ids = HOTEL_ORDER;
    const cur = DBG_MENU.hotel || ids[0];
    const out = [
      button(
        10,
        26,
        145,
        'Hotel: ' + cur,
        () => (DBG_MENU.hotel = ids[(ids.indexOf(cur) + 1) % ids.length]),
        PAL.yellow,
      ),
      button(165, 26, 70, 'Overlay ' + (DEBUG.on ? 'ON' : 'OFF'), () => {
        DEBUG.enabled = true;
        DEBUG.on = !DEBUG.on;
      }),
      button(240, 26, 70, 'Odds ' + (DEBUG.alwaysEvents ? 'ALL' : 'LIVE'), () => {
        DEBUG.alwaysEvents = !DEBUG.alwaysEvents;
      }),
    ];
    // left column: fun events; right column: core scenarios
    const events = [];
    for (const id in EVENTS)
      for (const label of Object.keys(EVENTS[id].debug || {}))
        events.push([
          debugEventName(id) + ': ' + label,
          () =>
            debugRun(
              () => {
                debugEndEvent();
                EVENTS[id].debug[label]();
              },
              true,
              EVENTS[id].debugNeedsPad,
            ),
        ]);
    events.forEach(([l, fn], i) => out.push(button(10, 56 + i * 14, 145, l, fn)));
    debugCoreScenarios().forEach(([l, fn], i) =>
      out.push(button(165, 56 + i * 14, 145, l, () => debugRun(fn, false, i === 0))),
    );
    out.push(button(60, 162, 80, t('btn.back'), () => goScreen('title')));
    out.push(button(180, 162, 80, 'Quit debug', quitDebug, PAL.yellow));
    return out;
  },
  render() {
    R(0, 0, 320, 180, PAL.night);
    drawText(ctx, 'DEBUG', 160, 8, PAL.lime, { align: 'center' });
    drawText(ctx, 'Fun events', 10, 46, PAL.lgrey);
    drawText(ctx, 'Scenarios', 165, 46, PAL.lgrey);
    drawButtons(this.buttons());
  },
});
