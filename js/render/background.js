'use strict';
/* Static world for the active hotel: a background pre-rendered once per hotel (buildBG) plus the
   animated parts drawn every frame (drawWorldStatic). Everything hotel-specific comes from
   HOTEL.theme = { facade, trim, pillar, sign, signOff, awning:[a,b], ground:[a,b], fountain, decor, weather }. */
let BG = null;
const theme = () => HOTEL.theme;

function buildBG() {
  const T = theme();
  BG = document.createElement('canvas');
  BG.width = DISPLAY.w * DISPLAY.hi;
  BG.height = DISPLAY.h * DISPLAY.hi;
  const g = BG.getContext('2d');
  g.scale(DISPLAY.hi, DISPLAY.hi); // the layout below is in game px; addDetail() works in detail px
  const r = (x, y, w, h, c) => {
    g.fillStyle = c;
    g.fillRect(x, y, w, h);
  };
  // facade + steps
  r(0, 0, 320, 180, PAL.asph);
  r(0, 10, 320, 28, T.facade);
  r(0, 10, 320, 2, T.trim);
  for (let x = 0; x < 320; x += 40) r(x, 12, 2, 26, T.pillar);
  r(0, 38, 320, 6, PAL.lgrey);
  for (let x = 0; x < 320; x += 8) r(x, 38, 1, 6, PAL.khaki);
  r(0, 43, 320, 1, PAL.white);
  // gardens either side of the drive
  r(0, 44, 320, 22, PAL.night);
  for (let x = 0; x < 320; x += 3) {
    if (x > 90 && x < 230) continue;
    r(x, 58 + (x % 2), 3, 8, x % 6 ? T.ground[0] : T.ground[1]);
  }
  r(92, 44, 136, 22, PAL.asph2); // drive
  if (T.fountain) {
    g.fillStyle = T.ground[0];
    for (let y = 0; y < 10; y++) {
      const hw = Math.round(42 * Math.sqrt(1 - Math.pow((10 - y) / 10, 2)));
      g.fillRect(160 - hw, 56 + y, hw * 2, 1);
    }
    r(154, 60, 12, 5, PAL.lgrey);
    r(156, 61, 8, 3, PAL.royal);
  }
  // street
  r(0, 66, 320, 12, PAL.asph);
  r(0, 66, 320, 1, PAL.lgrey);
  r(0, 77, 320, 1, PAL.lgrey);
  for (let x = 0; x < 320; x += 12) r(x, 71, 6, 1, PAL.yellow);
  // lot: surround, aisles, stalls
  r(0, 78, 320, 102, PAL.night);
  if (T.weather === 'snow') for (let i = 0; i < 400; i++) r((i * 37) % 320, 78 + ((i * 53) % 102), 1, 1, PAL.lgrey);
  const aisleBottom = Math.max(LOT_B, PAD ? PAD.y + 4 : 0);
  r(aisleX('west') - 8, 78, LOT_R - MAP.lotX + 32, LOT_B - 78, PAL.asph);
  r(aisleX('east') - 8, 78, 16, aisleBottom - 78, PAL.asph);
  r(MAP.lotX, MAP.lotY, NS * SW, NL * SH, PAL.asph2);
  for (let i = 0; i <= NL; i++) r(MAP.lotX, MAP.lotY + i * SH, NS * SW, 1, PAL.asph3);
  for (let i = 0; i < NL; i++)
    for (let j = 0; j <= NS; j++) {
      r(MAP.lotX + j * SW, MAP.lotY + i * SH, 1, 3, PAL.dgrey);
      r(MAP.lotX + j * SW, MAP.lotY + i * SH + SH - 3, 1, 3, PAL.dgrey);
    }
  if (LOT_SIDES.length === 2) r(MAP.lotX + HALF * SW, MAP.lotY, 1, NL * SH, PAL.dgrey);
  // a closed row end gets a wall (snowbank in the Alps)
  for (const side of SIDES)
    if (!sideOpen(side)) {
      const x = side === 'west' ? MAP.lotX - 3 : LOT_R;
      r(x, MAP.lotY, 3, NL * SH, T.weather === 'snow' ? PAL.white : PAL.lgrey);
      r(x + (side === 'west' ? 2 : 0), MAP.lotY, 1, NL * SH, PAL.lgrey);
    }
  TEMPS.forEach(t => {
    g.fillStyle = PAL.orange;
    g.fillRect(t.x - 10, t.y - 6, 20, 1);
    g.fillRect(t.x - 10, t.y + 6, 20, 1);
    g.fillRect(t.x - 10, t.y - 6, 1, 13);
    g.fillRect(t.x + 9, t.y - 6, 1, 13);
  });
  r(222, 82, 92, 9, PAL.green);
  r(234, 91, 1, 6, PAL.lgrey);
  g.setTransform(1, 0, 0, 1, 0, 0);
  addDetail(g, T);
}
/* 16-bit pass, in detail pixels (2 per game px): stonework and light edges on the facade, step edges,
   dithered grass, asphalt grain and kerb lips. Translucent, so it reads on every hotel's colours. */
