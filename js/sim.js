'use strict';

/* ============ SIM: guests, arrivals, heat, power-ups ============ */
const GUEST_COLORS = { beater: [PAL.khaki, PAL.olive, PAL.dgrey], standard: [PAL.blue, PAL.green, PAL.lav], premium: [PAL.navy, PAL.mauve, PAL.lgrey], whale: [PAL.white, PAL.cream, PAL.pink], ultra: [PAL.yellow, PAL.white, PAL.peach], limo: [PAL.ink, PAL.white] };
function toast(msg) { if (msg) S.toasts.push({ msg, t: CONFIG.fx.toastSec }); }
function floater(text, x, y, color) { S.floaters.push({ text, x, y, color, t: 1.4 }); }
function puff(car) { S.particles.push({ x: car.x, y: car.y, vx: rnd(-6, 6), vy: rnd(-8, -2), t: 0.5, c: PAL.lgrey }); }
function dropPatience(tier) { const T = CONFIG.tiers[tier]; if (tier === 'limo') return T.greetPatience;
  const tb = T.dropPatienceByHour; if (!tb) return T.dropPatience; const h = hourNow(); const [h0, p0] = tb[0], [h1, p1] = tb[tb.length - 1]; return lerp(p0, p1, clamp((h - h0) / (h1 - h0), 0, 1)); }
function makeGuest(tier, mi) {
  const car = { id: nid(), tier, mi, x: -14, y: MAP.streetY, dir: 0, loc: { t: 'street' } };
  const g = { id: nid(), tier, carId: car.id, state: 'queued', wait: 0, patience: dropPatience(tier), stage: 0, over: 0, comped: false, ignoreT: 0, claimT: 0, claimed: false,
    x: 0, y: 34, colors: { h: pick([PAL.brown, PAL.ink, PAL.yellow, PAL.lgrey]), s: pick([PAL.peach, PAL.khaki, PAL.brown]), c: pick(GUEST_COLORS[tier]), p: PAL.navy, k: PAL.ink }, heatAcc: 0 };
  car.guestId = g.id; S.cars.set(car.id, car); S.guests.set(g.id, g); return g;
}
function prefillLot() {
  for (let n = 0; n < LOT.prefilledCars; n++) {
    const tier = TIERS[weightedIndex(CONFIG.arrivals.prefillMix)]; const g = makeGuest(tier, rndi(0, MODELS[tier].length - 1)); const car = S.cars.get(g.carId);
    for (let tries = 0; tries < 30; tries++) { const l = rndi(0, NL - 1), s = pick(['west', 'east']); const e = entryIndex(l, s); if (e) { placeInStall(car, l, e.idx); break; } }
    g.state = 'inside'; g.stay = rnd(CONFIG.stay.prefillMinSec, CONFIG.stay.prefillMaxSec);
  }
}
function scheduleRow() { const h = hourNow(); let row = CONFIG.arrivals.schedule[0]; for (const r of CONFIG.arrivals.schedule) if (h >= r.fromHour) row = r; return row; }
function spawnArrival(forceTier) {
  const row = scheduleRow(); let mix = row.mix.slice();
  if (S.galaActive) { const hi = [3, 4, 5], sh = CONFIG.gala.highShare; const hs = hi.reduce((a, i) => a + mix[i], 0) || 1, ls = 100 - hs || 1; mix = mix.map((w, i) => (hi.includes(i) ? (w / hs) * sh : (w / ls) * (1 - sh))); }
  const tier = forceTier || TIERS[weightedIndex(mix)]; const g = makeGuest(tier, rndi(0, MODELS[tier].length - 1)); S.streetQueue.push(g.carId);
}
function nextInterval() { if (S.galaActive) return rnd(...CONFIG.gala.interval); const r = scheduleRow(); let iv = rnd(...r.interval); if (r.perHourDec) iv = Math.max(r.floor, iv - r.perHourDec * (hourNow() - r.fromHour)); return iv; }
function updateArrivals(dt) {
  S.spawnT -= dt; if (S.spawnT <= 0) { spawnArrival(); S.spawnT = nextInterval(); }
  const h = hourNow(); if (!S.galaDone && h >= S.galaAt) { S.galaDone = true; S.galaActive = true; S.galaEnd = S.t + CONFIG.gala.durationSec; S.banners.push({ text: 'THE GALA HAS BEGUN!', t: 3 }); Sound.sfx('gala'); S.spawnT = 1; }
  if (S.galaActive && S.t >= S.galaEnd) { S.galaActive = false; S.banners.push({ text: 'GALA OVER', t: 2 }); }
  // street queue -> curb
  if (S.streetQueue.length) { const k = freeCurb(); if (k >= 0) { const car = S.cars.get(S.streetQueue.shift()); const g = S.guests.get(car.guestId); S.curb[k].car = car.id; g.state = 'arriving'; car.loc = { t: 'arriving', k };
    car.mv = { pts: [[MAP.mouthL, MAP.streetY], [MAP.mouthL, MAP.curbY], [MAP.curbX[k], MAP.curbY]], pi: 0, speed: 60, done: () => { car.loc = { t: 'curb', k }; car.dir = 0; g.state = 'curbDrop'; g.x = MAP.curbX[k] - 2; Sound.sfx('honk', isWhale(car.tier) ? 1.5 : car.tier === 'limo' ? 0.8 : 1); } }; } }
  S.streetQueue.forEach((id, n) => { const c = S.cars.get(id); const tx = n < LOT.streetQueueMax ? MAP.queueX[n] : -20; if (c.x < tx) c.x = Math.min(tx, c.x + 50 * (1 / 60)); });
}
function departCar(car, kind) { // drive off-screen east; free its spot immediately
  removeCarFromWorld(car); car.loc = { t: 'leaving' }; const sx = car.x, sy = car.y;
  const pts = sy <= MAP.curbY + 2 ? [[MAP.mouthR, MAP.curbY], [MAP.mouthR, MAP.streetY], [340, MAP.streetY]] : [[sx, MAP.streetY], [340, MAP.streetY]];
  car.mv = { pts, pi: 0, speed: 70, done: () => S.cars.delete(car.id) }; void kind;
}
function guestGone(g) { g.state = 'gone'; const si = S.spots.indexOf(g.id); if (si >= 0) S.spots[si] = null; S.guests.delete(g.id); }
function removeQueuedJobsFor(carId) { for (const j of S.jobs.slice()) if (j.carId === carId && j !== S.valet.job) S.jobs.splice(S.jobs.indexOf(j), 1); const a = S.valet.job; if (a && a.carId === carId && !a.carMoved) { a.aborted = true; releaseJob(a); } }

