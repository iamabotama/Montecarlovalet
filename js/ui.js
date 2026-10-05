'use strict';

/* ============ RENDER + INPUT + SCREENS ============ */
const cv = document.getElementById('c'), ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
const UI = { screen: 'title', paused: false, howPage: 0, confirmReset: false, t: 0 };
const DEBUG = { on: false, enabled: CONFIG.debug || /[?&]debug=1/.test(location.search), scale: 1, hit: false, pct: true, grant: 0 };
const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
const RB = (x, y, w, h, c) => { R(x, y, w, 1, c); R(x, y + h - 1, w, 1, c); R(x, y, 1, h, c); R(x + w - 1, y, 1, h, c); };
function drawCar(car) { drawCarSprite(ctx, carSprite(car.tier, car.mi, car.dir), car.x, car.y); }

/* ---- static background (pre-rendered once) ---- */
let BG = null;
function buildBG() {
  BG = document.createElement('canvas'); BG.width = 320; BG.height = 180; const g = BG.getContext('2d'); const r = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  r(0, 0, 320, 180, PAL.asph); r(0, 10, 320, 28, PAL.plum); r(0, 10, 320, 2, PAL.wine);
  for (let x = 0; x < 320; x += 40) r(x, 12, 2, 26, PAL.mauve);
  r(0, 38, 320, 6, PAL.lgrey); for (let x = 0; x < 320; x += 8) r(x, 38, 1, 6, PAL.khaki); r(0, 43, 320, 1, PAL.white);
  r(0, 44, 320, 22, PAL.night); // gardens either side
  for (let x = 0; x < 320; x += 3) { if (x > 90 && x < 230) continue; r(x, 58 + (x % 2), 3, 8, x % 6 ? PAL.green : PAL.teal); }
  r(92, 44, 136, 22, PAL.asph2); // drive
  g.fillStyle = PAL.green; for (let y = 0; y < 10; y++) { const hw = Math.round(42 * Math.sqrt(1 - Math.pow((10 - y) / 10, 2))); g.fillRect(160 - hw, 56 + y, hw * 2, 1); }
  r(154, 60, 12, 5, PAL.lgrey); r(156, 61, 8, 3, PAL.royal);
  r(0, 66, 320, 12, PAL.asph); r(0, 66, 320, 1, PAL.lgrey); r(0, 77, 320, 1, PAL.lgrey); for (let x = 0; x < 320; x += 12) r(x, 71, 6, 1, PAL.yellow);
  r(0, 78, 320, 102, PAL.night); r(aisleX('west') - 8, 78, LOT_R - MAP.lotX + 32, LOT_B - 78, PAL.asph); r(MAP.lotX, MAP.lotY, NS * SW, NL * SH, PAL.asph2);
  for (let i = 0; i <= NL; i++) r(MAP.lotX, MAP.lotY + i * SH, NS * SW, 1, PAL.asph3);
  for (let i = 0; i < NL; i++) for (let j = 0; j <= NS; j++) { r(MAP.lotX + j * SW, MAP.lotY + i * SH, 1, 3, PAL.dgrey); r(MAP.lotX + j * SW, MAP.lotY + i * SH + SH - 3, 1, 3, PAL.dgrey); }
  r(MAP.lotX + HALF * SW, MAP.lotY, 1, NL * SH, PAL.dgrey);
  TEMPS.forEach(t => { g.fillStyle = PAL.orange; g.fillRect(t.x - 10, t.y - 6, 20, 1); g.fillRect(t.x - 10, t.y + 6, 20, 1); g.fillRect(t.x - 10, t.y - 6, 1, 13); g.fillRect(t.x + 9, t.y - 6, 1, 13); });
  r(222, 82, 92, 9, PAL.green); r(234, 91, 1, 6, PAL.lgrey);
}
function drawPalm(x, y) { R(x, y, 1, 14, PAL.brown); R(x - 4, y - 1, 9, 1, PAL.emer); R(x - 5, y, 2, 1, PAL.green); R(x + 4, y, 2, 1, PAL.green); R(x - 2, y - 2, 5, 1, PAL.leaf); }
function drawWorldStatic() {
  ctx.drawImage(BG, 0, 0); const t = UI.t;
  for (let row = 0; row < 2; row++) for (let x = 6; x < 316; x += 10) { if (x > 118 && x < 202 && row === 0) continue; if (x > 146 && x < 174) continue;
    const seed = (x * 7 + row * 13) % 17; const lit = (seed + Math.floor(t / 4 + seed)) % 5; R(x, 16 + row * 10, 4, 4, lit === 0 ? PAL.navy : lit === 1 ? PAL.orange : PAL.yellow); }
  const neon = Math.sin(t * 9) > -0.9 ? PAL.pink : PAL.plum; RB(120, 11, 80, 9, neon); drawText(ctx, 'HOTEL MONTE CARLO', 160, 13, neon, { align: 'center' });
  R(150, 26, 20, 12, PAL.navy); R(150, 26, 1, 12, PAL.orange); R(169, 26, 1, 12, PAL.orange); R(160, 26, 1, 12, PAL.orange);
  for (let x = 146; x < 174; x += 4) R(x, 23, 2, 3, PAL.red), R(x + 2, 23, 2, 3, PAL.white);
  for (const px of [12, 52, 268, 308]) drawPalm(px, 46);
  for (let i = 0; i < 3; i++) R(158 + i * 2, 58 - ((t * 6 + i * 2) % 4), 1, 1, PAL.blue);
  for (let i = 0; i < NL; i++) { drawText(ctx, LANE_NAMES[i], aisleX('west') - 1, laneY(i) - 2, PAL.asph3); drawText(ctx, LANE_NAMES[i], aisleX('east') - 1, laneY(i) - 2, PAL.asph3); }
  TEMPS.forEach(tp => drawText(ctx, tp.name, tp.x - 3, tp.y - 2, PAL.orange)); drawText(ctx, 'GENERAL PARK >', 225, 84, PAL.white);
}

