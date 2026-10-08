'use strict';
/* The game screen: world render + pause menu. In-game taps come from ui/input.js hitTargets(). */
defineScreen('game', {
  buttons: () =>
    UI.paused
      ? [
          button(120, 80, 80, t('pause.resume'), () => {
            UI.paused = false;
          }),
          button(120, 96, 80, Sound.muted ? t('btn.unmute') : t('btn.mute'), toggleMute),
          button(120, 112, 80, t('pause.quit'), () => {
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
      drawText(ctx, t('pause.title'), 160, 66, PAL.yellow, { align: 'center', scale: 2 });
      drawGoalsPanel(60, 18);
      drawButtons(this.buttons());
    }
  },
});
// Tonight's goals with live progress (shown while paused).
function drawGoalsPanel(x, y) {
  if (!S.goals.length) return;
  R(x, y, 200, 8 + S.goals.length * 8, PAL.ink);
  RB(x, y, 200, 8 + S.goals.length * 8, PAL.lav);
  S.goals.forEach((g, i) => {
    const d = goalDef(g.id);
    const prog = d.atEnd
      ? g.done
        ? t('pause.done')
        : t('pause.atClockOut')
      : g.done
        ? t('pause.done')
        : goalProgress(g) + '/' + d.target;
    drawText(ctx, goalText(g), x + 4, y + 4 + i * 8, g.done ? PAL.lime : PAL.white);
    drawText(ctx, prog, x + 196, y + 4 + i * 8, g.done ? PAL.lime : PAL.lav, { align: 'right' });
  });
}
