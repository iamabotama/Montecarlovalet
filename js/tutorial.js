'use strict';
/* =====================================================================
   TUTORIAL: scripted first shift. Each step = text panel + optional highlight.
   Steps without `until` wait for a tap ("TAP TO CONTINUE"); steps with `until`
   wait for the player to do the thing. During the tutorial: no random arrivals,
   no patience loss, no heat. Edit TUT_STEPS to change the script.
   ===================================================================== */
const TUT = { on: false, i: 0, t: 0, hotelDrop: 1, valetDrop: 1, showValet: true, g1: null, limo: null, bg: null };
const easeBounce = t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375; return n * (t -= 2.625 / d) * t + 0.984375; };
const tutGuest = id => (id && S.guests.get(id)) || null;
const tutCarRect = gid => { const g = tutGuest(gid); const c = g && S.cars.get(g.carId); return c ? [c.x - 9, c.y - 6, 18, 12] : null; };
const HL = { money: [0, 0, 36, 10], heat: [100, 0, 74, 10], cards: [176, 0, 62, 10], board: [221, 92, 98, 56], podium: [CONFIG.podium.x - 9, 30, 20, 14], valet: () => [S.valet.x - 6, S.valet.y - 11, 12, 14], laneC: [MAP.lotX - 2, MAP.lotY + 2 * SH, NS * SW + 4, SH] };

