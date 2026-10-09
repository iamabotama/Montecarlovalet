'use strict';
/* Secret agent easter egg (Monte Carlo only, a parody: no real names, no theme music).
   Trigger: tap the fountain 7 times quickly, or very rarely on its own. A tuxedoed "Agent Double-O-Nothing"
   pulls up in a silver GT, tailed by a black henchman sedan that idles on the street.
   Park his GT before the henchman makes his move (parkSec) -> a big tip and a one-liner; the sedan leaves.
   Too slow (the GT is still waiting at the curb) -> the henchman sneaks into it, the ejector seat fires
   and launches him off the top of the screen. No tip, but the GT stays a normal car to park.
   Core hooks: drawCar(car), carName(car). Director: passiveTargets (the fountain). Tuning: EVENT_CONFIG.secretAgent. */
const AGT = () => EVENT_CONFIG.secretAgent;
const AGENT_TAPS = []; // recent fountain tap times (UI clock)
const FOUNTAIN = { x: 150, y: 57, w: 22, h: 9 }; // the island below the curb lane
const HENCH_LOOK = { h: PAL.ink, s: PAL.peach, c: PAL.ink, p: PAL.ink, k: PAL.ink };
defineEvent('secretAgent', {
  eligible: () => !!(HOTEL && HOTEL.id === 'monte_carlo'),
  hooks: {
    drawCar(car) {
      if (!car.agent) return false;
      drawCarSprite(ctx, carSprite('service', SERVICE.agent, car.dir), car.x, car.y);
      return true;
    },
    carName: car => (car.agent ? AGENT_CAR_NAME : null),
  },
  passiveTargets(add) {
    if (eventCanStart('secretAgent')) add(FOUNTAIN.x, FOUNTAIN.y, FOUNTAIN.w, FOUNTAIN.h, 2, agentFountainTap);
  },
  idle(dt) {
    AGT_ROLL.t += dt;
    if (AGT_ROLL.t < 1) return;
    AGT_ROLL.t = 0;
    if (eventCanStart('secretAgent') && Math.random() < eventChance('secretAgent')) agentStart();
  },
  update: (ev, dt) => agentUpdate(ev, dt),
  draw: ev => agentDraw(ev),
  debug: {
    AGENT: () => agentStart(),
    EJECT: () => agentStart(true),
  },
});
const AGT_ROLL = { t: 0 };
function agentFountainTap() {
  const now = UI.t;
  AGENT_TAPS.push(now);
  while (AGENT_TAPS.length && now - AGENT_TAPS[0] > AGT().tapWindowSec) AGENT_TAPS.shift();
  Sound.sfx('blip');
  if (AGENT_TAPS.length >= AGT().taps) {
    AGENT_TAPS.length = 0;
    agentStart();
  }
}
// slowTest: debug only, gives a tiny park window so the ejector seat is easy to see.
function agentStart(slowTest) {
  const g = spawnArrival('ultra');
  const car = S.cars.get(g.carId);
  car.agent = true;
  g.agent = true;
  g.claimed = true; // no rival valet steals him: the henchman is his threat (sim/guests.js claim rule)
  g.colors = { ...g.colors, h: PAL.brown, c: PAL.ink, p: PAL.ink, k: PAL.ink }; // tuxedo
  const ev = startEvent('secretAgent', {
    carId: car.id,
    guestId: g.id,
    stage: 'tail', // tail -> (done | sneak -> eject) -> leave
    limit: slowTest ? 4 : AGT().parkSec,
    man: null, // the henchman on foot
  });
  const y = MAP.streetY;
  ev.sedan = spawnService(
    ev,
    'henchman',
    [
      [-60, y],
      [AGT().sedanX, y],
    ],
    55,
    null,
  );
  eventBanner(t('event.agent'));
  Sound.sfx('spysting');
}
const agentParked = car => car.loc.t === 'stall' || car.loc.t === 'prem' || car.loc.t === 'temp';
function agentUpdate(ev, dt) {
  const car = S.cars.get(ev.carId);
  if (ev.stage === 'tail') {
    if (!car) return agentLeave(ev);
    if (agentParked(car)) return agentSuccess(ev);
    // too slow: only if his GT is still sitting at the curb (a valet driving it counts as safe)
    if (ev.t >= ev.limit && car.loc.t === 'curb') {
      ev.stage = 'sneak';
      ev.man = { x: ev.sedan.x + 6, y: ev.sedan.y + 6, alt: 0, spin: 0 };
      eventShout(t('agent.henchman'), t('agent.henchLine'), 2);
    }
    return;
  }
  if (ev.stage === 'sneak') {
    if (!car || car.loc.t !== 'curb') {
      ev.man = null; // the car moved off: he gives up
      return agentLeave(ev);
    }
    const dx = car.x - ev.man.x,
      dy = car.y - ev.man.y,
      d = Math.hypot(dx, dy);
    const step = SPD.guestWalkPxSec * dt;
    if (d > step) {
      ev.man.x += (dx / d) * step;
      ev.man.y += (dy / d) * step;
    } else {
      ev.stage = 'eject';
      eventMark('agentEject');
      ev.man.x = car.x;
      ev.man.y = car.y;
      ev.ej = 0;
      Sound.sfx('thud');
      Sound.sfx('whistle');
      eventBanner(t('event.agentEject'));
    }
    return;
  }
  if (ev.stage === 'eject') {
    ev.ej += dt;
    ev.man.alt = ev.ej * AGT().ejectPxSec + 12 * ev.ej * ev.ej;
    ev.man.spin = ev.ej;
    if (ev.man.y - ev.man.alt < -20) {
      ev.man = null;
      agentLeave(ev);
    }
    return;
  }
  if (ev.stage === 'leave' && !ev.sedan.mv) endEvent();
}
function agentSuccess(ev) {
  const g = S.guests.get(ev.guestId);
  eventMark('agentParked');
  earn(AGT().tip, 'tip', g);
  floater(fmtMoney(AGT().tip), g ? g.x : 160, g ? g.y - 14 : 30, PAL.yellow);
  Sound.sfx('bigcoin');
  eventShout(t('agent.name'), t('agent.line'), 3);
  agentLeave(ev);
}
function agentLeave(ev) {
  ev.stage = 'leave';
  driveService(ev.sedan, [[380, MAP.streetY]], 80, v => {
    v.gone = true;
  });
}
function agentDraw(ev) {
  const m = ev.man;
  if (!m) return;
  if (ev.stage === 'eject') {
    // seat + henchman shooting straight up, flailing
    const y = m.y - m.alt;
    R(m.x - 2, y + 2, 5, 2, PAL.dgrey);
    drawPerson(ctx, m.x - 2, y - 10, Math.floor(m.spin * 10) % 2 ? 'arms' : 'cross', HENCH_LOOK);
    ctx.globalAlpha = 0.5;
    R(m.x - 1, y + 5, 3, 4, PAL.orange); // rocket flame
    ctx.globalAlpha = 1;
    return;
  }
  drawPerson(ctx, m.x - 2, m.y - 12, Math.floor(UI.t * 6) % 2 ? 'walk' : 'idle', HENCH_LOOK);
}
