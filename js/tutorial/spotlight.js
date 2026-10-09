'use strict';
/* Tutorial spotlight: dims the whole screen except a few clear "holes", so a new player sees
   exactly what the current step is about. Purely visual: taps still go everywhere as before.
   Holes for a step = its highlight (`hl`), your valet, and anything in the step's `focus` list
   (guests and cars involved). Steps with neither `hl` nor `focus` do not dim. */
const SPOT = {
  alpha: 0.62, // darkness outside the holes
  fadeSec: 0.35, // fade-in at the start of each step
  pad: 3, // breathing room around each hole
};
// Screen rect of a tutorial guest (generous: the crowd layout nudges people sideways a little).
const tutGuestRect = gid => {
  const g = tutGuest(gid);
  return g ? [g.x - 6, g.y - 3, 12, 13] : null;
};
const valetRect = () => (TUT.showValet && S.valet ? [S.valet.x - 6, S.valet.y - 11, 12, 14] : null);
// Collect the holes for a step; null when the step should not dim at all.
function spotlightHoles(st, hl) {
  const focus = typeof st.focus === 'function' ? st.focus() : st.focus || [];
  if (!hl && !focus.length) return null;
  return [hl, valetRect(), ...focus].filter(Boolean);
}
// Drawn on a small 320x180 layer with the holes cut out, so overlapping holes stay clear.
let SPOT_LAYER = null;
function drawSpotlight(holes, stepT) {
  const a = SPOT.alpha * Math.min(1, stepT / SPOT.fadeSec);
  if (a <= 0) return;
  if (!SPOT_LAYER) {
    SPOT_LAYER = document.createElement('canvas');
    SPOT_LAYER.width = 320;
    SPOT_LAYER.height = 180;
  }
  const c = SPOT_LAYER.getContext('2d');
  const p = SPOT.pad;
  c.globalCompositeOperation = 'source-over';
  c.clearRect(0, 0, 320, 180);
  c.fillStyle = `rgba(8, 6, 20, ${a})`;
  c.fillRect(0, 0, 320, 180);
  c.globalCompositeOperation = 'destination-out';
  c.fillStyle = '#000';
  for (const [x, y, w, h] of holes) c.fillRect(Math.round(x - p), Math.round(y - p), w + 2 * p, h + 2 * p);
  const smooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(SPOT_LAYER, 0, 0, 320, 180);
  ctx.imageSmoothingEnabled = smooth;
}