/* ---- people & bubbles ---- */
function guestPose(g) { const s = g.stage, t = UI.t; let pose = 'idle', dx = 0, dy = 0, cols = { ...g.colors };
  if (g.state === 'pickWalk' || g.state === 'toSpot' || g.state === 'leavingIn' || g.state === 'pickBoard') pose = Math.floor(t * 6) % 2 ? 'walk' : 'idle';
  else if (s === 1) pose = 'idle'; else if (s === 2) pose = Math.floor(t * 4) % 2 ? 'tap' : 'idle'; else if (s === 3) { pose = 'cross'; cols.s = PAL.salmon || PAL.pink; }
  else if (s >= 4) { pose = 'arms'; cols.s = PAL.red; dy = -Math.abs(Math.round(Math.sin(t * 12) * 2)); dx = Math.round(Math.sin(t * 40)); }
  return { pose, dx, dy, cols, flip: s === 1 && Math.floor(t * 1.5) % 2 }; }
function bubbleFor(g) { if (!WAITING.has(g.state) && g.state !== 'greeting') return null; if (g.ignoreT > 0) return { text: 'ON CALL', kind: 'phone' }; const s = g.stage;
  if (s === 0) return null; if (s <= 2) return { text: g.line || '...', kind: 'w' };
  if (s === 3) { const f = (g.wait / g.patience - 0.7) / 0.2; return { text: CONFIG.lines.angry[clamp(Math.floor(f * 3), 0, 2)], kind: 'r' }; }
  const n = s === 5 ? 6 + Math.min(4, Math.floor(g.over / 5)) : 5; const ch = CONFIG.lines.grawlixChars; let txt = ''; const seed = Math.floor(UI.t / 0.3);
  for (let i = 0; i < n; i++) txt += ch[(seed * 7 + i * 3 + g.id) % ch.length]; return { text: txt + '!', kind: s === 5 ? 'm' : 'g' }; }
function drawBubbles(list) { // list of {x,y,b,order}; stack upward when overlapping, newest on top
  const placed = []; list.sort((a, b) => a.order - b.order);
  for (const it of list) { const lines = wrapText(it.b.text, 10); const w = Math.max(...lines.map(l => textW(l))) + 5, h = lines.length * 6 + 4; let x = clamp(Math.round(it.x - 3), 1, 319 - w), y = it.y - h - 3;
    for (let guard = 0; guard < 8; guard++) { const hit = placed.find(p => x < p.x + p.w && x + w > p.x && y < p.y + p.h && y + h > p.y); if (!hit) break; y = hit.y - h - 1; }
    placed.push({ x, y, w, h }); const k = it.b.kind; const flash = k === 'm' && Math.floor(UI.t * 6) % 2;
    const bg = k === 'g' || k === 'm' ? PAL.red : PAL.white, bd = k === 'g' || k === 'm' ? (flash ? PAL.white : PAL.yellow) : PAL.ink, fg = k === 'r' ? PAL.red : k === 'g' || k === 'm' ? PAL.white : PAL.ink;
    R(x, y, w, h, bg); RB(x, y, w, h, bd); R(it.x, y + h, 2, 1, bd); R(it.x, y + h + 1, 1, 1, bd);
    lines.forEach((l, i) => drawText(ctx, l, x + 3, y + 2 + i * 6, fg)); if (k === 'phone') drawIcon(ctx, 'phone', x + w - 5, y + 1, PAL.ink); }
}

