'use strict';
/* Title screen. */
const menuItem = (i, label, fn) => ({ ...button(120, 117 + i * 12, 80, label, fn), h: 11 });
// Always recognisable, even to someone who can't read the current language: 'Langue / Language'.
function languageLabel() {
  const own = t('title.language');
  return own === LANGS.en.table['title.language'] ? own : own + ' / ' + LANGS.en.table['title.language'];
}
defineScreen('title', {
  buttons: () => [
    menuItem(0, t('title.start'), () => (SAVE.tutorialSeen ? goScreen('hotels') : startTutorial())),
    menuItem(1, t('title.tutorial'), startTutorial),
    menuItem(2, t('title.vehicles'), () => goScreen('guide')),
    menuItem(3, t('title.settings'), () => goScreen('settings')),
    menuItem(4, languageLabel(), () => goScreen('language')),
    button(4, 164, 40, Sound.muted ? t('btn.unmute') : t('btn.mute'), toggleMute, PAL.lgrey),
    button(256, 164, 60, t('title.fullscreen'), goFullscreen, PAL.lgrey),
  ],
  render() {
    R(0, 0, 320, 180, PAL.night);
    for (let i = 0; i < 60; i++) {
      const x = (i * 53) % 320,
        y = (i * 29) % 100;
      if ((i + Math.floor(UI.t * 2)) % 7) R(x, y, 1, 1, i % 3 ? PAL.white : PAL.yellow);
    }
    R(268, 10, 8, 10, PAL.cream);
    R(266, 12, 12, 6, PAL.cream);
    R(271, 9, 8, 9, PAL.night);
    R(70, 30, 180, 106, PAL.plum);
    R(150, 20, 20, 10, PAL.plum);
    for (let y = 36; y < 130; y += 10)
      for (let x = 76; x < 246; x += 10) R(x, y, 4, 4, (x * y) % 7 ? PAL.yellow : PAL.orange);
    R(44, 46, 232, 44, PAL.ink);
    RB(44, 46, 232, 44, Math.sin(UI.t * 7) > -0.8 ? PAL.pink : PAL.plum);
    drawText(ctx, t('title.line1'), 160, 52, PAL.pink, { align: 'center', scale: 3, shadow: PAL.crimson });
    drawText(ctx, t('title.line2'), 160, 70, PAL.yellow, { align: 'center', scale: 3, shadow: PAL.orange });
    R(0, 136, 320, 4, PAL.lgrey);
    R(0, 140, 320, 40, PAL.asph);
    const cx = ((UI.t * 40) % 400) - 40;
    drawCarSprite(ctx, carSprite('whale', 1, 0), cx, 150);
    drawCarSprite(ctx, carSprite('limo', 1, 2), 360 - ((UI.t * 25) % 420), 160);
    R(56, 101, 208, 14, PAL.ink);
    drawCareerBar(60, 103, 200);
    drawText(ctx, t('title.version', { v: CONFIG.version }), 2, 2, PAL.dgrey);
    drawButtons(this.buttons());
  },
});
