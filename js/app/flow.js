'use strict';
/* App flow: starting shifts. Screens call these; they never build run state themselves. */
function startGame() {
  newRun();
  UI.screen = 'game';
  UI.paused = false;
  Sound.startMusic();
}
