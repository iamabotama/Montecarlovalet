'use strict';
/* Settings: sound, career reset. */
defineScreen('settings', {
  enter() {
    UI.confirmReset = false;
  },
  buttons: () => [
    button(100, 70, 120, Sound.muted ? 'SOUND: OFF' : 'SOUND: ON', toggleMute),
    button(
      100,
      88,
      120,
      UI.confirmReset ? 'TAP AGAIN TO CONFIRM' : 'RESET CAREER',
      () => {
        if (!UI.confirmReset) {
          UI.confirmReset = true;
          return;
        }
        const t = SAVE.tutorialSeen;
        SAVE = defaultSave();
        SAVE.tutorialSeen = t;
        writeSave();
        UI.confirmReset = false;
      },
      PAL.red,
    ),
    button(100, 130, 120, 'BACK', () => goScreen('title')),
  ],
  render() {
    renderText('SETTINGS', []);
    drawButtons(this.buttons());
  },
});
