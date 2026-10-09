'use strict';
/* Award medal drawing (14x15 px), shared by the Career screen and anything else that shows an award.
   Earned: tier-coloured disc with the award's icon. Locked: grey disc; secret and locked: a "?". */
const MEDAL_TIER = { 1: PAL.orange, 2: PAL.lgrey, 3: PAL.yellow };
const MEDAL_RIM = { 1: PAL.rust, 2: PAL.dgrey, 3: PAL.tang };
function drawMedal(x, y, award, earned) {
  // ribbon
  R(x + 3, y, 3, 4, earned ? PAL.blue : PAL.navy);
  R(x + 8, y, 3, 4, earned ? PAL.red : PAL.wine);
  // disc (a rounded square reads as a circle at this size)
  const rim = earned ? MEDAL_RIM[award.tier] : PAL.ink,
    face = earned ? MEDAL_TIER[award.tier] : PAL.dgrey;
  R(x + 2, y + 3, 10, 12, rim);
  R(x + 1, y + 4, 12, 10, rim);
  R(x + 3, y + 4, 8, 10, face);
  R(x + 2, y + 5, 10, 8, face);
  if (earned || !award.secret) {
    const icon = ICONS[award.icon];
    const w = icon[0].length,
      h = icon.length;
    drawIcon(ctx, award.icon, x + 7 - Math.ceil(w / 2), y + 9 - Math.ceil(h / 2), earned ? rim : PAL.ink);
  } else drawText(ctx, '?', x + 7, y + 6, PAL.ink, { align: 'center' });
}
