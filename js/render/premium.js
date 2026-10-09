'use strict';
/* Premium stall pads: drawing (gold when usable; a lock when not, grey = rank, gold = Premium) and the tap hint. */
function drawPremiumStalls() {
  PREMS.forEach((p, i) => {
    const open = premOpen(i);
    R(p.x - 10, p.y - 7, 20, 14, PAL.asph);
    RB(p.x - 10, p.y - 7, 20, 14, open ? PAL.yellow : PAL.dgrey);
    if (S.prem[i].car !== null) return;
    if (open) drawText(ctx, p.name, p.x, p.y - 2, PAL.yellow, { align: 'center' });
    else drawIcon(ctx, 'lock', p.x - 2, p.y - 2, i === 0 ? PAL.lgrey : PAL.yellow);
  });
}
// Tapping an empty pad (nothing selected) explains it: why it is locked, or what it is for.
function tapPremiumPad(i) {
  toast(premOpen(i) ? t('prem.hint', { name: PREMS[i].name }) : premLockReason(i));
  Sound.sfx('click');
}