/* ---- heat ---- */
function addHeat(amt, reason, x, y) {
  if (S.phase !== 'play' || amt <= 0) return; const gain = amt * (CONFIG.heat.spiral ? 1 + S.heat / 100 : 1);
  S.heat = Math.min(CONFIG.heat.max, S.heat + gain); if (reason) S.lastHeatReason = reason; S.heatFloat += gain;
  if (S.heatFloat >= 1) { floater('+' + Math.round(S.heatFloat), 140, 10, PAL.red); S.heatFloat = 0; Sound.sfx('heat'); }
  for (const w of CONFIG.heat.warnings) if (S.heat >= w && !S.warned[w]) { S.warned[w] = true; S.manager = { line: CONFIG.lines.warnings[w] || 'WATCH IT, KID.', t: 3 }; S.shake = CONFIG.fx.shakeSec; Sound.sfx('whistle'); }
  enforceSlots(); if (S.heat >= CONFIG.heat.max) fire();
}
function repairHeat(amt) { S.heat = Math.max(0, S.heat - amt); S.stars++; floater('-' + Math.round(amt) + ' HEAT', 140, 12, PAL.lime); Sound.sfx('star'); tryGrantStars(); }
function slotsAllowed() { return CONFIG.power.maxSlots - CONFIG.heat.slotThresholds.filter(t => S.heat >= t).length; }
function enforceSlots() { const n = slotsAllowed(); while (S.cards.length > n) { let mi = 0; S.cards.forEach((c, i) => { if (c.at > S.cards[mi].at) mi = i; }); S.cards.splice(mi, 1); toast('POWER-UP SLOT LOST'); } tryGrantStars(); }
function powerPool() { const unlocked = new Set([...CONFIG.power.base, ...SAVE.unlocked]); return Object.keys(CONFIG.power.weights).filter(k => unlocked.has(k)); }
function grantCard(type, silent) { if (S.cards.length >= slotsAllowed()) return false; S.cards.push({ type, at: ++S.cardSeq }); if (!silent) { Sound.sfx('power'); floater(POWER_INFO[type].name, 250, 12, PAL.yellow); } return true; }
function tryGrantStars() { const pool = powerPool(); while (S.stars >= CONFIG.power.starsPerPowerup && S.cards.length < slotsAllowed()) { S.stars -= CONFIG.power.starsPerPowerup; grantCard(pool[weightedIndex(pool.map(k => CONFIG.power.weights[k]))]); } }