function addDetail(g, T) {
  const k = DISPLAY.hi;
  const px = (x, y, w, h, c) => {
    g.fillStyle = c;
    g.fillRect(x, y, w, h);
  };
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let y = 13 * k; y < 38 * k; y += 6) {
    px(0, y, 320 * k, 1, 'rgba(0,0,0,0.16)');
    for (let x = (y / 6) % 2 ? 0 : 8; x < 320 * k; x += 16) px(x, y - 5, 1, 5, 'rgba(0,0,0,0.12)');
  }
  for (let x = 0; x < 320 * k; x += 40 * k) {
    px(x, 12 * k, 1, 26 * k, 'rgba(255,255,255,0.22)');
    px(x + 3, 12 * k, 1, 26 * k, 'rgba(0,0,0,0.25)');
  }
  px(0, 10 * k, 320 * k, 1, 'rgba(255,255,255,0.3)');
  px(0, 12 * k - 1, 320 * k, 1, 'rgba(0,0,0,0.3)');
  for (let y = 38 * k; y < 44 * k; y += 3) px(0, y, 320 * k, 1, 'rgba(255,255,255,0.18)');
  for (let i = 0; i < 2600; i++) {
    const x = (rnd() * 320 * k) | 0,
      y = 58 * k + ((rnd() * 8 * k) | 0);
    if (x > 91 * k && x < 229 * k) continue; // not on the drive
    px(x, y, 1, 1, rnd() < 0.5 ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.18)');
  }
  const grain = (y0, y1, n) => {
    for (let i = 0; i < n; i++)
      px(
        (rnd() * 320 * k) | 0,
        y0 * k + ((rnd() * (y1 - y0) * k) | 0),
        1,
        1,
        rnd() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)',
      );
  };
  grain(44, 66, 2600);
  grain(66, 78, 1800);
  grain(78, 180, 9000);
  px(0, 66 * k + 1, 320 * k, 1, 'rgba(255,255,255,0.25)');
  px(0, 77 * k, 320 * k, 1, 'rgba(0,0,0,0.3)');
  void T;
}
// Blit part of the background (game-px rectangle) to the screen; used by the tutorial's hotel drop.
function drawBGRegion(sx, sy, sw, sh, dx, dy) {
  const k = DISPLAY.hi;
  ctx.drawImage(BG, sx * k, sy * k, sw * k, sh * k, dx, dy, sw, sh);
}

function drawPalm(x, y) {
  R(x, y, 1, 14, PAL.brown);
  R(x - 4, y - 1, 9, 1, PAL.emer);
  R(x - 5, y, 2, 1, PAL.green);
  R(x + 4, y, 2, 1, PAL.green);
  R(x - 2, y - 2, 5, 1, PAL.leaf);
}
function drawPine(x, y) {
  R(x, y + 10, 1, 4, PAL.brown);
  for (let k = 0; k < 5; k++) R(x - k, y + k * 2, k * 2 + 1, 2, k % 2 ? PAL.teal : PAL.green);
  R(x - 1, y, 3, 1, PAL.white);
}
const DECOR = { palms: drawPalm, pines: drawPine };

function drawWorldStatic() {
  const T = theme();
  ctx.drawImage(BG, 0, 0, DISPLAY.w, DISPLAY.h);
  const time = UI.t;
  for (let row = 0; row < 2; row++)
    for (let x = 6; x < 316; x += 10) {
      if (x > 118 && x < 202 && row === 0) continue;
      if (x > 146 && x < 174) continue;
      const seed = (x * 7 + row * 13) % 17;
      const lit = (seed + Math.floor(time / 4 + seed)) % 5;
      R(x, 16 + row * 10, 4, 4, lit === 0 ? PAL.navy : lit === 1 ? PAL.orange : PAL.yellow);
    }
  const neon = Math.sin(time * 9) > -0.9 ? T.sign : T.signOff;
  const signW = Math.max(80, textW(HOTEL.name) + 8);
  RB(160 - signW / 2, 11, signW, 9, neon);
  drawText(ctx, HOTEL.name, 160, 13, neon, { align: 'center' });
  R(150, 26, 20, 12, PAL.navy);
  R(150, 26, 1, 12, PAL.orange);
  R(169, 26, 1, 12, PAL.orange);
  R(160, 26, 1, 12, PAL.orange);
  for (let x = 146; x < 174; x += 4) (R(x, 23, 2, 3, T.awning[0]), R(x + 2, 23, 2, 3, T.awning[1]));
  const decor = DECOR[T.decor];
  if (decor) for (const px of [12, 52, 268, 308]) decor(px, 46);
  if (T.fountain) for (let i = 0; i < 3; i++) R(158 + i * 2, 58 - ((time * 6 + i * 2) % 4), 1, 1, PAL.blue);
  for (let i = 0; i < NL; i++)
    for (const side of LOT_SIDES) drawText(ctx, LANE_NAMES[i], aisleX(side) - 1, laneY(i) - 2, PAL.asph3);
  TEMPS.forEach(tp => drawText(ctx, tp.name, tp.x - 3, tp.y - 2, PAL.orange));
  drawText(ctx, t('hud.generalPark'), 225, 84, PAL.white);
}

// Weather overlay, drawn above cars and people.
function drawWeather() {
  if (theme().weather !== 'snow') return;
  for (let i = 0; i < 70; i++) {
    const x = (i * 47 + UI.t * (6 + (i % 5))) % 320;
    const y = (i * 29 + UI.t * (14 + (i % 7) * 2)) % 180;
    R(x, y, 1, 1, i % 3 ? PAL.white : PAL.lgrey);
  }
}
