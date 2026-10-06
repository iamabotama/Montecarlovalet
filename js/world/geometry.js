'use strict';
/* Lot geometry derived from the active hotel: lanes, stalls, temps, helipad. */

/* ------------------------------ GEOMETRY ------------------------------ */
const MAP = CONFIG.map,
  LOT = CONFIG.lot,
  SPD = CONFIG.speed;
const NL = LOT.lanes,
  NS = LOT.stallsPerLane,
  SW = LOT.stallPx[0],
  SH = LOT.stallPx[1];
const HALF = Math.ceil(NS / 2);
const LOT_R = MAP.lotX + NS * SW,
  LOT_B = MAP.lotY + NL * SH;
const laneY = i => MAP.lotY + i * SH + Math.floor(SH / 2);
const stallX = j => MAP.lotX + j * SW + SW / 2;
const aisleX = side => (side === 'west' ? MAP.lotX - 8 : LOT_R + 8);
const LANE_NAMES = 'ABCDEFGHIJ';
const TEMPS = [];
(function () {
  let n = 1;
  for (let k = 0; k < LOT.tempSlots.west; k++)
    TEMPS.push({ x: MAP.lotX - 30, y: MAP.lotY + 11 + k * 18, side: 'west', name: 'T' + n++ });
  for (let k = 0; k < LOT.tempSlots.east; k++)
    TEMPS.push({ x: LOT_R + 30, y: MAP.lotY + 11 + k * 18, side: 'east', name: 'T' + n++ });
})();
const PAD = CONFIG.helo.pad,
  PAD_MEET = [PAD.x - 15, PAD.y];
const SPOTS = [84, 236, 68, 252, 52, 268, 36, 284, 20, 300];
