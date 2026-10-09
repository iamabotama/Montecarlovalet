'use strict';
/* Guest patience (scaled by the current phase, sim/waves.js) and the pickup counter. */
function dropPatience(tier) {
  const T = CONFIG.tiers[tier];
  if (tier === 'limo') return T.greetPatience * patienceMult() * perkPatience(tier);
  const tb = T.dropPatienceByHour;
  if (!tb) return T.dropPatience * patienceMult() * perkPatience(tier);
  const h = hourNow();
  const [h0, p0] = tb[0],
    [h1, p1] = tb[tb.length - 1];
  return lerp(p0, p1, clamp((h - h0) / (h1 - h0), 0, 1)) * patienceMult() * perkPatience(tier);
}
const PICK_ACTIVE = new Set(['pickWalk', 'handTicket', 'toSpot', 'pickWait']);
function pickupsActive() {
  let n = 0;
  for (const g of S.guests.values()) if (PICK_ACTIVE.has(g.state)) n++;
  return n;
}