const TUT_STEPS = [
  { pos: 'mid', text: 'WELCOME TO THE HOTEL MONTE CARLO - WHERE THE RICHEST GUESTS ON THE RIVIERA LEAVE THEIR CARS.', enter() { TUT.hotelDrop = 0; TUT.showValet = false; } },
  { pos: 'mid', hl: HL.valet, text: 'THIS IS YOU: THE NEW VALET. YOU PARK THE CARS, BRING THEM BACK, AND KEEP EVERY GUEST HAPPY.', enter() { TUT.showValet = true; TUT.valetDrop = 0; } },
  { pos: 'mid', text: 'HERE COMES YOUR FIRST GUEST...', enter() { TUT.g1 = spawnArrival('standard').id; }, until: () => { const g = tutGuest(TUT.g1); return g && g.state === 'curbDrop'; } },
  { pos: 'mid', hl: () => tutCarRect(TUT.g1), text: 'TAP THEIR CAR TO TAKE THE KEYS.', until: () => S.selected && tutGuest(TUT.g1) && S.selected.carId === tutGuest(TUT.g1).carId },
  { pos: 'R', hl: [MAP.lotX - 2, MAP.lotY - 1, NS * SW + 4, NL * SH + 2], text: 'GLOWING STALLS ARE YOUR CHOICES. ROWS FILL FROM THE MIDDLE OUT. D = HOW DEEP (CARS PARKED LATER WILL BLOCK IT IN). THE NUMBER = SECONDS TO PARK.' },
  { pos: 'R', hl: () => (S.selected ? null : tutCarRect(TUT.g1)), text: 'TAP ANY GLOWING STALL TO PARK. FAR AWAY IS FINE - NOBODY IS IN A HURRY YET.',
    until: () => S.stats.carsParked >= 1 && !S.valet.job },
  { pos: 'mid', text: 'PARKED! YOUR GUEST WENT INSIDE. THEY WILL BE BACK FOR THE CAR LATER.' },
  { pos: 'R', hl: () => tutCarRect(TUT.limo), text: 'A LIMO! LIMOS DON\'T PARK. TAP THE LIMO, THEN TAP GREET.', enter() { TUT.limo = spawnArrival('limo').id; }, until: () => S.stats.limos >= 1 },
  { pos: 'mid', hl: HL.money, text: 'THE VIP PAID YOU FOR A QUICK HELLO. IGNORE A LIMO AND THE MANAGER HEARS ABOUT IT.' },
  { pos: 'L', hl: HL.podium, text: 'YOUR FIRST GUEST IS LEAVING. WATCH THE PODIUM...', enter() { const g = tutGuest(TUT.g1); if (g) g.stay = 0; }, until: () => { const g = tutGuest(TUT.g1); return !g || g.ticket; } },
  { pos: 'L', hl: HL.board, text: 'THEY HANDED THEIR TICKET IN AT THE PODIUM. IT SHOWS ON THE BOARD: TICKET, CAR TYPE (B S P W U), STALL, DEPTH (D0 = FREE TO DRIVE OUT) AND SECONDS WAITING.' },
  { pos: 'L', hl: HL.board, text: 'TAP THE TICKET ON THE BOARD TO FETCH THE CAR.', until: () => !tutGuest(TUT.g1) },
  { pos: 'mid', hl: HL.money, text: 'DELIVERED - AND THEY TIPPED! FASTER SERVICE = BIGGER TIPS.' },
  { pos: 'L', hl: HL.laneC, text: 'NOW A TRICKY ONE. THIS GUEST\'S CAR IS BOXED IN ON ROW C...', enter: tutSetupBlocked, until: () => { const g = tutGuest(TUT.bg); return !g || g.ticket; } },
  { pos: 'L', hl: HL.board, text: 'D1 = ONE CAR IN THE WAY. TAP THE TICKET: THE VALET MOVES THE BLOCKER TO A TEMP SLOT (T1-T4), GRABS THE CAR, THEN RE-PARKS THE BLOCKER.',
    until: () => !tutGuest(TUT.bg) && !S.jobs.length && !S.valet.job && S.temps.every(t => t.car === null) },
  { pos: 'mid', hl: HL.money, text: 'YOUR SCORE = MONEY EARNED (PAY + TIPS). WHALES - THE EXOTIC CARS - TIP HUGE. SERVE ONE FAST AND YOU MIGHT HIT A $500 JACKPOT.' },
  { pos: 'mid', hl: HL.heat, text: 'THIS BAR IS THE MANAGER\'S TEMPER. GUESTS WHO WAIT GET ANGRY: ... THEN !! THEN @#$%. ANGRY GUESTS COMPLAIN AND FILL THE BAR. AT 100, YOU\'RE FIRED.' },
  { pos: 'mid', hl: HL.cards, text: 'HAPPY WHALES COOL THE MANAGER DOWN AND EARN STARS. 2 STARS = A POWER-UP CARD UP HERE. HIGH HEAT LOCKS CARD SLOTS.' },
  { pos: 'mid', crew: true, hl: [2, 124, 28, 44], text: 'SWAMPED? HIRE A VALET FOR $100 PER HOUR (UP TO 3). TAP A VALET TO MAKE HIM ACTIVE - YOUR NEXT JOBS GO TO HIM. WITH HIM ACTIVE, THIS PANEL SENDS HIM HOME.' },
  { pos: 'mid', text: 'THAT\'S THE JOB! FROM 10 PM YOU CAN CLOCK OUT - OR KEEP GOING FOR A HIGH SCORE. GOOD LUCK, KID.', last: true },
];
function tutSetupBlocked() {
  const lane = 2; const put = (tier, mi, idx) => { const g = makeGuest(tier, mi); placeInStall(S.cars.get(g.carId), lane, idx); g.state = 'inside'; g.stay = 1e9; return g; };
  put('beater', 0, 2); put('standard', 2, 4); const g = put('premium', 0, 3); g.stay = 1.5; TUT.bg = g.id;
}
function startTutorial() { newRun(); S.tutorial = true; Object.assign(TUT, { on: true, i: 0, t: 0, hotelDrop: 1, valetDrop: 1, showValet: true, g1: null, limo: null, bg: null }); UI.screen = 'game'; UI.paused = false; Sound.startMusic(); tutEnter(); }
function tutEnter() { TUT.t = 0; const st = TUT_STEPS[TUT.i]; if (st.enter) st.enter(); }
function tutNext() { const st = TUT_STEPS[TUT.i]; if (st.last) return tutFinish(); TUT.i++; Sound.sfx('click'); tutEnter(); }
function tutFinish() { TUT.on = false; SAVE.tutorialSeen = true; writeSave(); startGame(); }
function tutUpdate(dt) {
  TUT.t += dt; if (TUT.hotelDrop < 1) { TUT.hotelDrop = Math.min(1, TUT.hotelDrop + dt * 0.9); if (TUT.hotelDrop === 1) { S.shake = 0.25; Sound.sfx('honk', 0.5); } }
  if (TUT.valetDrop < 1) TUT.valetDrop = Math.min(1, TUT.valetDrop + dt * 1.6);
  const st = TUT_STEPS[TUT.i]; if (st.until && TUT.t > 0.4 && st.until()) { Sound.sfx('star'); tutNext(); }
}
// Pointer hook: returns true if the tutorial consumed the tap.
function tutTap(x, y) {
  if (!TUT.on) return false;
  if (x >= 290 && y >= 12 && y < 22) { tutFinish(); return true; } // SKIP
  const st = TUT_STEPS[TUT.i]; if (!st.until) { if (TUT.t > 0.5) tutNext(); return true; }
  return false; // action step: let the tap reach the game
}
const tutValetVisible = () => !TUT.on || TUT.showValet;
const tutValetOffset = () => (TUT.on ? -(1 - easeBounce(TUT.valetDrop)) * 40 : 0);
function tutWorldFx() { // hotel drop-in: cover the facade and redraw it falling with a bounce
  if (!TUT.on || TUT.hotelDrop >= 1) return; const off = -(1 - easeBounce(TUT.hotelDrop)) * 48;
  R(0, 10, 320, 28, PAL.night); ctx.drawImage(BG, 0, 10, 320, 28, 0, 10 + off, 320, 28);
}
function tutPanelRect(pos) { return pos === 'R' ? [221, 92, 98, 78] : pos === 'L' ? [4, 128, 214, 42] : [50, 84, 220, 44]; }
function tutRender() {
  if (!TUT.on) return; const st = TUT_STEPS[TUT.i];
  const hl = typeof st.hl === 'function' ? st.hl() : st.hl;
  if (hl) { const p = Math.floor(UI.t * 4) % 2 ? PAL.yellow : PAL.orange; RB(hl[0] - 1, hl[1] - 1, hl[2] + 2, hl[3] + 2, p); RB(hl[0] - 2, hl[1] - 2, hl[2] + 4, hl[3] + 4, PAL.ink); }
  const [x, y, w, h] = tutPanelRect(st.pos); R(x, y, w, h, PAL.ink); RB(x, y, w, h, PAL.yellow); RB(x + 1, y + 1, w - 2, h - 2, PAL.plum);
  drawText(ctx, 'STEP ' + (TUT.i + 1) + '/' + TUT_STEPS.length, x + 4, y + 3, PAL.lav);
  wrapText(st.text, Math.floor((w - 8) / 4)).forEach((l, i) => drawText(ctx, l, x + 4, y + 11 + i * 7, PAL.white));
  if (!st.until && TUT.t > 0.5 && Math.floor(UI.t * 2.5) % 2) drawText(ctx, st.last ? 'TAP TO START YOUR SHIFT >' : 'TAP TO CONTINUE >', x + w - 4, y + h - 8, PAL.yellow, { align: 'right' });
  if (st.until) drawText(ctx, 'YOUR TURN', x + w - 4, y + 3, PAL.lime, { align: 'right' });
  R(290, 12, 28, 10, PAL.ink); RB(290, 12, 28, 10, PAL.lgrey); drawText(ctx, 'SKIP', 304, 15, PAL.lgrey, { align: 'center' });
}
