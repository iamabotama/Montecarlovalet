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
    .replace(/^./, c => c.toUpperCase());
// Core scenarios that are not fun events: helicopter now, jump to a wave.
function debugCoreScenarios() {
  const jump = id => () => {
    S.t = phaseTime(id, 0);
  };
  return [
    [
      PAD ? 'Helicopter now' : 'Helicopter (no pad here)',
      () => {
        if (!PAD) return;
        S.heli = newHeliState() || S.heli;
        if (S.heli) Object.assign(S.heli, { phase: 'wait', at: S.t + 2 });
      },
    ],
    ['Jump: High Rollers', jump('high')],
    ['Jump: big event wave', jump('event')],
    ['Jump: After Party', jump('after')],
    ['Jump: Last Call', jump('last')],
  ];
}
// Start (or reuse) a shift at the chosen hotel, put it in a pickup-heavy wave, then run the scenario.
function debugRun(fn, jumpToPickups) {
  const id = DBG_MENU.hotel || HOTEL_ORDER[0];
  if (UI.screen !== 'game' || !HOTEL || HOTEL.id !== id) {
    startGame(id);
    if (jumpToPickups) S.t = phaseTime('high', 0.05);
  }
  UI.screen = 'game';
  UI.paused = false;
  DEBUG.enabled = DEBUG.on = true;
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
            debugRun(() => {
              debugEndEvent();
              EVENTS[id].debug[label]();
            }, true),
        ]);
    events.push(['End current event', () => debugRun(debugEndEvent, false)]);
    events.forEach(([l, fn], i) => out.push(button(10, 56 + i * 14, 145, l, fn)));
    debugCoreScenarios().forEach(([l, fn], i) => out.push(button(165, 56 + i * 14, 145, l, () => debugRun(fn, false))));
    out.push(button(120, 162, 80, t('btn.back'), () => goScreen('title')));
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