/* ---- guest events ---- */
function reachCarAtCurb(car, g, bags) {
  g.state = 'handed'; g.claimed = true;
  if (isWhale(g.tier)) { const T = CONFIG.tiers[g.tier]; let tip = jackpot(g, Math.round(rnd(...T.arrivalTip) * Math.max(0, 1 - g.wait / g.patience)) * (bags ? 2 : 1));
    if (tip > 0) { earn(tip, 'tip', g); if (g.stage <= CONFIG.heat.repairMaxStage) repairHeat(tip * CONFIG.heat.repairPerDollar); } }
}
function jackpot(g, tip) { const J = CONFIG.tips.jackpot; if (!isWhale(g.tier) || g.wait > J.maxWaitFrac * g.patience || Math.random() >= J.chance) return tip;
  S.banners.push({ text: 'JACKPOT! $' + J.amount + ' TIP!', t: 2.5 }); Sound.sfx('gala'); S.shake = 0.2; return J.amount; }
function earn(amt, kind, g) { S.money += amt; S.stats[kind === 'tip' ? 'tips' : 'pay'] += amt; if (kind === 'tip') { S.stats.biggestTip = Math.max(S.stats.biggestTip, amt); floater('+$' + amt, g.x + 2, g.y - 4, PAL.yellow); Sound.sfx(amt >= 40 ? 'bigcoin' : 'coin'); } }
function greetLimo(car, g) { earn(CONFIG.pay.limo, 'pay', g); earn(rndi(...CONFIG.tiers.limo.greetTip), 'tip', g); S.stats.limos++; departCar(car); guestGone(g); }
function carAtCurbForPickup(car, g, k) {
  car.loc = { t: 'curb', k }; car.dir = 0; g.state = 'pickBoard'; g.boardX = MAP.curbX[k] - 2;
  const T = CONFIG.tiers[g.tier]; const w = g.wait;
  if (isWhale(g.tier)) { S.stats.whalesServed++; if (w > S.stats.longestWhaleWait) { S.stats.longestWhaleWait = w; S.stats.longestWhaleName = carName(car); } }
  if (g.comped) { floater('COMPED!', g.x, g.y - 6, PAL.red); S.stats.comped++; }
  else { earn(CONFIG.pay[g.tier], 'pay', g); const base = rndi(...T.pickupTip);
    const f = isWhale(g.tier) ? Math.max(0, 1 - CONFIG.tips.whalePickupDecayPer10s * w / 10) : 1 - (1 - CONFIG.tips.otherDecayFloor) * clamp(w / g.patience, 0, 1);
    const tip = jackpot(g, Math.round(base * f)); if (tip > 0) earn(tip, 'tip', g); }
}
function leaveAngry(g, why) {
  const car = S.cars.get(g.carId); S.stats.angry++; floater('HMPH!', g.x, g.y - 6, PAL.red); removeQueuedJobsFor(g.carId);
  const T = CONFIG.tiers[g.tier]; const heat = g.tier === 'limo' ? T.ignoredHeat : T.angryHeat;
  addHeat(heat, 'A ' + carName(car) + ' OWNER ' + why + '.', g.x, g.y);
  const qi = S.streetQueue.indexOf(car.id); if (qi >= 0) S.streetQueue.splice(qi, 1);
  if (car.loc.t === 'stall' || car.loc.t === 'temp') { removeCarFromWorld(car); S.cars.delete(car.id); } else departCar(car);
  guestGone(g);
}
function stageOf(g) { const f = g.wait / g.patience; if (f >= 1) return isWhale(g.tier) ? 5 : 4; return f < 0.2 ? 0 : f < 0.45 ? 1 : f < 0.7 ? 2 : f < 0.9 ? 3 : 4; }
function bubbleLine(g, st) { const L = CONFIG.lines, posh = isWhale(g.tier);
  if (st === 1) return pick(posh ? L.poshMurmur : L.murmur); if (st === 2) return pick(posh ? L.poshAnnoyed : L.annoyed); return ''; }