/* ---- game render ---- */
function renderGame() {
  const shake = S.shake > 0 ? Math.round(rnd(-1, 1)) : 0; ctx.save(); ctx.translate(shake, 0); drawWorldStatic(); tutWorldFx();
  // lot cars
  for (const car of S.cars.values()) if (car.loc.t !== 'moving' && car.loc.t !== 'street') drawCar(car);
  S.streetQueue.forEach((id, n) => { if (n < LOT.streetQueueMax) drawCar(S.cars.get(id)); }); if (S.streetQueue.length > LOT.streetQueueMax) drawText(ctx, '+' + (S.streetQueue.length - LOT.streetQueueMax), 2, 68, PAL.yellow);
  const v = S.valet; for (const w of workers()) if (w.inCar) drawCar(S.cars.get(w.inCar));
  // reserved (restow) stalls
  S.lanes.forEach((L, i) => L.res.forEach((r, j) => { if (r !== null && L.cars[j] === null) RB(MAP.lotX + j * SW + 2, MAP.lotY + i * SH + 2, SW - 3, SH - 3, PAL.dgrey); }));
  // podium
  { const px = CONFIG.podium.x; R(px, 35, 5, 8, PAL.brown); R(px + 1, 36, 3, 6, PAL.rust); R(px - 1, 34, 7, 2, PAL.yellow); R(px + 1, 33, 3, 1, PAL.white); }
  // claim timers & tickets
  const bubbles = [];
  for (const g of S.guests.values()) { const car = S.cars.get(g.carId);
    if (g.state === 'curbDrop' && isWhale(g.tier) && !g.claimed && car) { const f = 1 - g.claimT / CONFIG.power.rivalClaimSec; R(car.x - 7, car.y - 7, 14, 2, PAL.ink); R(car.x - 7, car.y - 7, Math.round(14 * f), 2, PAL.lav); }
    if (['curbDrop', 'handed', 'leavingIn', 'pickWalk', 'handTicket', 'toSpot', 'pickWait', 'pickBoard', 'greeting'].includes(g.state)) { const p = guestPose(g); drawPerson(ctx, Math.round(g.x + p.dx), g.y + p.dy, p.pose, p.cols, p.flip);
      if (g.state === 'handTicket') drawIcon(ctx, 'ticket', g.x + 5, g.y + 3, PAL.yellow);
      if (g.stage === 5) R(g.x + 5, g.y - 1, 2, 3, PAL.ink);
      const b = bubbleFor(g); if (b) bubbles.push({ x: g.x + 1, y: g.y, b, order: g.stageAt || 0 }); } }
  for (const n of S.npcs) drawPerson(ctx, n.x, n.y, 'walk', { h: PAL.ink, s: PAL.peach, c: n.kind === 'newbie' ? PAL.lime : PAL.lav, p: PAL.ink, k: PAL.ink, x: n.kind === 'newbie' ? PAL.lime : PAL.lav });
  // valet
  const uni = { h: PAL.ink, s: PAL.peach, c: PAL.red, p: PAL.ink, k: PAL.ink, x: PAL.red };
  const crew = S.helpers.length > 0;
  for (const w of workers()) { const wx = w.x + (w.off || 0);
    if (w === S.valet && !tutValetVisible()) continue;
    if (!w.inCar && S.phase !== 'fired' || (w === S.valet && S.phase === 'fired' && S.endT < 2)) drawPerson(ctx, Math.round(wx - 2), Math.round(w.y - 8 + (w === S.valet ? tutValetOffset() : 0)), w.walking && Math.floor(UI.t * 8) % 2 ? 'walk' : 'idle', w === S.valet ? uni : { ...uni, h: PAL.brown }, w.dir === 2);
    const hx = w.inCar ? w.x : wx, hy = w.inCar ? w.y - 4 : w.y;
    if (w.job && w.job.est > 0) { const f = clamp(w.job.elapsed / w.job.est, 0, 1); R(hx - 6, hy - 12, 12, 2, PAL.ink); R(hx - 6, hy - 12, Math.round(12 * f), 2, PAL.lime); }
    if (w.waitLabel === 'BAGS') drawIcon(ctx, 'cart', hx + 3, hy - 6, PAL.orange);
    if (S.boost.hustle > 0 || S.boost.coffee > 0) R(hx - 3, hy + 1, 1, 1, PAL.yellow);
    if (crew) { const tag = w.id === 0 ? '1' : String(S.helpers.indexOf(w) + 2); const act = w.id === S.activeW;
      if (act) { const by = hy - 22 + (Math.floor(UI.t * 3) % 2); R(hx - 1, by, 3, 1, PAL.yellow); R(hx, by + 1, 1, 1, PAL.yellow); }
      R(hx - 2, hy - 19, 5, 7, act ? PAL.yellow : PAL.ink); drawText(ctx, tag, hx, hy - 18, act ? PAL.ink : PAL.white, { align: 'center' }); if (w.leaving) drawText(ctx, 'BYE', hx, hy - 24, PAL.lgrey, { align: 'center' }); } }
  // manager
  if (S.manager || S.phase === 'fired') { const mx = S.phase === 'fired' ? 156 - Math.min(20, S.endT * 15) : 156; drawPerson(ctx, mx, 29, 'idle', { h: PAL.lgrey, s: PAL.peach, c: PAL.ink, p: PAL.ink, k: PAL.ink });
    if (S.manager) bubbles.push({ x: mx + 1, y: 29, b: { text: S.manager.line, kind: 'w' }, order: 1e9 }); }
  drawBubbles(bubbles);
  for (const p of S.particles) R(p.x, p.y, 1, 1, p.c);
  for (const f of S.floaters) drawText(ctx, f.text, f.x, f.y, f.color, { align: 'center', shadow: PAL.ink });
  renderSelection(); ctx.restore();
  renderHUD();
  if (S.meltdown && Math.floor(UI.t * 4) % 2) { RB(0, 0, 320, 180, PAL.red); RB(1, 1, 318, 178, PAL.red); }
  for (const b of S.banners) { R(60, 64, 200, 14, PAL.ink); RB(60, 64, 200, 14, PAL.yellow); drawText(ctx, b.text, 160, 69, PAL.yellow, { align: 'center' }); }
  S.toasts.forEach((o, i) => { const w = textW(o.msg) + 8; R(160 - w / 2, 124 + i * 10, w, 9, PAL.ink); RB(160 - w / 2, 124 + i * 10, w, 9, PAL.red); drawText(ctx, o.msg, 160, 126 + i * 10, PAL.white, { align: 'center' }); });
  if (S.phase === 'fired' && S.endT > 1.2) { R(0, 60, 320, 50, PAL.ink); drawText(ctx, "YOU'RE FIRED!", 160, 66, PAL.red, { align: 'center', scale: 3, shadow: PAL.crimson });
    wrapText(S.firedLine, 60).forEach((l, i) => drawText(ctx, l, 160, 90 + i * 7, PAL.white, { align: 'center' }));
    const hy = 40 - (S.endT - 1.2) * 30; R(S.valet.x + (S.endT - 1.2) * 20, hy, 4, 2, PAL.red); }
  if (S.phase === 'clockout') { R(0, 66, 320, 30, PAL.ink); drawText(ctx, 'SHIFT OVER', 160, 72, PAL.yellow, { align: 'center', scale: 3, shadow: PAL.orange }); }
  tutRender();
  if (DEBUG.on) renderDebug();
}
function renderHUD() {
  R(0, 0, 320, 10, PAL.ink); drawText(ctx, fmtMoney(S.money), 2, 3, PAL.yellow); drawText(ctx, fmtClock(hourNow()), 38, 3, PAL.white);
  drawText(ctx, 'MANAGER', 72, 3, PAL.lgrey); const hf = S.heat / CONFIG.heat.max; const hc = hf < 0.5 ? PAL.lime : hf < 0.75 ? PAL.yellow : (Math.floor(UI.t * 4) % 2 ? PAL.red : PAL.crimson);
  R(102, 2, 70, 6, PAL.asph3); R(102, 2, Math.round(70 * hf), 6, hc); RB(101, 1, 72, 8, PAL.lgrey);
  const n = slotsAllowed();
  for (let i = 0; i < CONFIG.power.maxSlots; i++) { const x = 178 + i * 12; const c = S.cards[i];
    if (i >= n) { R(x, 1, 9, 8, PAL.asph3); drawIcon(ctx, 'lock', x + 2, 2, PAL.dgrey); continue; }
    if (c) { const I = POWER_INFO[c.type]; R(x, 1, 9, 8, I.color); drawText(ctx, I.short, x + 3, 3, PAL.ink); if (S.armed === i) RB(x - 1, 0, 11, 10, PAL.white); } else RB(x, 1, 9, 8, PAL.dgrey); }
  for (let i = 0; i < Math.min(S.stars, 4); i++) drawIcon(ctx, 'star', 240 + i * 6, 3, PAL.yellow);
  drawText(ctx, 'HI ' + fmtMoney(SAVE.highScore), 318, 3, PAL.lav, { align: 'right' });
  // bottom strip: queue
  R(0, 172, 320, 8, PAL.ink); drawText(ctx, S.helpers.length ? (S.activeW === 0 ? 'V1 YOU:' : 'V' + (S.helpers.indexOf(activeWorker()) + 2) + ':') : 'QUEUE:', 2, 174, S.helpers.length ? PAL.yellow : PAL.lgrey);
  queueItems().forEach(q => { const car = S.cars.get(q.j.carId); const active = !!q.j.worker; drawText(ctx, q.label, q.x, 174, active ? PAL.lime : q.j.waitMsg ? PAL.orange : PAL.white);
    if (!q.j.type.startsWith('restow') || true) drawIcon(ctx, 'x', q.x + q.w + 2, 173, PAL.red); void car; });
  drawIcon(ctx, 'pause', 312, 173, PAL.white); drawIcon(ctx, Sound.muted ? 'spkoff' : 'spk', 298, 173, PAL.white);
  renderBoard(); if (!S.tutorial || TUT_STEPS[TUT.i].crew) renderCrewPanel();
  if (S.galaActive) drawText(ctx, 'GALA ' + Math.ceil(S.galaEnd - S.t) + 'S', 280, 84, PAL.pink);
  const sel = S.selected && S.cars.get(S.selected.carId); if (sel) drawText(ctx, carName(sel), 222, 150, PAL.yellow);
  else if (S.armed !== null && S.cards[S.armed]) drawText(ctx, POWER_INFO[S.cards[S.armed].type].name + ': TAP TARGET', 222, 150, PAL.white);
  if (canClockOut()) { R(226, 158, 88, 12, PAL.green); RB(226, 158, 88, 12, PAL.lime); drawText(ctx, 'CLOCK OUT', 270, 162, PAL.white, { align: 'center' }); }
}
/* ---- retrieve board: one row per ticket handed in at the podium, most urgent first ---- */
const TIER_MARK = { beater: ['B', PAL.khaki], standard: ['S', PAL.blue], premium: ['P', PAL.lav], whale: ['W', PAL.pink], ultra: ['U', PAL.yellow], limo: ['L', PAL.white] };
function boardList() { return [...S.guests.values()].filter(g => g.ticket && (g.state === 'toSpot' || g.state === 'pickWait')).sort((a, b) => b.wait / b.patience - a.wait / a.patience); }
function boardRows() { const list = boardList(); return { rows: list.slice(0, CONFIG.podium.boardRows).map((g, i) => ({ g, y: 102 + i * 9 })), more: Math.max(0, list.length - CONFIG.podium.boardRows) }; }
function renderBoard() {
  R(221, 92, 98, 56, PAL.ink); RB(221, 92, 98, 56, PAL.lgrey); drawText(ctx, 'TICKETS', 224, 94, PAL.yellow);
  if (lotFull()) { if (Math.floor(UI.t * 3) % 2) drawText(ctx, 'LOT FULL', 316, 94, PAL.red, { align: 'right' }); } else drawText(ctx, 'FREE ' + freeStalls(), 316, 94, PAL.lgrey, { align: 'right' });
  R(222, 100, 96, 1, PAL.dgrey);
  const { rows, more } = boardRows();
  if (!rows.length) drawText(ctx, S.t < (CONFIG.ramp.enabled ? CONFIG.ramp.steps[1].fromSec : 0) ? 'NO PICKUPS YET' : 'NO TICKETS', 270, 118, PAL.dgrey, { align: 'center' });
  for (const { g, y } of rows) { const car = S.cars.get(g.carId); if (!car) continue; const f = g.wait / g.patience;
    const c = f < 0.45 ? PAL.lime : f < 0.7 ? PAL.yellow : f < 0.9 ? PAL.orange : (Math.floor(UI.t * 4) % 2 ? PAL.red : PAL.crimson);
    R(223, y, 2, 8, c); drawIcon(ctx, 'ticket', 227, y + 2, PAL.yellow); drawText(ctx, String(g.ticket), 233, y + 2, PAL.white); const [m, mc] = TIER_MARK[g.tier]; drawText(ctx, m, 247, y + 2, mc);
    const loc = car.loc.t === 'stall' ? stallName(car.loc.lane, car.loc.idx) : car.loc.t === 'temp' ? TEMPS[car.loc.i].name : '..'; drawText(ctx, loc, 254, y + 2, PAL.lgrey);
    const fetching = S.jobs.some(j => j.type === 'fetch' && j.carId === g.carId && !j.aborted);
    if (fetching) drawText(ctx, 'FETCH', 316, y + 2, PAL.lime, { align: 'right' });
    else { if (car.loc.t === 'stall') { const d = liveDepth(car.loc.lane, car.loc.idx).best; drawText(ctx, 'D' + d, 268, y + 2, d ? PAL.orange : PAL.lime); }
      drawText(ctx, String(Math.floor(g.wait)), 316, y + 2, c, { align: 'right' }); } }
  if (more) drawText(ctx, '+' + more + ' MORE', 270, 143, PAL.orange, { align: 'center' });
}
/* ---- crew panel (left, under the temp slots) ---- */
function crewButton() { const w = activeWorker(); if (w.id !== 0) sendHome(w); else hireValet(); }
function renderCrewPanel() {
  const w = activeWorker(); const full = S.helpers.length >= CONFIG.helpers.max; const poor = S.money < CONFIG.helpers.costPerHour;
  const home = w.id !== 0; const col = home ? PAL.orange : full || poor ? PAL.dgrey : PAL.lime;
  R(2, 124, 28, 44, PAL.ink); RB(2, 124, 28, 44, col);
  const lines = home ? ['V' + (S.helpers.indexOf(w) + 2), 'SEND', 'HOME', ''] : full ? ['CREW', 'FULL', '', ''] : ['HIRE', 'VALET', fmtMoney(CONFIG.helpers.costPerHour), '/HR'];
  lines.forEach((l, i) => drawText(ctx, l, 16, 127 + i * 7, i < 2 ? PAL.white : col, { align: 'center' }));
  for (let i = 0; i < CONFIG.helpers.max; i++) R(6 + i * 7, 160, 5, 4, i < S.helpers.length ? PAL.red : PAL.dgrey);
}
const canClockOut = () => S.phase === 'play' && hourNow() >= CONFIG.clock.clockOutHour;
function queueItems() { let x = S.helpers.length && S.activeW === 0 ? 32 : 28; const out = []; for (const j of S.jobs) { if (j.aborted || j.wid !== S.activeW) continue; const label = jobLabel(j); const w = textW(label); out.push({ j, label, x, w }); x += w + 10; if (x > 280) break; } return out; }

