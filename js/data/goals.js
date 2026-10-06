'use strict';
/* Nightly goals. Three are drawn at random before each shift (sim/goals.js), worth bonus career XP.
   Each goal reads the shift's own stats - no hooks into the rules:
     value(S)  current progress number          target   number to reach
     atEnd     true = judged only when you clock out (e.g. "no angry guests"); fired = failed
     when(h)   optional: is this goal possible at hotel h?                                      */
const GOALS = [
  { id: 'park12', text: 'PARK 12 CARS', xp: 200, target: 12, value: S => S.stats.carsParked },
  { id: 'park25', text: 'PARK 25 CARS', xp: 400, target: 25, value: S => S.stats.carsParked },
  { id: 'whales3', text: 'SERVE 3 WHALES', xp: 300, target: 3, value: S => S.stats.whalesServed },
  { id: 'tips300', text: 'EARN $300 IN TIPS', xp: 300, target: 300, value: S => S.stats.tips },
  { id: 'limos2', text: 'GREET 2 LIMOS', xp: 200, target: 2, value: S => S.stats.limos },
  { id: 'bigtip', text: 'GET A $100+ TIP', xp: 300, target: 100, value: S => S.stats.biggestTip },
  { id: 'money1k', text: 'EARN $1,000 IN ONE SHIFT', xp: 500, target: 1000, value: S => S.money },
  { id: 'heli', text: 'MEET A VIP HELICOPTER', xp: 400, target: 1, value: S => S.stats.heliMet, when: h => !!h.helo },
  { id: 'event', text: 'SURVIVE THE RUSH EVENT', xp: 400, target: 1, value: S => S.stats.eventsSurvived },
  {
    id: 'calm',
    text: 'CLOCK OUT WITH HEAT UNDER 50',
    xp: 500,
    atEnd: true,
    target: 1,
    value: S => (S.heat < 50 ? 1 : 0),
  },
  {
    id: 'noangry',
    text: 'CLOCK OUT WITH NO ANGRY GUESTS',
    xp: 500,
    atEnd: true,
    target: 1,
    value: S => (S.stats.angry === 0 ? 1 : 0),
  },
  {
    id: 'solo',
    text: 'CLOCK OUT WITHOUT HIRING HELP',
    xp: 300,
    atEnd: true,
    target: 1,
    value: S => (S.stats.wages === 0 ? 1 : 0),
  },
  {
    id: 'nosteal',
    text: 'CLOCK OUT WITH NO STOLEN WHALES',
    xp: 250,
    atEnd: true,
    target: 1,
    value: S => (S.stats.stolen === 0 ? 1 : 0),
  },
];
