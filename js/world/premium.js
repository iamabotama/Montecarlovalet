'use strict';
/* Premium stalls: single stalls on the paved pads beside the entrance drive, the quickest spots on the property.
   P1 unlocks with career rank (unlock key 'stall:premium1'); P2 is a premium perk ('stall:premium2', free for
   everyone while the store is off). This file owns their positions, run state and routing link; the rest of
   the game only sees the location {t:'prem', i}. Positions: CONFIG.map.premium (a hotel's map may override). */
let PREMS = []; // [{x, y, name, mouth}] for the active hotel; set by setGeometry()
function setPremiumGeometry() {
  PREMS = (MAP.premium || []).map(([x, y], i) => ({
    x,
    y,
    name: 'P' + (i + 1),
    mouth: x < MAP.standX ? MAP.mouthL : MAP.mouthR, // the drive entrance the pad hangs off
  }));
}
// Run state for newRun(): which stalls this player may use, and what is in them.
function newPremState() {
  const keys = unlockKeys();
  return PREMS.map((p, i) => ({
    car: null,
    open: i === 0 ? keys.has('stall:premium1') : premiumFeature('stall:premium2'),
  }));
}
const premOpen = i => !!(S.prem[i] && S.prem[i].open && !S.tutorial);
// Routing: each pad joins the drive entrance road (between curb and street).
function linkPremiumStalls() {
  for (const p of PREMS) {
    chainNodes([
      [p.mouth, MAP.curbY],
      [p.mouth, p.y],
      [p.mouth, MAP.streetY],
    ]);
    chainNodes([
      [p.mouth, p.y],
      [p.x, p.y],
    ]);
  }
}
// Free = usable, empty, and no other live park/move job is heading for it.
function premFree(i, exceptJob) {
  return (
    premOpen(i) &&
    S.prem[i].car === null &&
    !S.jobs.some(j => j !== exceptJob && !j.aborted && !j.carMoved && j.prem === i)
  );
}
function placeInPrem(car, i) {
  S.prem[i].car = car.id;
  car.loc = { t: 'prem', i };
  car.x = PREMS[i].x;
  car.y = PREMS[i].y;
  car.dir = PREMS[i].x < MAP.standX ? 2 : 0;
}