/* ---- selection: stall highlights + curb menu ---- */
function selectionOptions() {
  const sel = S.selected; if (!sel) return { stalls: [], menu: [] }; const car = S.cars.get(sel.carId); if (!car) { S.selected = null; return { stalls: [], menu: [] }; }
  const g = S.guests.get(car.guestId); const stalls = [], menu = [];
  const canPark = car.loc.t === 'temp' || (car.loc.t === 'curb' && g && g.state === 'curbDrop' && g.tier !== 'limo');
  if (canPark) for (let l = 0; l < NL; l++) for (const side of ['west', 'east']) { const e = entryIndex(l, side, pendingParks(l, side));
    if (!e) { const j = side === 'west' ? 0 : NS - 1; stalls.push({ lane: l, side, idx: j, bad: true }); continue; }
    const job = { type: car.loc.t === 'temp' ? 'move' : 'park', carId: car.id, lane: l, side, bags: sel.bags }; stalls.push({ lane: l, side, idx: e.idx, depth: e.depth, est: estimateFor(job), job }); }
  if (car.loc.t === 'curb' && g && g.state === 'curbDrop') {
    if (g.tier === 'limo') menu.push({ label: 'GREET', fn: () => { if (enqueue({ type: 'greet', carId: car.id })) S.selected = null; } });
    else if (!isWhale(g.tier)) menu.push({ label: 'WAVE OFF', fn: () => waveOff(car, g) });
    const have = t => S.cards.findIndex(c => c.type === t);
    for (const t of ['pawnOff', 'directAway', 'bags', 'bribe']) { const i = have(t); if (i >= 0 && powerTargets(t, g, car)) menu.push({ label: POWER_INFO[t].name, fn: () => useCard(i, g) }); }
    let x = clamp(car.x - 20, 94, 226 - 44); menu.forEach((m, n) => { m.w = textW(m.label) + 6; m.x = x; m.y = 57 + Math.floor(n / 2) * 0; x += m.w + 2; });
    let mx = clamp(car.x - menu.reduce((a, m) => a + m.w + 2, 0) / 2, 92, 228 - menu.reduce((a, m) => a + m.w + 2, 0)); menu.forEach(m => { m.x = Math.round(mx); m.y = 57; mx += m.w + 2; });
  }
  return { stalls, menu, car };
}
function waveOff(car, g) { const T = CONFIG.tiers[g.tier]; S.stats.waved++; removeQueuedJobsFor(car.id);
  const heat = T.waveOffHeatChance !== undefined ? (Math.random() < T.waveOffHeatChance ? T.waveOffHeat : 0) : T.waveOffHeat;
  if (heat) addHeat(heat, 'YOU WAVED OFF A ' + carName(car) + '.'); floater('GENERAL PARKING >', g.x, g.y - 6, PAL.lime); departCar(car); guestGone(g); S.selected = null; }
