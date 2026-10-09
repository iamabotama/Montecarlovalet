'use strict';
/* Tow truck sprite (drunk-driver crash scene). Top-down like the cars, at CAR_RES detail:
   white cab with a dark windshield and an amber light bar, white flatbed with an orange stripe,
   grey boom + winch and a hook chain at the back. Two frames (lamps left/right lit) per direction.
   Draw with drawTowTruck(x, y, dir, flash); `TOW.hitch` is how far behind its centre a towed car sits. */
const TOW = { len: 24, wid: 11, hitch: 21 };
const TOW_CACHE = new Map();
function towTruckSprite(dir, frame) {
  const key = dir + ':' + frame;
  if (TOW_CACHE.has(key)) return TOW_CACHE.get(key);
  const k = CAR_RES,
    W = TOW.len * k,
    H = TOW.wid * k;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const c = cv.getContext('2d');
  // all coordinates in sprite pixels, truck facing EAST (front at the right)
  const r = (x, y, w, h, col) => {
    c.fillStyle = col;
    c.fillRect(x, y, w, h);
  };
  const white = '#f4f4f0',
    shade = '#c9c9c4',
    amber = '#ff9a1a',
    amberDim = '#8a4a10';
  // tyres (peek out on both sides)
  for (const x of [6, 22, 52]) {
    r(x, 1, 9, 3, '#1a1a1e');
    r(x, H - 4, 9, 3, '#1a1a1e');
  }
  // flatbed (rear two thirds)
  r(2, 4, 44, H - 8, white);
  r(2, 4, 44, 2, shade); // bed lip
  r(2, H - 6, 44, 2, shade);
  r(10, 6, 34, 1, '#ff7a00'); // orange safety stripes along both side rails
  r(10, H - 7, 34, 1, '#ff7a00');
  for (let i = 0; i < 4; i++) r(2 + i * 2, 6, 2, H - 12, i % 2 ? '#222' : '#ffd23c'); // black/yellow hazard bars at the tail
  // cab (front third)
  r(47, 3, 23, H - 6, white);
  r(47, 3, 23, 2, shade);
  r(64, 6, 5, H - 12, '#243a5a'); // windshield
  r(65, 7, 2, 3, '#6f92c0'); // glint
  r(48, 6, 3, H - 12, '#243a5a'); // rear window
  // amber light bar across the roof: one lamp lit per frame
  r(54, 5, 6, H - 10, '#333');
  r(55, 6, 4, 6, frame === 0 ? amber : amberDim); // frame 2 = lights off
  r(55, H - 12, 4, 6, frame === 1 ? amber : amberDim);
  // boom and winch over the bed, chain and hook off the back
  r(18, H / 2 - 2, 30, 4, '#6b6b70');
  r(18, H / 2 - 1, 30, 1, '#9a9aa0');
  r(40, H / 2 - 4, 6, 8, '#4a4a50'); // winch drum
  r(0, H / 2 - 1, 18, 2, '#3a3a3e'); // chain
  r(0, H / 2 - 3, 3, 6, '#2a2a2e'); // hook
  let out = cv;
  if (dir === 2) {
    out = document.createElement('canvas');
    out.width = W;
    out.height = H;
    const o = out.getContext('2d');
    o.translate(W, 0);
    o.scale(-1, 1);
    o.drawImage(cv, 0, 0);
  }
  TOW_CACHE.set(key, out);
  return out;
}
// flash: true while the amber lights are running (they alternate left/right with a glow on the road).
function drawTowTruck(x, y, dir, flash) {
  const frame = flash ? Math.floor(UI.t * 6) % 2 : 2;
  drawCarSprite(ctx, towTruckSprite(dir === 2 ? 2 : 0, frame), x, y);
  if (!flash) return;
  // small amber halo around whichever roof lamp is lit (lamps sit ~6 px ahead of the centre)
  const lx = x + (dir === 2 ? -8.5 : 5.3);
  const ly = frame === 0 ? y - 4.5 : y + 0.5;
  ctx.globalAlpha = 0.3;
  R(lx - 0.5, ly - 0.5, 3, 3, '#ffb347');
  ctx.globalAlpha = 1;
}
