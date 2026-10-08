'use strict';
/* Hotel select: one card per hotel (data/hotels/*) with its lot shape, perks, best score, or lock reason. */
const CARD = { x: 6, y: 28, w: 75, h: 112, gap: 3 };
const cardX = i => CARD.x + i * (CARD.w + CARD.gap);

defineScreen('hotels', {
  enter() {
    UI.hotelSel = UI.hotelSel || SAVE.lastHotel;
    if (!hotelAccess(hotelById(UI.hotelSel)).ok) UI.hotelSel = HOTEL_ORDER[0];
  },
  buttons() {
    const cards = HOTEL_ORDER.map((id, i) => ({
      x: cardX(i),
      y: CARD.y + 2,
      w: CARD.w,
      h: CARD.h - 4,
      hidden: true,
      fn: () => {
        if (hotelAccess(HOTELS[id]).ok) UI.hotelSel = id;
        Sound.sfx(hotelAccess(HOTELS[id]).ok ? 'click' : 'deny');
      },
    }));
    return [
      ...cards,
      button(6, 160, 70, t('btn.back'), () => goScreen('title'), PAL.lgrey),
      button(214, 160, 100, t('btn.next'), () => goScreen('prep')),
    ];
  },
  render() {
    R(0, 0, 320, 180, PAL.night);
    drawText(ctx, t('hotels.title'), 160, 4, PAL.yellow, { align: 'center', scale: 2, shadow: PAL.orange });
    drawCareerBar(60, 19, 200);
    HOTEL_ORDER.forEach((id, i) => drawHotelCard(HOTELS[id], cardX(i), CARD.y, id === UI.hotelSel));
    drawButtons(this.buttons());
  },
});

function drawHotelCard(h, x, y, selected) {
  const acc = hotelAccess(h);
  const T = h.theme;
  const col = selected ? PAL.yellow : acc.ok ? PAL.lgrey : PAL.dgrey;
  R(x, y, CARD.w, CARD.h, PAL.ink);
  R(x + 1, y + 1, CARD.w - 2, 14, acc.ok ? T.facade : PAL.asph);
  RB(x, y, CARD.w, CARD.h, col);
  const cx = x + CARD.w / 2;
  drawText(ctx, h.city, cx, y + 3, acc.ok ? T.sign : PAL.lgrey, { align: 'center' });
  drawText(ctx, h.name, cx, y + 9, acc.ok ? PAL.white : PAL.lgrey, { align: 'center' });
  drawLotPreview(h, cx, y + 20, acc.ok);
  const lot = h.lot;
  const info = [
    t('hotels.stalls', { n: lot.lanes * lot.stallsPerLane }),
    lot.openSides.length === 2 ? t('hotels.bothEnds') : t('hotels.oneEnd'),
    h.helo
      ? t(h.helo.times.length > 1 ? 'hotels.helis' : 'hotels.heli', { n: h.helo.times.length })
      : t('hotels.noHelipad'),
    h.mods.tipMult !== 1 ? t('hotels.tipsX', { n: h.mods.tipMult }) : t('hotels.standardTips'),
  ];
  info.forEach((l, i) => drawText(ctx, l, cx, y + 58 + i * 7, acc.ok ? PAL.lav : PAL.dgrey, { align: 'center' }));
  if (acc.ok) {
    const best = hotelHighScore(h.id);
    drawStars(cx, y + 80, hotelStars(h.id));
    drawText(ctx, t('hotels.best', { money: fmtMoney(best) }), cx, y + 88, best ? PAL.lime : PAL.dgrey, {
      align: 'center',
    });
    if (selected) drawText(ctx, t('hotels.selected'), cx, y + 100, PAL.yellow, { align: 'center' });
    else
      drawText(ctx, t('hotels.thirdStar', { money: fmtMoney(h.starTarget) }), cx, y + 100, PAL.dgrey, {
        align: 'center',
      });
  } else {
    drawIcon(ctx, 'lock', cx - 2, y + 86, PAL.orange);
    wrapText(acc.reason, 17).forEach((l, i) => drawText(ctx, l, cx, y + 94 + i * 7, PAL.orange, { align: 'center' }));
  }
}
// Tiny top-down sketch of the hotel's lot: rows, open ends (green) and closed ends (grey).
function drawLotPreview(h, cx, y, ok) {
  const L = h.lot,
    sw = 4,
    sh = 4;
  const w = L.stallsPerLane * sw,
    x = Math.round(cx - w / 2);
  R(x - 3, y - 1, w + 6, L.lanes * sh + 2, PAL.asph);
  for (let i = 0; i < L.lanes; i++)
    for (let j = 0; j < L.stallsPerLane; j++) R(x + j * sw, y + i * sh, sw - 1, sh - 1, ok ? PAL.asph3 : PAL.dgrey);
  for (const side of SIDES) {
    const open = L.openSides.includes(side);
    R(side === 'west' ? x - 3 : x + w + 1, y - 1, 2, L.lanes * sh + 2, open ? PAL.lime : PAL.lgrey);
  }
}