function renderSelection() {
  const o = selectionOptions(); if (!S.selected) return; const car = o.car; RB(Math.round(car.x - 10), Math.round(car.y - 6), 20, 13, PAL.yellow);
  if (o.stalls.length && lotFull()) drawText(ctx, 'LOT FULL - NO PARKING', 160, 84, PAL.red, { align: 'center' });
  for (const s of o.stalls) { const x = MAP.lotX + s.idx * SW, y = MAP.lotY + s.lane * SH;
    if (s.bad) { RB(x + 1, y + 1, SW - 2, SH - 2, PAL.dgrey); continue; }
    const pulse = Math.floor(UI.t * 4) % 2 ? PAL.yellow : PAL.orange; RB(x, y, SW + 1, SH + 1, pulse); R(x + 1, y + 1, SW - 1, SH - 1, PAL.ink);
    drawText(ctx, 'D' + s.depth, x + 3, y + 2, PAL.yellow); if (s.est != null) drawText(ctx, String(Math.round(s.est)), x + 3, y + 8, PAL.white); }
  for (const m of o.menu) { R(m.x, m.y, m.w, 9, PAL.ink); RB(m.x, m.y, m.w, 9, PAL.yellow); drawText(ctx, m.label, m.x + 3, m.y + 2, PAL.yellow); }
}

