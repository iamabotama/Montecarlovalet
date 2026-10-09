'use strict';
/* Draws the premium stall pads (gold when usable, a lock when not). */
function drawPremiumStalls() {
  PREMS.forEach((p, i) => {
    const open = premOpen(i);
    R(p.x - 10, p.y - 7, 20, 14, PAL.asph);
    RB(p.x - 10, p.y - 7, 20, 14, open ? PAL.yellow : PAL.dgrey);
    if (S.prem[i].car !== null) return;
    if (open) drawText(ctx, p.name, p.x, p.y - 2, PAL.yellow, { align: 'center' });
    else drawIcon(ctx, 'lock', p.x - 2, p.y - 2, PAL.dgrey);
  });
}
