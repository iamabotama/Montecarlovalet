'use strict';
/* Boss wave. The hotel's big event wave (the phase with event: true) is a boss fight, in stages:
     wait      - until CONFIG.boss.startFrac of the way into the event wave
     herald    - at hotels with a helipad the headliner lands first; meet them like any VIP
     motorcade - the Hummdinger Stretch (a boss-only limo model, data/vehicles.js) jumps the street queue,
                 followed by the headliner's limo entourage
     surge     - celebrities and high rollers pour in for CONFIG.boss.surge.sec (sim/waves.js asks bossSurge())
     mop       - the surge is over: waits until every boss car has been greeted or has gone
     done      - judged: won or lost
   Beaten = headliner met (helipad hotels), the Hummer greeted, no more than CONFIG.boss.maxLeaks guests
   leaving unhappy during the fight, and not fired. Missing the headliner, ignoring the Hummer or one leak
   too many loses it on the spot. A win pays CONFIG.boss.winBonus and sets S.stats.bossWon; the career
   (career/progression.js) then opens any hotel whose unlockBoss names this one.
   Who the headliner is and how they look: HOTEL.boss (data/hotels/*). Fun events wait while a fight runs.
   Core touch points: heliGreet/heliMissed (sim/helicopter.js), greetLimo + leaveAngry (sim/guests.js),
   nextInterval/arrivalMix (sim/waves.js), eventCanStart (events/director.js). */
const BOSS = () => CONFIG.boss;
const BOSS_LIVE = new Set(['herald', 'motorcade', 'surge', 'mop']);

function newBossState(fromT = 0) {
  const i = PHASES().findIndex(p => p.event);
  if (!BOSS().enabled || i < 0) return null;
  return {
    stage: 'wait',
    at: Math.max(fromT, phaseStart(i) + PHASES()[i].sec * BOSS().startFrac),
    waveI: i,
    heli: !!PAD,
    heliWanted: false,
    hummer: null, // guest id
    hummerGreeted: false,
    entourage: [], // guest ids
    spawnT: 0,
    surgeEnd: 0,
    leaks: 0,
    failed: null, // 'heli' | 'hummer' | 'leaks'
    result: null, // 'won' | 'lost'
  };
}
const bossWho = () => (HOTEL.boss && HOTEL.boss.who) || t('boss.who');
const bossLive = () => !!(S && S.boss && BOSS_LIVE.has(S.boss.stage));
const bossSurge = () => (S && S.boss && S.boss.stage === 'surge' ? BOSS().surge : null);
const bossLeaksLeft = () => (S.boss ? Math.max(0, BOSS().maxLeaks - S.boss.leaks) : 0);
// Boss car guests still on the property (not greeted, not gone).
const bossCarsPending = () => [S.boss.hummer, ...S.boss.entourage].some(id => id != null && S.guests.has(id));

function updateBoss(dt) {
  const B = S.boss;
  if (!B || S.tutorial || S.phase !== 'play' || B.stage === 'done') return;
  if (B.stage === 'wait') {
    if (S.t < B.at) return;
    S.stats.bossTries = 1;
    B.stage = B.heli ? 'herald' : 'motorcade';
    B.heliWanted = B.heli;
    B.spawnT = 1;
    S.banners.push({
      text: t('boss.banner', { who: bossWho() }),
      sub: t(B.heli ? 'boss.subHeli' : 'boss.subCar'),
      t: 4,
    });
    Sound.sfx('gala');
    S.shake = 0.25;
    return;
  }
  if (B.stage === 'herald') {
    if (B.heliWanted) bossCallHeli();
    return; // heliGreet / heliMissed move it on (bossHeliDone)
  }
  if (B.stage === 'motorcade') {
    if ((B.spawnT -= dt) > 0) return;
    const C = BOSS();
    if (B.hummer == null) {
      const g = spawnArrival('limo');
      const car = S.cars.get(g.carId);
      car.mi = bossModel('limo');
      g.boss = true;
      g.patience = C.hummer.patience * patienceMult();
      S.streetQueue.splice(S.streetQueue.indexOf(car.id), 1);
      S.streetQueue.unshift(car.id); // the boss does not wait in line
      B.hummer = g.id;
      Sound.sfx('honk', 0.6);
    } else {
      const g = spawnArrival('limo');
      g.entourage = true;
      B.entourage.push(g.id);
    }
    B.spawnT = rnd(...C.entourage.gapSec);
    if (B.entourage.length >= C.entourage.limos) {
      B.stage = 'surge';
      B.surgeEnd = S.t + C.surge.sec;
    }
    return;
  }
  if (B.stage === 'surge' && S.t >= B.surgeEnd) B.stage = 'mop';
  if (B.stage === 'mop' && !bossCarsPending()) bossJudge();
}

// Land the headliner as soon as the helipad is free (a regular landing still due goes back in the schedule).
function bossCallHeli() {
  const H = S.heli,
    B = S.boss;
  if (!H) {
    B.heli = false;
    B.stage = 'motorcade';
    return;
  }
  if (!['wait', 'gone'].includes(H.phase)) return;
  if (H.phase === 'wait') H.schedule.unshift(H.at);
  Object.assign(H, {
    phase: 'incoming',
    t: 0,
    ok: null,
    greeting: false,
    special: { kind: 'boss', boss: true, who: bossWho(), tip: BOSS().heliTip, look: HOTEL.boss && HOTEL.boss.look },
  });
  B.heliWanted = false;
  toast(t('toast.tapHelipad'));
  Sound.sfx('whistle');
}
// sim/helicopter.js: the headliner was met (ok) or nobody came (lost).
function bossHeliDone(ok) {
  const B = S.boss;
  if (!B || B.stage !== 'herald') return;
  if (!ok) return bossLose('heli');
  B.stage = 'motorcade';
  B.spawnT = BOSS().motorcadeAfterSec;
}
// sim/guests.js greetLimo: the Hummer was greeted in time.
function bossHummerGreeted(g) {
  const C = BOSS().hummer;
  S.boss.hummerGreeted = true;
  earn(C.pay, 'pay', g);
  earn(hotelTip(rndi(...C.tip)), 'tip', g);
  S.shake = 0.2;
  Sound.sfx('gala');
}
// sim/guests.js leaveAngry: anyone leaving unhappy while the fight is on is a leak.
function bossLeak(g) {
  const B = S.boss;
  if (!bossLive()) return;
  if (g.boss) return bossLose('hummer');
  B.leaks++;
  if (B.leaks > BOSS().maxLeaks) bossLose('leaks');
  else floater(t('boss.leak', { n: bossLeaksLeft() }), g.x, g.y - 12, PAL.pink);
}
function bossLose(why) {
  const B = S.boss;
  if (!B || B.stage === 'done') return;
  B.failed = why;
  B.result = 'lost';
  B.stage = 'done';
  S.banners.unshift({ text: t('boss.lost', { who: bossWho() }), sub: t('boss.lost.' + why), t: 4 });
  Sound.sfx('deny');
}
function bossJudge() {
  const B = S.boss;
  if (!B.hummerGreeted) return bossLose('hummer');
  B.result = 'won';
  B.stage = 'done';
  S.stats.bossWon = 1;
  earn(BOSS().winBonus, 'pay', { x: MAP.standX, y: MAP.standY - 10 });
  S.banners.unshift({
    text: t('boss.won'),
    sub: t('boss.wonSub', { who: bossWho(), money: fmtMoney(BOSS().winBonus) }),
    t: 4,
  });
  Sound.sfx('gala');
  S.shake = 0.3;
}
