'use strict';
/* RESERVED power-up: hold the outermost stall of one row end empty for a whale, for CONFIG.power.reservedSec.
   While held, that row end is closed to other cars (L.res[idx] = VIP_HOLD). A whale parked into it is always
   depth 0 - nothing can ever block it in. Park/move jobs flagged vip:true target the hold instead of entryIndex. */
const VIP_HOLD = 'VIP'; // i18n-ignore: lot marker id

function holdVipStall() {
  if (S.vipHold) return (toast(t('toast.vipAlreadyHeld')), false);
  // the open row end with the longest free run costs the least capacity
  let best = null;
  for (let l = 0; l < NL; l++)
    for (const side of LOT_SIDES) {
      const run = freeRun(l, side);
      if (run > 0 && pendingParks(l, side) === 0 && (!best || run > best.run)) best = { lane: l, side, run };
    }
  if (!best) return (toast(t('toast.noRowEnd')), false);
  const idx = best.side === 'west' ? 0 : NS - 1;
  S.lanes[best.lane].res[idx] = VIP_HOLD;
  S.vipHold = { lane: best.lane, side: best.side, idx, t: CONFIG.power.reservedSec };
  floater(t('float.vipSpotHeld'), stallX(idx), laneY(best.lane) - 8, PAL.pink);
  return true;
}
const vipHoldTarget = () => (S.vipHold ? { idx: S.vipHold.idx, depth: 0 } : null);
const vipHoldFree = () => !!S.vipHold && !S.jobs.some(j => j.vip);
// The whale's car is moving in: the hold has done its job.
function takeVipHold() {
  const h = S.vipHold;
  if (!h) return;
  if (S.lanes[h.lane].res[h.idx] === VIP_HOLD) S.lanes[h.lane].res[h.idx] = null;
  S.vipHold = null;
}
function updateVipHold(dt) {
  const h = S.vipHold;
  if (!h || S.jobs.some(j => j.vip)) return; // a whale is on the way: keep it
  h.t -= dt;
  if (h.t <= 0) {
    takeVipHold();
    toast(t('toast.vipReleased'));
  }
}
// Extra stall choice offered when a whale's car is selected (ui/selection.js).
function vipStallOption(car, g, sel) {
  if (!vipHoldFree() || !g || !isWhale(g.tier)) return null;
  const h = S.vipHold;
  const job = {
    type: car.loc.t === 'temp' ? 'move' : 'park',
    carId: car.id,
    lane: h.lane,
    side: h.side,
    bags: sel.bags,
    vip: true,
  };
  return { lane: h.lane, side: h.side, idx: h.idx, depth: 0, vip: true, est: estimateFor(job), job };
}
