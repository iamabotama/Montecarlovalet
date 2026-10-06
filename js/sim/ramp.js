'use strict';
/* Learning curve: early-shift overrides for arrivals, patience and pickups. */

function rampRow() {
  const R = CONFIG.ramp;
  if (!R || !R.enabled || S.tutorial || S.t >= R.endSec) return null;
  let row = null;
  for (const r of R.steps) if (S.t >= r.fromSec) row = r;
  return row;
}
const patienceMult = () => {
  const r = rampRow();
  return r ? r.patienceMult : 1;
};
function dropPatience(tier) {
  const T = CONFIG.tiers[tier];
  if (tier === 'limo') return T.greetPatience * patienceMult();
  const tb = T.dropPatienceByHour;
  if (!tb) return T.dropPatience * patienceMult();
  const h = hourNow();
  const [h0, p0] = tb[0],
    [h1, p1] = tb[tb.length - 1];
  return lerp(p0, p1, clamp((h - h0) / (h1 - h0), 0, 1)) * patienceMult();
}
const PICK_ACTIVE = new Set(['pickWalk', 'handTicket', 'toSpot', 'pickWait']);
function pickupsActive() {
  let n = 0;
  for (const g of S.guests.values()) if (PICK_ACTIVE.has(g.state)) n++;
  return n;
}
