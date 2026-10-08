'use strict';
/* =====================================================================
   TUTORIAL: scripted first shift. Each step = text panel + optional highlight.
   Steps without `until` wait for a tap ("TAP TO CONTINUE"); steps with `until`
   wait for the player to do the thing. During the tutorial: no random arrivals,
   no patience loss, no heat. Edit TUT_STEPS to change the script.
   ===================================================================== */
const TUT = { on: false, i: 0, t: 0, hotelDrop: 1, valetDrop: 1, showValet: true, g1: null, limo: null, bg: null };
const easeBounce = t => {
  const n = 7.5625,
    d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
};
const tutGuest = id => (id && S.guests.get(id)) || null;
const tutCarRect = gid => {
  const g = tutGuest(gid);
  const c = g && S.cars.get(g.carId);
  return c ? [c.x - 9, c.y - 6, 18, 12] : null;
};
const HL = {
  money: [0, 0, 36, 10],
  heat: [100, 0, 74, 10],
  cards: [176, 0, 62, 10],
  board: [221, 92, 98, 56],
  podium: [CONFIG.podium.x - 9, 30, 20, 14],
  valet: () => [S.valet.x - 6, S.valet.y - 11, 12, 14],
  laneC: () => [MAP.lotX - 2, MAP.lotY + 2 * SH, NS * SW + 4, SH],
};

