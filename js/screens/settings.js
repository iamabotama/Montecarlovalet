'use strict';
/* Settings: sound, language (shown once there is more than one), career reset. */
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
    ...(languageList().length > 1
      ? [button(100, 106, 120, t('settings.language', { name: LANGS[I18N.code].name }), nextLanguage)]
      : []),
    button(100, 130, 120, t('btn.back'), () => goScreen('title')),
  ],
  render() {
    renderText(t('settings.title'), []);
    drawButtons(this.buttons());
  },
});
// Cycle to the next language and remember the choice (null in SAVE = follow the device).
function nextLanguage() {
  const list = languageList();
  const i = list.findIndex(l => l.code === I18N.code);
  const code = list[(i + 1) % list.length].code;
  setLanguage(code);
  SAVE.lang = code;
  writeSave();
}
