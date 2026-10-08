'use strict';
/* VIP helicopter event. The hotel decides how many landings a night (HOTEL.helo.times) and where the
   pad is (PAD). Per landing: wait -> incoming (descend) -> landed (meet window) -> leaving -> next/gone.
   A valet standing at the pad when it is 'landed' greets the VIP (planner job type 'heli'). */
function newHeliState() {
  if (!PAD || !HOTEL.helo || !HOTEL.helo.times.length) return null;
  const schedule = HOTEL.helo.times.map(r => rnd(...r)).sort((a, b) => a - b);
  return { phase: 'wait', at: schedule.shift(), schedule, t: 0, greeting: false, ok: null, vipT: 0 };
}
function heliAlt() {
  const H = S.heli,
    D = CONFIG.helo.descendSec;
  if (H.phase === 'incoming') return 1 - H.t / D;
  if (H.phase === 'leaving') return H.t / D;
  if (H.phase === 'landed') return 0;
  return 1;
}
function heliVisible() {
  return !!S.heli && ['incoming', 'landed', 'leaving'].includes(S.heli.phase);
}
function heliJob() {
  return S.jobs.find(j => j.type === 'heli' && !j.aborted);
}
function tapHeli() {
  if (heliJob()) {
    toast(t('toast.valetOnWay'));
    Sound.sfx('deny');
    return;
  }
  enqueue({ type: 'heli' });
}
function heliGreet() {
  const H = S.heli;
  const C = CONFIG.helo;
  const vip = { x: PAD.x, y: PAD.y - 6 };
  earn(C.pay, 'pay', vip);
  earn(C.tip, 'tip', vip);
  H.ok = true;
  H.phase = 'leaving';
  H.t = 0;
  H.vipT = 2.5;
  H.greeting = false;
  S.stats.heli = 'MET'; // i18n-ignore: outcome id
  S.stats.heliMet++;
  S.banners.push({ text: t('banner.vipMet', { money: fmtMoney(C.tip) }), t: 3 });
  Sound.sfx('gala');
  S.shake = 0.2;
}
function heliMissed() {
  const H = S.heli;
  H.phase = 'leaving';
  H.t = 0;
  H.ok = false;
  S.stats.heli = 'MISSED'; // i18n-ignore: outcome id, not shown
  S.stats.heliMissed++;
  const j = heliJob();
  if (j && !j.worker) S.jobs.splice(S.jobs.indexOf(j), 1);
  addHeat(CONFIG.helo.missHeat, t('heat.heliMissed'));
  floater(t('float.nobodyMetVip'), PAD.x, PAD.y - 22, PAL.red);
  Sound.sfx('deny');
}
function updateHeli(dt) {
  const H = S.heli,
    C = CONFIG.helo;
  if (!H || S.tutorial) return;
  if (H.vipT > 0) H.vipT -= dt;
  if (H.phase === 'wait') {
    if (S.t >= H.at) {
      H.phase = 'incoming';
      H.t = 0;
      H.ok = null;
      S.banners.push({ text: t('banner.heliInbound'), t: 3 });
      toast(t('toast.tapHelipad'));
      Sound.sfx('whistle');
    }
    return;
  }
  if (H.phase === 'gone') return;
  H.t += dt;
  H.rotT = (H.rotT || 0) - dt;
  if ((H.rotT <= 0 && H.phase !== 'landed') || (H.rotT <= 0 && H.t < 1.5)) {
    Sound.sfx('rotor');
    H.rotT = 0.11;
  }
  if (H.phase === 'incoming' && H.t >= C.descendSec) {
    H.phase = 'landed';
    H.t = 0;
    S.shake = 0.15;
  } else if (H.phase === 'landed' && !H.greeting && H.t >= C.meetSec) heliMissed();
  else if (H.phase === 'leaving' && H.t >= C.descendSec) {
    if (H.schedule.length) Object.assign(H, { phase: 'wait', at: Math.max(S.t + 30, H.schedule.shift()), t: 0 });
    else H.phase = 'gone';
  }
}
