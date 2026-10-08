'use strict';
/* Nightly goals. Three are drawn at random before each shift (sim/goals.js), worth bonus career XP.
   Each goal reads the shift's own stats - no hooks into the rules:
     value(S)  current progress number          target   number to reach
     atEnd     true = judged only when you clock out (e.g. "no angry guests"); fired = failed
     when(h)   optional: is this goal possible at hotel h?
   Display wording: i18n key goal.<id>, filled with {n}/{money} = target and {event} = the hotel's event.                                      */
const GOALS = [
  { id: 'park12', xp: 200, target: 12, value: S => S.stats.carsParked },
  { id: 'park25', xp: 400, target: 25, value: S => S.stats.carsParked },
  { id: 'whales3', xp: 300, target: 3, value: S => S.stats.whalesServed },
  { id: 'tips300', xp: 300, target: 300, value: S => S.stats.tips },
  { id: 'limos2', xp: 200, target: 2, value: S => S.stats.limos },
  { id: 'bigtip', xp: 300, target: 100, value: S => S.stats.biggestTip },
  { id: 'money1k', xp: 500, target: 1000, value: S => S.money },
  { id: 'heli', xp: 400, target: 1, value: S => S.stats.heliMet, when: h => !!h.helo },
  { id: 'event', xp: 400, target: 1, value: S => S.stats.eventsSurvived },
  {
    id: 'calm',
    xp: 500,
    atEnd: true,
    target: 1,
    value: S => (S.heat < 50 ? 1 : 0),
  },
  {
    id: 'noangry',
    xp: 500,
    atEnd: true,
    target: 1,
    value: S => (S.stats.angry === 0 ? 1 : 0),
  },
  {
    id: 'solo',
    xp: 300,
    atEnd: true,
    target: 1,
    value: S => (S.stats.wages === 0 ? 1 : 0),
  },
  {
    id: 'nosteal',
    xp: 250,
    atEnd: true,
    target: 1,
    value: S => (S.stats.stolen === 0 ? 1 : 0),
  },
];
