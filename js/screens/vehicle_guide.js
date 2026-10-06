'use strict';
/* Vehicle guide (title menu): every car class with its models and money, plus the VIP arrivals.
   All numbers are read from CONFIG / hotel data at draw time, so the guide can never drift from the game. */
const GUIDE_PAGES = [
  {
    tab: 'EVERYDAY',
    rows: ['beater', 'standard', 'premium'],
    note: 'TIPS SHRINK TOWARD HALF AS A GUEST RUNS OUT OF PATIENCE.',
  },
  { tab: 'HIGH ROLLERS', rows: ['whale', 'ultra'], note: null }, // note built from CONFIG.tips (see guideHighRollerNotes)
  { tab: 'VIP ARRIVALS', rows: ['limo', 'heli'], note: null },
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
    button(120, 162, 80, 'BACK', () => goScreen('title'), PAL.lgrey),
  ],
  render() {
    R(0, 0, 320, 180, PAL.night);
    drawText(ctx, 'VEHICLE GUIDE', 160, 4, PAL.yellow, { align: 'center', scale: 2, shadow: PAL.orange });
    const page = GUIDE_PAGES[UI.guidePage];
    const h = Math.floor((GUIDE_BOTTOM - GUIDE_TOP) / page.rows.length);
    page.rows.forEach((t, i) => {
      const y = GUIDE_TOP + i * h;
      if (i) R(4, y - 1, 312, 1, PAL.asph);
      if (t === 'heli') drawGuideHeli(y, h);
      else drawGuideTier(t, y, h);
    });
    const notes = page.note ? [page.note] : UI.guidePage === 1 ? guideHighRollerNotes() : [];
    notes.forEach((n, i) => drawText(ctx, n, 160, GUIDE_BOTTOM + 1 + i * 6, PAL.lav, { align: 'center' }));
    drawButtons(this.buttons());
  },
});

const range = ([a, b]) => fmtMoney(a) + '-' + fmtMoney(b);
// The money + behaviour lines for one tier, straight from CONFIG.
function guideLines(t) {
  const T = CONFIG.tiers[t],
    pay = fmtMoney(CONFIG.pay[t]);
  if (t === 'limo')
    return [
      'GREET TIP ' + range(T.greetTip),
      'PAY ' + pay + ' ON GREET',
      'NEVER PARKED - JUST GREET IT',
      'IGNORED ' + T.greetPatience + 'S: +' + T.ignoredHeat + ' HEAT',
    ];
  const lines = [];
  if (T.arrivalTip) lines.push('ARRIVAL TIP ' + range(T.arrivalTip));
  lines.push((T.arrivalTip ? 'PICKUP TIP ' : 'TIP ') + range(T.pickupTip));
  lines.push('PAY ' + pay + ' WHEN RETURNED');
  lines.push('WAITS ' + T.dropPatience + 'S IN / ' + T.pickPatience + 'S OUT');
  return lines;
}
function guideHighRollerNotes() {
  const J = CONFIG.tips.jackpot,
    decay = Math.round(CONFIG.tips.whalePickupDecayPer10s * 100);
  return [
    'SERVED SUPER FAST: 1 IN ' + Math.round(1 / J.chance) + ' TIP ' + fmtMoney(J.amount) + ' INSTEAD.',
    'TIPS DROP ' + decay + '% PER 10S WAITED. BAGS & CART DOUBLES THE ARRIVAL TIP.',
  ];
}
// Hotels with a tip bonus, e.g. "LAS VEGAS X1.1" (ordinary tips only; jackpot + VIP tip are fixed).
const guideTipBonus = () =>
  HOTEL_ORDER.map(id => HOTELS[id])
    .filter(h => h.mods.tipMult !== 1)
    .map(h => h.city + ' X' + h.mods.tipMult)
    .join('  ');

function drawGuideTier(t, y, h) {
  const [, col] = TIER_MARK[t];
  drawText(ctx, t.toUpperCase(), 8, y + 2, col, { scale: 2 });
  guideLines(t).forEach((l, i) => drawText(ctx, l, 8, y + 15 + i * 7, i < 2 ? PAL.yellow : PAL.lgrey));
  const models = MODELS[t];
  const x0 = 124,
    slot = (316 - x0) / models.length;
  const sprites = models.map((m, mi) => carSprite(t, mi, 0));
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
    wrapText(name, Math.floor(slot / 4))
      .slice(0, 2)
      .forEach((l, i) => drawText(ctx, l, cx, y + 8 + rowH + i * 6, PAL.white, { align: 'center' }));
  });
}
function drawGuideHeli(y, h) {
  const H = CONFIG.helo;
  drawText(ctx, 'HELICOPTER', 8, y + 2, PAL.yellow, { scale: 2 });
  const lines = [
    'VIP TIP ' + fmtMoney(H.tip),
    'PAY ' + fmtMoney(H.pay),
    'MEET IT WITHIN ' + H.meetSec + 'S OF LANDING',
    'MISSED: +' + H.missHeat + ' HEAT',
  ];
  lines.forEach((l, i) => drawText(ctx, l, 8, y + 15 + i * 7, i < 2 ? PAL.yellow : PAL.lgrey));
  drawHeliBody(166, y + h / 2 - 2, 1.15, UI.t * 12);
  // which hotels get helicopters, from the hotel files
  const pads = HOTEL_ORDER.map(id => HOTELS[id]).filter(x => x.helo);
  drawText(ctx, 'LANDINGS PER NIGHT', 250, y + 4, PAL.lav, { align: 'center' });
  pads.forEach((x, i) =>
    drawText(ctx, x.city + ' X' + x.helo.times.length, 250, y + 12 + i * 7, PAL.white, { align: 'center' }),
  );
  const bonus = guideTipBonus();
  if (bonus) drawText(ctx, 'HOTEL TIP BONUS: ' + bonus, 160, y + h - 6, PAL.lav, { align: 'center' });
}
