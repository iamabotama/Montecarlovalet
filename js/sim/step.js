'use strict';
/* One fixed simulation tick. */

function stepSim(dt) {
  if (S.phase === 'play') {
    S.t += dt;
    for (const k of ['hustle', 'coffee']) if (S.boost[k] > 0) S.boost[k] -= dt;
    updateWaves();
    updateArrivals(dt);
    updateGuests(dt);
    runValet(dt);
    updateMovers(dt);
    updateHeli(dt);
    updateEvents(dt);
    updateGoals();
    updateVipHold(dt);
    if (S.tutorial) tutUpdate(dt);
    S.meltdown = [...S.guests.values()].some(g => g.stage === 5);
    Sound.music.speed = 1 + CONFIG.fx.musicSpeedPerHour * Math.floor(hourNow() - CONFIG.clock.startHour);
  } else {
    S.endT += dt;
    if (S.endT > (S.phase === 'fired' ? 5 : 3)) finishRun();
  }
  for (const f of S.floaters) {
    f.t -= dt;
    f.y -= 8 * dt;
  }
  S.floaters = S.floaters.filter(f => f.t > 0);
  for (const p of S.particles) {
    p.t -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  S.particles = S.particles.filter(p => p.t > 0);
  for (const a of [S.toasts, S.npcs]) for (const o of a) o.t -= dt;
  if (S.banners.length > 3) S.banners.splice(0, S.banners.length - 3); // never lag far behind events
  if (S.banners.length) S.banners[0].t -= dt; // banners queue: one at a time
  S.toasts = S.toasts.filter(o => o.t > 0).slice(-2);
  S.banners = S.banners.filter(o => o.t > 0);
  S.npcs = S.npcs.filter(o => o.t > 0);
  if (S.manager) {
    S.manager.t -= dt;
    if (S.manager.t <= 0) S.manager = null;
  }
  if (S.shake > 0) S.shake -= dt;
}