/* ---- input: tap-target then tap-destination, nearest hitbox wins ---- */
function hitTargets() {
  const T = []; const add = (x, y, w, h, pri, fn) => { const cx = x + w / 2, cy = y + h / 2; const W = Math.max(16, w), H = Math.max(16, h); T.push({ x: cx - W / 2, y: cy - H / 2, w: W, h: H, cx, cy, pri, fn }); };
  if (DEBUG.on) debugButtons().forEach(b => add(b.x, b.y, b.w, 8, 9, b.fn));
  if (S.phase !== 'play') { add(0, 0, 320, 180, 0, () => { if (S.endT > 1.5) finishRun(); }); return T; }
  add(308, 170, 10, 10, 5, () => { UI.paused = true; }); add(294, 170, 10, 10, 5, toggleMute);
  if (canClockOut()) add(226, 158, 88, 12, 5, clockOut);
  if (!S.tutorial) add(2, 124, 28, 44, 5, crewButton);
  if (S.helpers.length) for (const w of workers()) if (!w.inCar && !w.leaving) add(w.x + (w.off || 0) - 4, w.y - 10, 8, 12, 6, () => selectWorker(w));
  for (const { g, y } of boardRows().rows) add(222, y, 96, 9, 5, () => tapGuest(g));
  for (let i = 0; i < slotsAllowed(); i++) if (S.cards[i]) add(178 + i * 12, 1, 9, 8, 5, () => armCard(i));
  for (const q of queueItems()) { add(q.x, 172, q.w, 8, 5, () => promoteJob(q.j)); add(q.x + q.w + 1, 172, 5, 8, 6, () => cancelJob(q.j)); }
  const o = selectionOptions();
  for (const m of o.menu) add(m.x, m.y, m.w, 9, 5, m.fn);
  for (const s of o.stalls) if (!s.bad) add(MAP.lotX + s.idx * SW, MAP.lotY + s.lane * SH, SW, SH, 4, () => { if (enqueue(s.job)) { if (s.job.type === 'park') { const g = S.guests.get(S.cars.get(s.job.carId).guestId); if (g) g.claimed = true; } S.selected = null; } });
  for (const g of S.guests.values()) if (WAITING.has(g.state) && g.state !== 'queued') add(g.x - 2, g.y - 1, 9, 11, 2, () => tapGuest(g));
  for (const car of S.cars.values()) { const g = S.guests.get(car.guestId); if (!g) continue;
    if (car.loc.t === 'curb' || car.loc.t === 'temp' || car.loc.t === 'stall') add(car.x - 8, car.y - 4, 16, 8, car.loc.t === 'stall' ? 1 : 3, () => tapCar(car, g)); }
  S.streetQueue.slice(0, LOT.streetQueueMax).forEach(id => { const c = S.cars.get(id); add(c.x - 8, c.y - 4, 16, 8, 3, () => tapGuest(S.guests.get(c.guestId))); });
  add(0, 0, 320, 180, 0, () => { S.selected = null; S.armed = null; });
  return T;
}
function armCard(i) { const c = S.cards[i]; if (!c) return; if (POWER_INFO[c.type].target === 'self') { useCard(i); floater(POWER_INFO[c.type].name + '!', S.valet.x, S.valet.y - 14, PAL.yellow); return; } S.armed = S.armed === i ? null : i; Sound.sfx('click'); }
function tapGuest(g) { if (!g) return; if (S.armed !== null) { useCard(S.armed, g); return; }
  if (g.phase === 'pick' && !g.ticket) { toast('WAIT FOR THE TICKET'); return; }
  if (g.phase === 'pick') { if (S.jobs.some(j => j.type === 'fetch' && j.carId === g.carId)) { toast('ALREADY FETCHING'); return; }
    const car = S.cars.get(g.carId); if (car.loc.t === 'stall') { const d = liveDepth(car.loc.lane, car.loc.idx); if (d.best > freeTemps().length) { toast('NO ROOM TO DIG OUT - FREE A TEMP SLOT'); Sound.sfx('deny'); return; } }
    enqueue({ type: 'fetch', carId: g.carId }); }
  else if (g.state === 'curbDrop') tapCar(S.cars.get(g.carId), g); }
function tapCar(car, g) {
  if (S.armed !== null) { useCard(S.armed, g); return; }
  if (g.phase === 'pick' && WAITING.has(g.state)) return tapGuest(g);
  if (car.loc.t === 'curb' && g.state === 'curbDrop') { if (S.jobs.some(j => j.carId === car.id)) { toast('ALREADY QUEUED'); return; } S.selected = { carId: car.id, bags: false }; Sound.sfx('click'); return; }
  if (car.loc.t === 'temp') { if (S.jobs.some(j => j.carId === car.id && j.type !== 'restow')) return; S.selected = { carId: car.id }; Sound.sfx('click'); return; }
  if (car.loc.t === 'stall') toast('GUEST IS STILL INSIDE');
}
function toggleMute() { Sound.setMuted(!Sound.muted); SAVE.muted = Sound.muted; writeSave(); }
function pointerAt(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 320, (e.clientY - r.top) / r.height * 180]; }
function dispatch(T, x, y) { const hits = T.filter(t => x >= t.x && x < t.x + t.w && y >= t.y && y < t.y + t.h); if (!hits.length) return;
  const top = Math.max(...hits.map(h => h.pri)); const c = hits.filter(h => h.pri === top).sort((a, b) => Math.hypot(a.cx - x, a.cy - y) - Math.hypot(b.cx - x, b.cy - y))[0]; c.fn(); }
cv.addEventListener('pointerdown', e => { e.preventDefault(); Sound.unlock(); if (UI.screen === 'game' && !UI.paused) Sound.startMusic(); const [x, y] = pointerAt(e); if (UI.screen === 'game' && S && S.tutorial && !UI.paused && tutTap(x, y)) return; dispatch(currentTargets(), x, y); });
document.addEventListener('keydown', e => {
  if (e.key === '`' && DEBUG.enabled) DEBUG.on = !DEBUG.on;
  if (UI.screen !== 'game' || !S) return; if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') UI.paused = !UI.paused;
  const n = parseInt(e.key, 10); if (n >= 1 && n <= 5 && !UI.paused) armCard(n - 1);
});
document.addEventListener('visibilitychange', () => { if (document.hidden && UI.screen === 'game') UI.paused = true; });

