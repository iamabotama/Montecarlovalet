'use strict';
/* Boot + fixed-timestep main loop. Rendering is delegated to the active screen (screens/registry.js). */
function resize() {
  const w = Math.min(innerWidth, (innerHeight * 16) / 9);
  cv.style.width = w + 'px';
  cv.style.height = (w * 9) / 16 + 'px';
} // canvas is DISPLAY.scale x the 320x180 game grid (index.html)
addEventListener('resize', resize);
let last = performance.now(),
  acc = 0;
const TICK = 1 / 60;
function frame(now) {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  UI.t += dt;
  if (UI.screen === 'game' && S && !UI.paused) {
    acc += dt;
    while (acc >= TICK) {
      stepSim(TICK * DEBUG.scale);
      acc -= TICK;
      if (UI.screen !== 'game') break;
    }
  } else acc = 0;
  ctx.setTransform(DISPLAY.scale, 0, 0, DISPLAY.scale, 0, 0);
  ctx.imageSmoothingEnabled = false;
  SCREENS[UI.screen].render();
  if (innerHeight > innerWidth) {
    R(0, 0, 320, 180, PAL.ink);
    drawText(ctx, t('app.rotate'), 160, 86, PAL.yellow, { align: 'center', scale: 2 });
  }
  requestAnimationFrame(frame);
}
function boot() {
  loadSave();
  setLanguage(chooseLanguage(SAVE.lang));
  Sound.muted = !!SAVE.muted;
  loadHotel(HOTEL_ORDER[0]);
  resize();
  requestAnimationFrame(frame);
  window.MCV = {
    CONFIG,
    get S() {
      return S;
    },
    UI,
    DEBUG,
    JOBLOG,
    startGame,
    plan,
    route,
    newRun,
    stepSim,
    spawnArrival,
    enqueue,
    entryIndex,
    liveDepth,
    SAVE: () => SAVE,
  };
}
// Wait (briefly) for the pixel font so the first frame isn't drawn in the fallback face.
Promise.race([loadFont(), new Promise(r => setTimeout(r, 1500))]).then(boot);
