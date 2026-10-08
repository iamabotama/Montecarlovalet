'use strict';
/* Settings: sound, career reset. (Language has its own title-menu screen.) */
defineScreen('settings', {
  enter() {
    UI.confirmReset = false;
  },
  buttons: () => [
    button(100, 70, 120, Sound.muted ? t('settings.soundOff') : t('settings.soundOn'), toggleMute),
    button(
      100,
      88,
      120,
      UI.confirmReset ? t('settings.confirm') : t('settings.reset'),
      () => {
        if (!UI.confirmReset) {
          UI.confirmReset = true;
          return;
        }
        const seen = SAVE.tutorialSeen,
          lang = SAVE.lang;
        SAVE = defaultSave();
        SAVE.tutorialSeen = seen;
        SAVE.lang = lang;
        writeSave();
        UI.confirmReset = false;
      },
      PAL.red,
    ),
    button(100, 130, 120, t('btn.back'), () => goScreen('title')),
  ],
  render() {
    renderText(t('settings.title'), []);
    drawButtons(this.buttons());
  },
});
