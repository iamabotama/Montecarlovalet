'use strict';
/* The game screen: world render + pause menu. In-game taps come from ui/input.js hitTargets(). */
defineScreen('game', {
  buttons: () =>
    UI.paused
      ? [
          button(120, 80, 80, 'RESUME', () => {
            UI.paused = false;
          }),
          button(120, 96, 80, Sound.muted ? 'UNMUTE' : 'MUTE', toggleMute),
          button(120, 112, 80, 'QUIT SHIFT', () => {
            UI.paused = false;
            goScreen('title');
            Sound.stopMusic();
          }),
        ]
      : [],
  targets: () => hitTargets(),
  render() {
    renderGame();
    if (UI.paused) {
      R(90, 60, 140, 70, PAL.ink);
      RB(90, 60, 140, 70, PAL.yellow);
      drawText(ctx, 'PAUSED', 160, 66, PAL.yellow, { align: 'center', scale: 2 });
      drawButtons(this.buttons());
    }
  },
});