const WAITING = new Set(['queued', 'curbDrop', 'pickWalk', 'pickWait']);
function updateGuests(dt) {
  for (const g of [...S.guests.values()]) {
    const car = S.cars.get(g.carId);
    if (WAITING.has(g.state)) {
      if (g.ignoreT > 0) g.ignoreT -= dt; else g.wait += dt;
      const st = stageOf(g); if (st !== g.stage) { if (st > g.stage) { Sound.sfx(st >= 4 ? 'grawlix' : 'blip', st); if (st === 4) S.stats.grawlix++; } g.stage = st; g.line = bubbleLine(g, st); g.stageAt = S.t; }
      if (g.wait >= g.patience) {
        if (isWhale(g.tier)) { g.over += dt; if (g.phase === 'pick') g.comped = true; const T = CONFIG.tiers[g.tier];
          const rate = T.escalateStart + T.escalateStep * Math.floor(g.over / T.escalateEverySec);
          addHeat(rate * dt, 'A ' + carName(car) + ' OWNER WAITED ' + Math.round(g.wait) + 'S ' + (g.phase === 'pick' ? 'AT PICKUP' : 'AT THE CURB') + '.');
          if (Math.random() < dt * 2) S.shake = 0.15; }
        else if (g.phase === 'pick') { const a = S.valet.job; if (a && a.type === 'fetch' && a.carId === g.carId && a.carMoved) { if (!g.comped) { g.comped = true; addHeat(CONFIG.tiers[g.tier].angryHeat, 'A ' + carName(car) + ' OWNER WAITED TOO LONG.'); } } else leaveAngry(g, 'TOOK A CAB'); continue; }
        else { leaveAngry(g, g.tier === 'limo' ? 'LIMO WAS IGNORED' : 'GAVE UP AT THE CURB'); continue; }
      }
    }
    if (g.state === 'curbDrop' && isWhale(g.tier) && !g.claimed) { g.claimT += dt;
      if (S.jobs.some(j => j.type === 'park' && j.carId === g.carId)) g.claimed = true;
      else if (g.claimT >= CONFIG.power.rivalClaimSec) { S.stats.stolen++; floater('STOLEN!', g.x, g.y - 6, PAL.lav); Sound.sfx('steal'); S.npcs.push({ kind: 'senior', x: MAP.curbX[car.loc.k] - 2, y: 34, t: 1 }); departCar(car); guestGone(g); continue; } }
    if (g.state === 'handed' || g.state === 'leavingIn') { g.state = 'leavingIn'; const tx = MAP.standX - 2; g.x += Math.sign(tx - g.x) * Math.min(Math.abs(tx - g.x), SPD.guestWalkPxSec * dt); if (Math.abs(g.x - tx) < 1) { g.state = 'inside'; g.stay = rnd(CONFIG.stay.minSec, CONFIG.stay.maxSec); } }
    else if (g.state === 'inside') { g.stay -= dt; if (g.stay <= 0 && car && (car.loc.t === 'stall' || car.loc.t === 'temp')) {
      g.state = 'pickWalk'; g.phase = 'pick'; g.wait = 0; g.over = 0; g.stage = 0; g.patience = CONFIG.tiers[g.tier].pickPatience; g.x = MAP.standX - 2;
      let si = S.spots.indexOf(null); if (si >= 0) S.spots[si] = g.id; g.spotX = si >= 0 ? SPOTS[si] - 2 : MAP.standX - 2 + rndi(-6, 6); } }
    else if (g.state === 'pickWalk' || g.state === 'pickWait') { const tx = g.spotX; g.x += Math.sign(tx - g.x) * Math.min(Math.abs(tx - g.x), SPD.guestWalkPxSec * dt); if (Math.abs(g.x - tx) < 1) g.state = 'pickWait'; }
    else if (g.state === 'pickBoard') { const tx = g.boardX; g.x += Math.sign(tx - g.x) * Math.min(Math.abs(tx - g.x), SPD.guestWalkPxSec * 2 * dt); if (Math.abs(g.x - tx) < 1) { departCar(car); guestGone(g); } }
  }
}
function updateMovers(dt) {
  for (const car of S.cars.values()) if (car.mv) { const m = car.mv; const o = { x: car.x, y: car.y, pi: m.pi, dir: car.dir }; const done = advanceAlong(o, m.pts, m.speed * dt);
    car.x = o.x; car.y = o.y; m.pi = o.pi; car.dir = o.dir; if (done) { car.mv = null; m.done(); } }
  for (let i = 0; i < S.temps.length; i++) { const c = S.cars.get(S.temps[i].car); if (!c) continue; const over = S.t - c.tempSince - LOT.tempOverstaySec;
    if (over > 0) { c.tempHeatT += dt; if (c.tempHeatT >= LOT.tempOverstayEverySec) { c.tempHeatT = 0; addHeat(LOT.tempOverstayHeat, 'A CAR SAT IN THE FIRE LANE.'); floater('FIRE LANE!', TEMPS[i].x, TEMPS[i].y - 8, PAL.red); } } }
}