const TUT_STEPS = [
  {
    pos: 'mid',
    text: tl('tut.welcome'),
    enter() {
      TUT.hotelDrop = 0;
      TUT.showValet = false;
    },
  },
  {
    pos: 'mid',
    hl: HL.valet,
    text: tl('tut.you'),
    enter() {
      TUT.showValet = true;
      TUT.valetDrop = 0;
    },
  },
  {
    pos: 'mid',
    text: tl('tut.firstGuest'),
    enter() {
      TUT.g1 = spawnArrival('standard').id;
    },
    until: () => {
      const g = tutGuest(TUT.g1);
      return g && g.state === 'curbDrop';
    },
  },
  {
    pos: 'mid',
    hl: () => tutCarRect(TUT.g1),
    text: tl('tut.tapCar'),
    until: () => S.selected && tutGuest(TUT.g1) && S.selected.carId === tutGuest(TUT.g1).carId,
  },
  {
    pos: 'R',
    hl: () => [MAP.lotX - 2, MAP.lotY - 1, NS * SW + 4, NL * SH + 2],
    text: tl('tut.stalls'),
  },
  {
    pos: 'R',
    hl: () => (S.selected ? null : tutCarRect(TUT.g1)),
    text: tl('tut.tapStall'),
    until: () => S.stats.carsParked >= 1 && !S.valet.job,
  },
  { pos: 'mid', text: tl('tut.parked') },
  {
    pos: 'R',
    hl: () => tutCarRect(TUT.limo),
    text: tl('tut.limo'),
    enter() {
      TUT.limo = spawnArrival('limo').id;
    },
    until: () => S.stats.limos >= 1,
  },
  {
    pos: 'mid',
    hl: HL.money,
    text: tl('tut.limoDone'),
  },
  {
    pos: 'L',
    hl: HL.podium,
    text: tl('tut.leaving'),
    enter() {
      const g = tutGuest(TUT.g1);
      if (g) g.stay = 0;
    },
    until: () => {
      const g = tutGuest(TUT.g1);
      return !g || g.ticket;
    },
  },
  {
    pos: 'L',
    hl: HL.board,
    text: tl('tut.board'),
  },
  { pos: 'L', hl: HL.board, text: tl('tut.tapTicket'), until: () => !tutGuest(TUT.g1) },
  { pos: 'mid', hl: HL.money, text: tl('tut.delivered') },
  {
    pos: 'L',
    hl: HL.laneC,
    text: tl('tut.tricky'),
    enter: tutSetupBlocked,
    until: () => {
      const g = tutGuest(TUT.bg);
      return !g || g.ticket;
    },
  },
  {
    pos: 'L',
    hl: HL.board,
    text: tl('tut.blocked'),
    until: () => !tutGuest(TUT.bg) && !S.jobs.length && !S.valet.job && S.temps.every(t => t.car === null),
  },
  {
    pos: 'mid',
    hl: HL.money,
    text: tl('tut.money'),
  },
  {
    pos: 'mid',
    hl: HL.heat,
    text: tl('tut.heat'),
  },
  {
    pos: 'mid',
    hl: HL.cards,
    text: tl('tut.stars'),
  },
  {
    pos: 'R',
    hl: () => [PAD.x - 19, PAD.y - 19, 38, 38],
    text: tl('tut.heli'),
  },
  {
    pos: 'mid',
    crew: true,
    hl: [2, 124, 28, 44],
    text: tl('tut.crew'),
  },
  {
    pos: 'mid',
    text: tl('tut.end'),
    last: true,
  },
];
function tutSetupBlocked() {
  const lane = 2;
  const put = (tier, mi, idx) => {
    const g = makeGuest(tier, mi);
    placeInStall(S.cars.get(g.carId), lane, idx);
    g.state = 'inside';
    g.stay = 1e9;
    return g;
  };
  put('beater', 0, 2);
  put('standard', 2, 4);
  const g = put('premium', 0, 3);
  g.stay = 1.5;
  TUT.bg = g.id;
}
function startTutorial() {
  loadHotel('monte_carlo'); // the tutorial script is written for this lot
  newRun();
  S.tutorial = true;
  Object.assign(TUT, {
    on: true,
    i: 0,
    t: 0,
    hotelDrop: 1,
    valetDrop: 1,
    showValet: true,
    g1: null,
    limo: null,
    bg: null,
  });
  UI.screen = 'game';
  UI.paused = false;
  Sound.startMusic();
  tutEnter();
}
function tutEnter() {
  TUT.t = 0;
  const st = TUT_STEPS[TUT.i];
  if (st.enter) st.enter();
}
function tutNext() {
  const st = TUT_STEPS[TUT.i];
  if (st.last) return tutFinish();
  TUT.i++;
  Sound.sfx('click');
  tutEnter();
}
function tutFinish() {
  TUT.on = false;
  SAVE.tutorialSeen = true;
  writeSave();
  startGame();
}
function tutUpdate(dt) {
  TUT.t += dt;
  if (TUT.hotelDrop < 1) {
    TUT.hotelDrop = Math.min(1, TUT.hotelDrop + dt * 0.9);
    if (TUT.hotelDrop === 1) {
      S.shake = 0.25;
      Sound.sfx('honk', 0.5);
    }
  }
  if (TUT.valetDrop < 1) TUT.valetDrop = Math.min(1, TUT.valetDrop + dt * 1.6);
  const st = TUT_STEPS[TUT.i];
  if (st.until && TUT.t > 0.4 && st.until()) {
    Sound.sfx('star');
    tutNext();
  }
}
// Pointer hook: returns true if the tutorial consumed the tap.
function tutTap(x, y) {
  if (!TUT.on) return false;
  const sk = skipRect();
  if (x >= sk.x && y >= sk.y && y < sk.y + sk.h) {
    tutFinish();
    return true;
  } // SKIP
  const st = TUT_STEPS[TUT.i];
  if (!st.until) {
    if (TUT.t > 0.5) tutNext();
    return true;
  }
  return false; // action step: let the tap reach the game
}
const tutValetVisible = () => !TUT.on || TUT.showValet;
const tutValetOffset = () => (TUT.on ? -(1 - easeBounce(TUT.valetDrop)) * 40 : 0);
function tutWorldFx() {
  // hotel drop-in: cover the facade and redraw it falling with a bounce
  if (!TUT.on || TUT.hotelDrop >= 1) return;
  const off = -(1 - easeBounce(TUT.hotelDrop)) * 48;
  R(0, 10, 320, 28, PAL.night);
  drawBGRegion(0, 10, 320, 28, 0, 10 + off);
}
function tutPanelRect(pos) {
  return pos === 'R' ? [221, 92, 98, 78] : pos === 'L' ? [4, 128, 214, 42] : [50, 84, 220, 44];
}
function tutRender() {
  if (!TUT.on) return;
  const st = TUT_STEPS[TUT.i];
  const hl = typeof st.hl === 'function' ? st.hl() : st.hl;
  if (hl) {
    const p = Math.floor(UI.t * 4) % 2 ? PAL.yellow : PAL.orange;
    RB(hl[0] - 1, hl[1] - 1, hl[2] + 2, hl[3] + 2, p);
    RB(hl[0] - 2, hl[1] - 2, hl[2] + 4, hl[3] + 4, PAL.ink);
  }
  const [x, y, w, h] = tutPanelRect(st.pos);
  R(x, y, w, h, PAL.ink);
  RB(x, y, w, h, PAL.yellow);
  RB(x + 1, y + 1, w - 2, h - 2, PAL.plum);
  drawText(ctx, t('tut.step', { n: TUT.i + 1, total: TUT_STEPS.length }), x + 4, y + 3, PAL.lav);
  wrapText(st.text, w - 8).forEach((l, i) => drawText(ctx, l, x + 4, y + 11 + i * 7, PAL.white));
  if (!st.until && TUT.t > 0.5 && Math.floor(UI.t * 2.5) % 2)
    drawText(ctx, st.last ? t('tut.startShift') : t('tut.continue'), x + w - 4, y + h - 8, PAL.yellow, {
      align: 'right',
    });
  if (st.until) drawText(ctx, t('tut.yourTurn'), x + w - 4, y + 3, PAL.lime, { align: 'right' });
  const sk = skipRect();
  R(sk.x, sk.y, sk.w, sk.h, PAL.ink);
  RB(sk.x, sk.y, sk.w, sk.h, PAL.lgrey);
  drawText(ctx, t('tut.skip'), sk.x + sk.w / 2, sk.y + 3, PAL.lgrey, { align: 'center' });
}
// The Skip button hugs the right edge and grows with its label ("Skip", "Пропустить").
function skipRect() {
  const w = Math.max(28, textW(t('tut.skip')) + 7);
  return { x: 318 - w, y: 12, w, h: 10 };
}
