'use strict';
/* Vehicle guide (title menu): every car class with its models and money, plus the VIP arrivals.
   All numbers are read from CONFIG / hotel data at draw time, so the guide can never drift from the game. */
const GUIDE_PAGES = [
  {
    tab: tl('guide.everyday'),
    rows: ['beater', 'standard', 'premium'],
    note: tl('guide.everydayNote'),
  },
  { tab: tl('guide.highRollers'), rows: ['whale', 'ultra'], note: null }, // note built from CONFIG.tips (see guideHighRollerNotes)
  { tab: tl('guide.vip'), rows: ['limo', 'heli'], note: null },
];
const GUIDE_TOP = 34,
  GUIDE_BOTTOM = 145;

defineScreen('guide', {
  enter() {
    UI.guidePage = UI.guidePage || 0;
  },
  buttons: () => [
    ...GUIDE_PAGES.map((p, i) =>
      button(8 + i * 104, 20, 100, p.tab, () => (UI.guidePage = i), i === UI.guidePage ? PAL.yellow : PAL.dgrey),
    ),
    button(120, 162, 80, t('btn.back'), () => goScreen('title'), PAL.lgrey),
  ],
  render() {
    R(0, 0, 320, 180, PAL.night);
    drawText(ctx, t('guide.title'), 160, 4, PAL.yellow, { align: 'center', scale: 2, shadow: PAL.orange });
    const page = GUIDE_PAGES[UI.guidePage];
    const h = Math.floor((GUIDE_BOTTOM - GUIDE_TOP) / page.rows.length);
    page.rows.forEach((tier, i) => {
      const y = GUIDE_TOP + i * h;
      if (i) R(4, y - 1, 312, 1, PAL.asph);
      if (tier === 'heli') drawGuideHeli(y, h);
      else drawGuideTier(tier, y, h);
    });
    const notes = page.note ? [page.note] : UI.guidePage === 1 ? guideHighRollerNotes() : [];
    notes.forEach((n, i) => drawText(ctx, n, 160, GUIDE_BOTTOM + 1 + i * 6, PAL.lav, { align: 'center', maxW: 312 }));
    drawButtons(this.buttons());
  },
});

const range = ([a, b]) => fmtMoney(a) + '-' + fmtMoney(b);
// The money + behaviour lines for one tier, straight from CONFIG.
function guideLines(tier) {
  const T = CONFIG.tiers[tier],
    pay = fmtMoney(CONFIG.pay[tier]);
  if (tier === 'limo')
    return [
      t('guide.greetTip', { range: range(T.greetTip) }),
      t('guide.payOnGreet', { money: pay }),
      t('guide.neverParked'),
      t('guide.ignored', { sec: T.greetPatience, heat: T.ignoredHeat }),
    ];
  const lines = [];
  if (T.arrivalTip) lines.push(t('guide.arrivalTip', { range: range(T.arrivalTip) }));
  lines.push(t(T.arrivalTip ? 'guide.pickupTip' : 'guide.tip', { range: range(T.pickupTip) }));
  lines.push(t('guide.payReturned', { money: pay }));
  lines.push(t('guide.waits', { in: T.dropPatience, out: T.pickPatience }));
  return lines;
}
function guideHighRollerNotes() {
  const J = CONFIG.tips.jackpot,
    decay = Math.round(CONFIG.tips.whalePickupDecayPer10s * 100);
  return [
    t('guide.jackpot', { n: Math.round(1 / J.chance), money: fmtMoney(J.amount) }),
    t('guide.decay', { pct: decay }),
  ];
}
// Hotels with a tip bonus, e.g. "Las Vegas x1.1" (ordinary tips only; jackpot + VIP tip are fixed).
const guideTipBonus = () =>
  HOTEL_ORDER.map(id => HOTELS[id])
    .filter(h => h.mods.tipMult !== 1)
    .map(h => t('guide.cityBonus', { city: h.city, n: h.mods.tipMult }))
    .join('  ');

function drawGuideTier(tier, y, h) {
  const [, col] = TIER_MARK[tier];
  drawText(ctx, t('tier.' + tier), 8, y + 2, col, { scale: 2 });
  // text column: left of the car pictures (x0)
  guideLines(tier).forEach((l, i) =>
    drawText(ctx, l, 8, y + 15 + i * 7, i < 2 ? PAL.yellow : PAL.lgrey, { maxW: 114 }),
  );
  const models = MODELS[tier];
  const x0 = 124,
    slot = (316 - x0) / models.length;
  const sprites = models.map((m, mi) => carSprite(tier, mi, 0));
  // one scale for the whole row (as big as the slots allow, max 2x) so names line up
  const k = Math.min(
    2,
    ...sprites.map(s => Math.min((slot - 6) / (s.width / CAR_RES), (h - 18) / (s.height / CAR_RES))),
  );
  const rowH = Math.max(...sprites.map(s => s.height / CAR_RES)) * k;
  models.forEach(([name], mi) => {
    const s = sprites[mi];
    const cx = x0 + slot * (mi + 0.5);
    ctx.save();
    ctx.translate(cx, y + 4 + rowH / 2);
    ctx.scale(k, k);
    drawCarSprite(ctx, s, 0, 0);
    ctx.restore();
    wrapText(name, slot - 1)
      .slice(0, 2)
      .forEach((l, i) => drawText(ctx, l, cx, y + 8 + rowH + i * 6, PAL.white, { align: 'center' }));
  });
}
function drawGuideHeli(y, h) {
  const H = CONFIG.helo;
  drawText(ctx, t('guide.helicopter'), 8, y + 2, PAL.yellow, { scale: 2 });
  const lines = [
    t('guide.vipTip', { money: fmtMoney(H.tip) }),
    t('guide.pay', { money: fmtMoney(H.pay) }),
    t('guide.meetWithin', { sec: H.meetSec }),
    t('guide.missed', { heat: H.missHeat }),
  ];
  lines.forEach((l, i) => drawText(ctx, l, 8, y + 15 + i * 7, i < 2 ? PAL.yellow : PAL.lgrey, { maxW: 132 })); // left of the heli
  drawHeliBody(166, y + h / 2 - 2, 1.15, UI.t * 12);
  // which hotels get helicopters, from the hotel files
  const pads = HOTEL_ORDER.map(id => HOTELS[id]).filter(x => x.helo);
  drawText(ctx, t('guide.landings'), 250, y + 4, PAL.lav, { align: 'center' });
  pads.forEach((x, i) =>
    drawText(ctx, t('guide.cityBonus', { city: x.city, n: x.helo.times.length }), 250, y + 12 + i * 7, PAL.white, {
      align: 'center',
    }),
  );
  const bonus = guideTipBonus();
  if (bonus) {
    const line = t('guide.hotelBonus', { list: bonus });
    // long city names (e.g. Polish) can't fit the label too: show just the list
    drawText(ctx, textW(line) <= 312 ? line : bonus, 160, y + h - 6, PAL.lav, { align: 'center', maxW: 312 });
  }
}
