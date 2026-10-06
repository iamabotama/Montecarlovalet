'use strict';
/* Promotion ceremony, shown after a shift that crossed one or more rank thresholds (RESULT.promotions). */
defineScreen('promotion', {
  enter() {
    UI.promoI = 0;
    UI.promoT = 0;
    Sound.sfx('gala');
  },
  buttons: () => [
    button(110, 160, 100, 'CONTINUE', () => {
      if (++UI.promoI < RESULT.promotions.length) ((UI.promoT = 0), Sound.sfx('gala'));
      else goScreen('summary');
    }),
  ],
  render() {
    const rank = RESULT.promotions[UI.promoI];
    UI.promoT += 1 / 60;
    R(0, 0, 320, 180, PAL.night);
    for (let i = 0; i < 40; i++) {
      const a = i * 0.7 + UI.t;
      R(
        160 + Math.cos(a) * (40 + (i % 5) * 18),
        62 + Math.sin(a) * (24 + (i % 4) * 9),
        1,
        1,
        i % 2 ? PAL.yellow : PAL.pink,
      );
    }
    drawText(ctx, 'PROMOTED!', 160, 10, PAL.yellow, { align: 'center', scale: 3, shadow: PAL.orange });
    // badge: drops in, then shines
    const by = Math.min(48, -20 + UI.promoT * 140);
    R(148, by, 24, 26, PAL.yellow);
    R(150, by + 2, 20, 22, PAL.orange);
    R(154, by + 26, 4, 6, PAL.red);
    R(162, by + 26, 4, 6, PAL.red);
    drawIcon(ctx, 'star', 158, by + 10, PAL.yellow);
    drawText(ctx, rankName(rank), 160, 86, PAL.white, { align: 'center', scale: 2 });
    drawText(ctx, 'THE MANAGER PINS ON YOUR NEW BADGE.', 160, 102, PAL.lgrey, { align: 'center' });
    rankUnlockLines(rank).forEach((l, i) =>
      drawText(ctx, 'UNLOCKED: ' + l, 160, 116 + i * 9, PAL.lime, { align: 'center' }),
    );
    drawButtons(this.buttons());
  },
});