/* ---- menus / screens ---- */
function button(x, y, w, label, fn, col = PAL.yellow) { return { x, y, w, h: 12, label, fn, col }; }
function drawButtons(bs) { for (const b of bs) { R(b.x, b.y, b.w, b.h, PAL.ink); RB(b.x, b.y, b.w, b.h, b.col); drawText(ctx, b.label, b.x + b.w / 2, b.y + 4, b.col, { align: 'center' }); } }
function screenButtons() {
  if (UI.screen === 'title') return [button(120, 118, 80, 'START', () => (SAVE.tutorialSeen ? startGame() : startTutorial())), button(120, 132, 80, 'TUTORIAL', startTutorial),
    button(120, 146, 80, 'SETTINGS', () => { UI.screen = 'settings'; UI.confirmReset = false; }), button(4, 164, 40, Sound.muted ? 'UNMUTE' : 'MUTE', toggleMute, PAL.lgrey), button(256, 164, 60, 'FULLSCREEN', goFullscreen, PAL.lgrey)];
  if (UI.screen === 'howto') return [button(220, 160, 90, UI.howPage < 2 ? 'NEXT >' : 'DONE', () => { if (UI.howPage < 2) UI.howPage++; else UI.screen = 'title'; })];
  if (UI.screen === 'settings') return [button(100, 70, 120, Sound.muted ? 'SOUND: OFF' : 'SOUND: ON', toggleMute),
    button(100, 88, 120, UI.confirmReset ? 'TAP AGAIN TO CONFIRM' : 'RESET CAREER', () => { if (!UI.confirmReset) { UI.confirmReset = true; return; } const t = SAVE.tutorialSeen; SAVE = defaultSave(); SAVE.tutorialSeen = t; writeSave(); UI.confirmReset = false; }, PAL.red),
    button(100, 130, 120, 'BACK', () => { UI.screen = 'title'; })];
  if (UI.screen === 'summary') return [button(80, 160, 72, 'RETRY', startGame), button(168, 160, 72, 'TITLE', () => { UI.screen = 'title'; })];
  if (UI.screen === 'game' && UI.paused) return [button(120, 80, 80, 'RESUME', () => { UI.paused = false; }), button(120, 96, 80, Sound.muted ? 'UNMUTE' : 'MUTE', toggleMute), button(120, 112, 80, 'QUIT SHIFT', () => { UI.paused = false; UI.screen = 'title'; Sound.stopMusic(); })];
  return [];
}
function currentTargets() { const bs = screenButtons(); if (bs.length || UI.screen !== 'game') return bs.map(b => ({ x: b.x, y: b.y - 2, w: b.w, h: 16, cx: b.x + b.w / 2, cy: b.y + 6, pri: 5, fn: () => { Sound.sfx('click'); b.fn(); } })); return hitTargets(); }
function startGame() { newRun(); UI.screen = 'game'; UI.paused = false; Sound.startMusic(); }
function goFullscreen() { const el = document.documentElement; const f = el.requestFullscreen || el.webkitRequestFullscreen; if (f) try { f.call(el); } catch (e) { /* not supported */ } }
function renderTitle() {
  R(0, 0, 320, 180, PAL.night); for (let i = 0; i < 60; i++) { const x = (i * 53) % 320, y = (i * 29) % 100; if ((i + Math.floor(UI.t * 2)) % 7) R(x, y, 1, 1, i % 3 ? PAL.white : PAL.yellow); }
  R(268, 10, 8, 10, PAL.cream); R(266, 12, 12, 6, PAL.cream); R(271, 9, 8, 9, PAL.night);
  R(70, 30, 180, 106, PAL.plum); R(150, 20, 20, 10, PAL.plum); for (let y = 36; y < 130; y += 10) for (let x = 76; x < 246; x += 10) R(x, y, 4, 4, (x * y) % 7 ? PAL.yellow : PAL.orange);
  R(44, 46, 232, 44, PAL.ink); RB(44, 46, 232, 44, Math.sin(UI.t * 7) > -0.8 ? PAL.pink : PAL.plum);
  drawText(ctx, 'MONTE CARLO', 160, 52, PAL.pink, { align: 'center', scale: 3, shadow: PAL.crimson }); drawText(ctx, 'VALET', 160, 70, PAL.yellow, { align: 'center', scale: 3, shadow: PAL.orange });
  R(0, 136, 320, 4, PAL.lgrey); R(0, 140, 320, 40, PAL.asph); const cx = (UI.t * 40) % 400 - 40; drawCarSprite(ctx, carSprite('whale', 1, 0), cx, 150); drawCarSprite(ctx, carSprite('limo', 1, 2), 360 - ((UI.t * 25) % 420), 160);
  R(70, 102, 180, 11, PAL.ink); drawText(ctx, 'HI-SCORE ' + fmtMoney(SAVE.highScore) + '   RANK: ' + CONFIG.career.ranks[SAVE.rank || 0].name, 160, 106, PAL.yellow, { align: 'center' });
  drawText(ctx, 'V' + CONFIG.version, 2, 2, PAL.dgrey); drawButtons(screenButtons());
}
const HOWTO = [
  ['PARKING', ['TAP A CAR AT THE CURB, THEN TAP A LANE END.', 'CARS SLIDE IN AS DEEP AS THEY CAN GO.', 'EACH LANE IS TWO STACKS: WEST AND EAST.', 'D# = HOW DEEP. DEEPER = SLOWER TO DIG OUT.']],
  ['FETCHING', ['GUESTS HAND THEIR TICKET IN AT THE PODIUM.', 'TAP A TICKET ON THE BOARD TO FETCH THE CAR.', 'BLOCKERS GO TO TEMP SLOTS T1-T4, THEN A', 'RESTOW JOB PUTS THEM BACK.']],
  ['MONEY & HEAT', ['WHALES TIP BIG ON ARRIVAL AND COOL THE HEAT.', 'THEY NEVER LEAVE - THEY ESCALATE. RIVALS', 'STEAL UNCLAIMED WHALES AFTER 6S.', 'HEAT 100 = FIRED. FROM 10PM YOU CAN CLOCK OUT.']],
];
function renderText(title, lines) { R(0, 0, 320, 180, PAL.night); drawText(ctx, title, 160, 20, PAL.yellow, { align: 'center', scale: 2, shadow: PAL.orange }); lines.forEach((l, i) => drawText(ctx, l, 160, 50 + i * 10, PAL.white, { align: 'center' })); }
function renderSummary() { const r = RESULT; R(0, 0, 320, 180, PAL.night);
  drawText(ctx, r.kind === 'fired' ? 'FIRED' : 'CLOCKED OUT', 160, 8, r.kind === 'fired' ? PAL.red : PAL.lime, { align: 'center', scale: 2 });
  wrapText(r.kind === 'fired' ? 'THE MOMENT: ' + r.reason : 'YOU CLOCKED OUT AT ' + fmtClock(r.hour) + '. NICE NIGHT.', 70).forEach((l, i) => drawText(ctx, l, 160, 24 + i * 7, PAL.white, { align: 'center' }));
  const s = r.st; const rows = [['TOTAL EARNED', fmtMoney(r.money)], ['TIPS / PAY', fmtMoney(s.tips) + ' / ' + fmtMoney(s.pay)], ...(s.wages ? [['VALET WAGES', '-' + fmtMoney(s.wages)]] : []), ['CARS PARKED', s.carsParked], ['WHALES SERVED', s.whalesServed], ['BIGGEST TIP', fmtMoney(s.biggestTip)],
    ['WORST GRAWLIX', s.longestWhaleName ? Math.round(s.longestWhaleWait) + 'S - ' + s.longestWhaleName : 'NONE'], ['TIME SURVIVED', Math.floor(r.t / 60) + 'M ' + Math.floor(r.t % 60) + 'S'], ['ANGRY / STOLEN', s.angry + ' / ' + s.stolen], ['CAREER XP', '+' + r.xp], ['HIGH SCORE', fmtMoney(SAVE.highScore)]];
  rows.forEach(([a, b], i) => { drawText(ctx, a, 60, 42 + i * 10, PAL.lgrey); drawText(ctx, String(b), 260, 42 + i * 10, PAL.yellow, { align: 'right' }); });
  if (r.isHigh && Math.floor(UI.t * 3) % 2) drawText(ctx, 'NEW HIGH SCORE!', 160, 146, PAL.pink, { align: 'center' }); drawButtons(screenButtons()); }

