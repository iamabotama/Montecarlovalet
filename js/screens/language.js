'use strict';
/* Language picker (last item on the title menu). "Device language" (SAVE.lang = null) follows the
   browser/system language, falling back to English. Each language is labelled in its own language and
   drawn in its own face, so a player can always find theirs. */
defineScreen('language', {
  enter() {
    for (const l of languageList()) ensureLanguageFont(l.code); // needed to draw every name
  },
  buttons() {
    const list = languageList();
    const half = Math.ceil(list.length / 2);
    const col = on => (on ? PAL.yellow : PAL.lgrey);
    const auto = SAVE.lang == null;
    return [
      button(
        55,
        42,
        210,
        t('lang.device', { name: LANGS[chooseLanguage(null)].name }),
        () => applyLanguage(null),
        col(auto),
      ),
      ...list.map((l, i) => ({
        ...button(
          i < half ? 55 : 165,
          60 + (i % half) * 14,
          100,
          l.name,
          () => applyLanguage(l.code),
          col(!auto && I18N.code === l.code),
        ),
        lang: l.code,
      })),
      button(120, 162, 80, t('btn.back'), () => goScreen('title')),
    ];
  },
  render() {
    renderText(t('lang.title'), []);
    drawButtons(this.buttons());
  },
});
// code = a language code, or null for "follow the device". Remembered in the save.
function applyLanguage(code) {
  SAVE.lang = code;
  writeSave();
  setLanguage(chooseLanguage(code));
  ensureLanguageFont(I18N.code);
}
