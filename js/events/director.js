'use strict';
/* Event director. Events register with defineEvent(id, def) (one file each in js/events/) and only
   touch the game through events/actions.js. The director runs at most one event at a time, keeps a
   cooldown between them, and fans core hooks out to every enabled event.
   def = {
     eligible()            -> may this event run tonight (hotel layout etc.)
     hooks: { name(...) }  -> optional reactions to core moments; a truthy return means "handled"
                              (pickupStart(g), handOver(car, g), tapGuest(g))
     update(ev, dt)        -> while active;  idle(dt) -> every frame while not active
     draw(ev)              -> while active;  scenery() -> every frame (props that are always there)
     targets(ev, add)      -> tap targets while active
     waitRate              -> guest patience drain multiplier while active (default 1)
     walkRate              -> walking speed multiplier for valets and guests while active (default 1)
     overlay(ev)           -> while active, drawn above cars, people and weather
     passiveTargets(add)   -> tap targets even while not active (e.g. a secret trigger)
   }
   Start one with startEvent(id, state); end it with endEvent(). */
const EVENTS = {};
function defineEvent(id, def) {
  EVENTS[id] = def;
}
function newEventsState() {
  resetBlockedSides();
  return { active: null, cooldown: 0 };
}
function eventOn(id) {
  const c = EVENT_CONFIG[id];
  return !!(EVENTS[id] && c && c.enabled && !S.tutorial && (!EVENTS[id].eligible || EVENTS[id].eligible()));
}
// May a new event start right now?
function eventCanStart(id) {
  return eventOn(id) && S.phase === 'play' && !S.events.active && (S.events.cooldown <= 0 || DEBUG.alwaysEvents);
}
// The odds an event rolls against (debug ALWAYS forces 1).
function eventChance(id) {
  return DEBUG.alwaysEvents ? 1 : EVENT_CONFIG[id].chance * phaseEventMult();
}
// Debug: stop whatever event is running, tidy its leftovers, allow a new one at once.
function debugEndEvent() {
  const a = activeEvent();
  if (a && EVENTS[a.id].cleanup) EVENTS[a.id].cleanup(a);
  if (a) endEvent();
  S.events.cooldown = 0;
}
// Debug: the trigger buttons every event offers ({ label: fn }), for ui/debug.js.
function eventDebugButtons() {
  const out = [];
  for (const id in EVENTS)
    if (eventOn(id) && EVENTS[id].debug)
      for (const [label, fn] of Object.entries(EVENTS[id].debug))
        out.push([
          label,
          () => {
            debugEndEvent();
            fn();
          },
        ]);
  return out;
}
function startEvent(id, state) {
  S.events.active = { id, t: 0, vehicles: [], ...state };
  eventMark(id);
  return S.events.active;
}
function endEvent() {
  S.events.active = null;
  S.events.cooldown = EVENT_CONFIG.cooldownSec;
  resetBlockedSides();
  sirenOff();
}
function activeEvent(id) {
  const a = S.events && S.events.active;
  return a && (!id || a.id === id) ? a : null;
}
// Core hook: returns the first truthy answer from an enabled event.
function eventHook(name, ...args) {
  if (!S.events) return undefined;
  for (const id in EVENTS) {
    const h = EVENTS[id].hooks && EVENTS[id].hooks[name];
    if (h && eventOn(id)) {
      const r = h(...args);
      if (r) return r;
    }
  }
  return undefined;
}
function updateEvents(dt) {
  if (!S.events) return;
  if (S.events.cooldown > 0) S.events.cooldown -= dt;
  const a = S.events.active;
  for (const id in EVENTS) if (EVENTS[id].idle && eventOn(id)) EVENTS[id].idle(dt);
  if (a) {
    a.t += dt;
    updateServiceVehicles(a, dt);
    updateSiren(dt);
    EVENTS[a.id].update(a, dt);
  }
}
function drawEvents() {
  if (!S.events) return;
  for (const id in EVENTS) if (EVENTS[id].scenery && eventOn(id)) EVENTS[id].scenery();
  const a = S.events.active;
  if (a) {
    drawServiceVehicles(a);
    if (EVENTS[a.id].draw) EVENTS[a.id].draw(a);
  }
}
function eventTargets(add) {
  if (S.events) for (const id in EVENTS) if (EVENTS[id].passiveTargets && eventOn(id)) EVENTS[id].passiveTargets(add);
  const a = S.events && S.events.active;
  if (a && EVENTS[a.id].targets) EVENTS[a.id].targets(a, add);
}
// Walking speed multiplier for valets and guests (a blizzard slows everyone down).
function eventWalkRate() {
  const a = S.events && S.events.active;
  return a && EVENTS[a.id].walkRate ? EVENTS[a.id].walkRate : 1;
}
// Per-vehicle driving speed (snowmobiles are quicker than cars).
const vehicleSpeed = car => (car && eventHook('vehicleSpeed', car)) || 1;
function drawEventOverlay() {
  const a = S.events && S.events.active;
  if (a && EVENTS[a.id].overlay) EVENTS[a.id].overlay(a);
}
// Guest patience drain multiplier (events can make everyone more patient).
function eventWaitRate() {
  const a = S.events && S.events.active;
  return a && EVENTS[a.id].waitRate ? EVENTS[a.id].waitRate : 1;
}
