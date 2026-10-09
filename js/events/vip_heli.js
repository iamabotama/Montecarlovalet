'use strict';
/* Special VIP helicopters: about 1 in 3 landings brings someone special instead of a regular VIP.
   The core helicopter (sim/helicopter.js) asks this event through four hooks:
     heliIncoming(H) -> a special { kind, who, tip, look, wide } or nothing (a regular VIP)
     heliGreet(H)    -> met in time: the after-show starts (motorcade / paparazzi)
     heliMissed(H)   -> nobody met them: the event just ends
     vipInside(H)    -> the VIP walked into the hotel (POTUS: TRUMP TOWERS for the rest of the shift)
   Kinds:
     royal  - fictional royalty; a black-SUV motorcade waits on the road and blocks the right side
     celeb  - a celebrity; paparazzi crowd the hotel front with camera flashes
     potus  - the President: when he walks in, the sign reads TRUMP TOWERS, the facade turns gold and
              every car becomes an ordinary beater (ordinary beater tips) for the rest of the shift.
              The first time also unlocks the hidden Trump Towers hotel (SAVE.secrets.potus). */
const VIP = () => EVENT_CONFIG.vipHeli;
const VIP_LOOKS = {
  royal: { h: PAL.lgrey, s: PAL.peach, c: PAL.crimson, p: PAL.crimson, k: PAL.ink, x: PAL.yellow }, // crown + robe
  celeb: { h: PAL.ink, s: PAL.peach, c: PAL.white, p: PAL.white, k: PAL.ink, x: PAL.ink },
  potus: { h: PAL.yellow, s: PAL.orange, c: PAL.royal, p: PAL.royal, k: PAL.ink, x: PAL.yellow },
};
const TRUMP_THEME = {
  facade: PAL.yellow,
  trim: PAL.orange,
  pillar: PAL.cream,
  sign: PAL.navy,
  signOff: PAL.ink,
  awning: [PAL.ink, PAL.yellow],
};

function vipPickKind() {
  if (VIP().force) return VIP().force; // debug buttons
  const w = VIP().weights,
    kinds = Object.keys(w);
  return kinds[weightedIndex(kinds.map(k => w[k]))];
}
function vipWho(kind) {
  if (kind === 'royal') return t('event.vip.royal' + rndi(1, VIP().royalTitles));
  return t('event.vip.' + kind);
}

defineEvent('vipHeli', {
  hooks: {
    heliIncoming(H) {
      if (!VIP().force && (!eventCanStart('vipHeli') || Math.random() >= (DEBUG.alwaysEvents ? 1 : VIP().chance)))
        return null;
      const kind = vipPickKind();
      VIP().force = null;
      const sp = {
        kind,
        who: vipWho(kind),
        tip: VIP()[kind].tip,
        look: VIP_LOOKS[kind],
        wide: kind === 'potus',
        tie: kind === 'potus' ? PAL.red : null,
      };
      startEvent('vipHeli', { kind, stage: 'inbound' });
      S.banners.push({
        text: t('event.vip.inbound', { who: sp.who }),
        sub: t('event.vip.tipSub', { money: fmtMoney(sp.tip) }),
        t: 4,
      });
      toast(t('toast.tapHelipad'));
      Sound.sfx('whistle');
      return sp;
    },
    heliGreet(H) {
      const ev = activeEvent('vipHeli');
      if (!ev || !H.special) return;
      ev.stage = 'show';
      if (ev.kind === 'royal') vipMotorcade(ev);
      if (ev.kind === 'celeb') ev.papT = VIP().celeb.paparazziSec;
      if (ev.kind === 'potus') ev.stage = 'walking';
    },
    heliMissed() {
      if (activeEvent('vipHeli')) endEvent();
    },
    vipInside(H) {
      const ev = activeEvent('vipHeli');
      if (ev && ev.kind === 'potus' && H.special) trumpTowers(ev);
    },
    // POTUS shift: every new arrival is a beater too
    arrivalTier() {
      return S.trumped ? 'beater' : null;
    },
  },
  update(ev, dt) {
    if (ev.kind === 'celeb' && ev.papT > 0) {
      ev.flashT = (ev.flashT || 0) - dt;
      if (ev.flashT <= 0) {
        ev.flashT = rnd(0.15, 0.4);
        ev.flash = { x: rnd(128, 192), t: 0.12 };
        Sound.sfx('blip', 3); // camera click
      }
      if (ev.flash && (ev.flash.t -= dt) <= 0) ev.flash = null;
      if ((ev.papT -= dt) <= 0) endEvent();
    }
    if (ev.kind === 'royal' && ev.waitT > 0 && (ev.waitT -= dt) <= 0) vipMotorcadeLeaves(ev);
  },
  draw(ev) {
    if (ev.kind === 'celeb' && ev.papT > 0) drawPaparazzi(ev);
  },
  debug: {
    ROYAL: () => vipDebug('royal'),
    CELEB: () => vipDebug('celeb'),
    POTUS: () => vipDebug('potus'),
  },
});