/* ---- power-ups ---- */
function powerTargets(type, g, car) {
  const t = POWER_INFO[type].target; const atCurb = g && g.state === 'curbDrop' && car && car.loc.t === 'curb';
  if (t === 'guest') return g && WAITING.has(g.state);
  if (t === 'curbNonWhale') return atCurb && !isWhale(g.tier) && g.tier !== 'limo';
  if (t === 'curbStdPrem') return atCurb && (g.tier === 'standard' || g.tier === 'premium');
  if (t === 'curbWhale') return atCurb && isWhale(g.tier);
  if (t === 'curbLimo') return atCurb && g.tier === 'limo';
  return false;
}
function useCard(idx, g) {
  const card = S.cards[idx]; if (!card) return; const type = card.type; const car = g && S.cars.get(g.carId); const P = CONFIG.power;
  if (POWER_INFO[type].target === 'self') { if (type === 'hustle') S.boost.hustle = P.hustleSec; if (type === 'coffee') S.boost.coffee = P.coffeeSec; if (type === 'spareKeys') S.boost.spareKeys++; }
  else if (!powerTargets(type, g, car)) { Sound.sfx('deny'); return; }
  else if (type === 'pawnOff') { removeQueuedJobsFor(car.id); S.npcs.push({ kind: 'newbie', x: g.x, y: 34, t: 1.2 }); floater('PAWNED!', g.x, g.y - 6, PAL.lime); departCar(car); guestGone(g); }
  else if (type === 'directAway') { removeQueuedJobsFor(car.id); S.stats.waved++; floater('GENERAL PARKING >', g.x, g.y - 6, PAL.lime); departCar(car); guestGone(g); }
  else if (type === 'ignore') { g.ignoreT = P.ignoreSec; }
  else if (type === 'fakeSmile') { const lo = [0, 0, 0.2, 0.45, 0.7, 0.9]; g.wait = Math.min(g.wait, lo[Math.max(0, g.stage - 1)] * g.patience); g.over = 0; g.stage = stageOf(g); }
  else if (type === 'bribe') { removeQueuedJobsFor(car.id); greetLimo(car, g); }
  else if (type === 'bags') { S.selected = { carId: car.id, bags: true }; g.claimed = true; }
  S.cards.splice(idx, 1); S.armed = null; Sound.sfx('power'); tryGrantStars();
}

/* ---- shift end ---- */
function fire() { if (S.phase !== 'play') return; S.phase = 'fired'; S.endT = 0; S.firedLine = pick(CONFIG.lines.fired); Sound.stopMusic(); Sound.sfx('fired'); S.shake = 0.5; }
function clockOut() { if (S.phase !== 'play') return; S.phase = 'clockout'; S.endT = 0; Sound.stopMusic(); Sound.sfx('shiftover'); }
function finishRun() {
  const kind = S.phase; const st = S.stats; const xp = Math.round((st.tips + st.pay) * CONFIG.career.xpPerDollar);
  const isHigh = S.money > SAVE.highScore; if (isHigh) SAVE.highScore = Math.round(S.money);
  SAVE.careerXP += xp; const best = SAVE.bestStats; best.biggestTip = Math.max(best.biggestTip || 0, st.biggestTip); best.longestShift = Math.max(best.longestShift || 0, S.t); best.whalesServed = Math.max(best.whalesServed || 0, st.whalesServed);
  writeSave(); RESULT = { kind, money: S.money, xp, isHigh, hour: hourNow(), reason: S.lastHeatReason, line: S.firedLine, st: { ...st }, t: S.t }; UI.screen = 'summary';
}
function stepSim(dt) {
  if (S.phase === 'play') {
    S.t += dt; for (const k of ['hustle', 'coffee']) if (S.boost[k] > 0) S.boost[k] -= dt;
    updateArrivals(dt); updateGuests(dt); runValet(dt); updateMovers(dt);
    S.meltdown = [...S.guests.values()].some(g => g.stage === 5);
    Sound.music.speed = 1 + CONFIG.fx.musicSpeedPerHour * Math.floor(hourNow() - CONFIG.clock.startHour);
  } else { S.endT += dt; if (S.endT > (S.phase === 'fired' ? 5 : 3)) finishRun(); }
  for (const f of S.floaters) { f.t -= dt; f.y -= 8 * dt; } S.floaters = S.floaters.filter(f => f.t > 0);
  for (const p of S.particles) { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; } S.particles = S.particles.filter(p => p.t > 0);
  for (const a of [S.toasts, S.banners, S.npcs]) for (const o of a) o.t -= dt; S.toasts = S.toasts.filter(o => o.t > 0).slice(-2); S.banners = S.banners.filter(o => o.t > 0); S.npcs = S.npcs.filter(o => o.t > 0);
  if (S.manager) { S.manager.t -= dt; if (S.manager.t <= 0) S.manager = null; } if (S.shake > 0) S.shake -= dt;
}
let RESULT = null;