/* ---- debug overlay ---- */
function debugButtons() { const b = []; let y = 12; const row = (items) => { let x = 222; for (const [l, fn] of items) { const w = textW(l) + 4; b.push({ x, y, w, label: l, fn }); x += w + 2; } y += 10; };
  const speeds = [0.25, 0.5, 1, 2, 4];
  row([['SPD-', () => { DEBUG.scale = speeds[Math.max(0, speeds.indexOf(DEBUG.scale) - 1)]; }], ['SPD+', () => { DEBUG.scale = speeds[Math.min(4, speeds.indexOf(DEBUG.scale) + 1)]; }], ['GALA', () => { S.galaAt = 0; }]]);
  row([['H-10', () => { S.heat = Math.max(0, S.heat - 10); enforceSlots(); }], ['H+10', () => addHeat(10 / (1 + S.heat / 100), 'DEBUG.')], ['H90', () => { S.heat = 90; enforceSlots(); }]]);
  row([['B', () => spawnArrival('beater')], ['S', () => spawnArrival('standard')], ['P', () => spawnArrival('premium')], ['W', () => spawnArrival('whale')], ['U', () => spawnArrival('ultra')], ['L', () => spawnArrival('limo')]]);
  row([['FILL', () => { for (let l = 0; l < NL; l++) for (const s of ['west', 'east']) { let e; while ((e = entryIndex(l, s))) { const g = makeGuest('beater', 0); placeInStall(S.cars.get(g.carId), l, e.idx); g.state = 'inside'; g.stay = 999; } } }],
    ['GRANT', () => { const k = Object.keys(POWER_INFO)[DEBUG.grant++ % 10]; grantCard(k); }], ['HIT', () => { DEBUG.hit = !DEBUG.hit; }], ['XP+1K', () => { SAVE.careerXP += 1000; writeSave(); }]]);
  return b; }
function renderDebug() { R(220, 10, 100, 44, PAL.ink); for (const b of debugButtons()) { RB(b.x, b.y, b.w, 8, PAL.lime); drawText(ctx, b.label, b.x + 2, b.y + 2, PAL.lime); }
  drawText(ctx, 'X' + DEBUG.scale + ' HEAT ' + S.heat.toFixed(1), 222, 52, PAL.lime);
  for (const g of S.guests.values()) if (WAITING.has(g.state) && g.state !== 'queued') drawText(ctx, Math.round(100 * g.wait / g.patience) + '%', g.x, g.y + 10, PAL.lime);
  if (DEBUG.hit) { for (const t of hitTargets()) RB(t.x, t.y, t.w, t.h, PAL.blue); for (const n of NODES.values()) R(n.x, n.y, 1, 1, PAL.lime); } }

/* ---- scaling + main loop ---- */
function resize() { const w = Math.min(innerWidth, innerHeight * 16 / 9); cv.style.width = w + 'px'; cv.style.height = (w * 9 / 16) + 'px'; } // canvas is 960x540 (3x game grid)
addEventListener('resize', resize);
let last = performance.now(), acc = 0; const TICK = 1 / 60;
function frame(now) {
  const dt = Math.min(0.25, (now - last) / 1000); last = now; UI.t += dt;
  if (UI.screen === 'game' && S && !UI.paused) { acc += dt; while (acc >= TICK) { stepSim(TICK * DEBUG.scale); acc -= TICK; if (UI.screen !== 'game') break; } } else acc = 0;
  ctx.setTransform(CAR_RES, 0, 0, CAR_RES, 0, 0); ctx.imageSmoothingEnabled = false;
  if (UI.screen === 'title') renderTitle(); else if (UI.screen === 'howto') { renderText(HOWTO[UI.howPage][0], HOWTO[UI.howPage][1]); drawButtons(screenButtons()); }
  else if (UI.screen === 'settings') { renderText('SETTINGS', []); drawButtons(screenButtons()); } else if (UI.screen === 'summary') renderSummary();
  else if (UI.screen === 'game') { renderGame(); if (UI.paused) { R(90, 60, 140, 70, PAL.ink); RB(90, 60, 140, 70, PAL.yellow); drawText(ctx, 'PAUSED', 160, 66, PAL.yellow, { align: 'center', scale: 2 }); drawButtons(screenButtons()); } }
  if (innerHeight > innerWidth) { R(0, 0, 320, 180, PAL.ink); drawText(ctx, 'ROTATE YOUR DEVICE', 160, 86, PAL.yellow, { align: 'center', scale: 2 }); }
  requestAnimationFrame(frame);
}
function boot() { loadSave(); Sound.muted = !!SAVE.muted; buildGraph(); buildBG(); resize(); requestAnimationFrame(frame);
  window.MCV = { CONFIG, get S() { return S; }, UI, DEBUG, JOBLOG, startGame, plan, route, newRun, stepSim, spawnArrival, enqueue, entryIndex, liveDepth, SAVE: () => SAVE }; }
boot();