/* ---- royalty: black SUVs roll in on the road, wait (right side of the lot blocked), drive off ---- */
function vipMotorcade(ev) {
  const C = VIP().royal,
    y = MAP.streetY;
  C.suvX.forEach((x, i) =>
    spawnService(
      ev,
      'suv',
      [
        [-20 - i * 18, y],
        [x, y],
      ],
      70,
      null,
    ),
  );
  blockSide('east');
  ev.waitT = C.waitSec;
  eventBanner(t('event.vip.motorcade'));
  Sound.sfx('engine');
}
function vipMotorcadeLeaves(ev) {
  let left = ev.vehicles.length;
  for (const v of ev.vehicles)
    driveService(v, [[360, MAP.streetY]], 80, s => {
      s.gone = true;
      if (--left === 0) endEvent(); // also reopens the right side
    });
}

/* ---- celebrity: paparazzi along the hotel wall, flashes ---- */
const PAPARAZZI = [134, 144, 176, 186, 196];
function drawPaparazzi(ev) {
  PAPARAZZI.forEach((x, i) =>
    drawPerson(
      ctx,
      x,
      31,
      i % 2 ? 'idle' : 'walk',
      { h: PAL.brown, s: PAL.peach, c: PAL.dgrey, p: PAL.ink, k: PAL.ink },
      x > 160,
    ),
  );
  if (ev.flash) {
    R(Math.round(ev.flash.x) - 1, 30, 3, 3, PAL.white);
    ctx.globalAlpha = 0.25;
    R(Math.round(ev.flash.x) - 6, 26, 13, 12, PAL.white);
    ctx.globalAlpha = 1;
  }
}

/* ---- POTUS: TRUMP TOWERS for the rest of this shift (the hotel itself never changes) ---- */
function trumpTowers(ev) {
  S.trumped = true;
  // a gold copy of tonight's hotel; the next shift loads the real one again (app/flow.js loadHotel)
  HOTEL = { ...HOTEL, name: tl('event.potus.sign'), theme: { ...HOTEL.theme, ...TRUMP_THEME } };
  buildBG();
  for (const car of S.cars.values()) {
    if (car.tier === 'beater') continue;
    car.tier = 'beater';
    car.mi = rndi(0, MODELS.beater.length - 1);
    const g = S.guests.get(car.guestId);
    if (g) g.tier = 'beater';
  }
  eventShout(t('event.potus.who'), t('event.potus.shout'), 3);
  S.shake = 0.3;
  Sound.sfx('gala');
  if (!SAVE.secrets.potus) {
    SAVE.secrets.potus = true; // unlocks the hidden Trump Towers hotel (data/hotels/trump_towers.js)
    writeSave();
    eventBanner(t('event.potus.unlocked'));
  }
  endEvent();
}

/* ---- debug: next helicopter is special and comes now ---- */
function vipDebug(kind) {
  if (!S.heli) return toast(t('toast.noHelipad'));
  VIP().force = kind;
  Object.assign(S.heli, { phase: 'wait', at: S.t, t: 0, greeting: false, ok: null, vipT: 0, special: null });
}
