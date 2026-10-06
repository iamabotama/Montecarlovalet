'use strict';
/* VIP helicopter event. */

/* ---- VIP helicopter (once per shift) ---- */
function heliAlt() {
  const H = S.heli,
    D = CONFIG.helo.descendSec;
  if (H.phase === 'incoming') return 1 - H.t / D;
  if (H.phase === 'leaving') return H.t / D;
  if (H.phase === 'landed') return 0;
  return 1;
}
function heliVisible() {
  return S.heli && ['incoming', 'landed', 'leaving'].includes(S.heli.phase);
}
function heliJob() {
  return S.jobs.find(j => j.type === 'heli' && !j.aborted);
}
function tapHeli() {
  if (heliJob()) {
    toast('A VALET IS ALREADY ON THE WAY');
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
  S.stats.heli = 'MET';
  S.banners.push({ text: 'VIP MET! ' + fmtMoney(C.tip) + ' TIP!', t: 3 });
  Sound.sfx('gala');
  S.shake = 0.2;
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
      S.banners.push({ text: 'VIP HELICOPTER INBOUND!', t: 3 });
      toast('TAP THE HELIPAD - MEET THE VIP AS THEY LAND');
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
  } else if (H.phase === 'landed' && !H.greeting && H.t >= C.meetSec) {
    H.phase = 'leaving';
    H.t = 0;
    H.ok = false;
    S.stats.heli = 'MISSED';
    const j = heliJob();
    if (j && !j.worker) S.jobs.splice(S.jobs.indexOf(j), 1);
    addHeat(C.missHeat, 'A VIP STEPPED OFF A HELICOPTER AND NOBODY WAS THERE.');
    floater('NOBODY MET THE VIP!', PAD.x, PAD.y - 22, PAL.red);
    Sound.sfx('deny');
  } else if (H.phase === 'leaving' && H.t >= C.descendSec) H.phase = 'gone';
}
