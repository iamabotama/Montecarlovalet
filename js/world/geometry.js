'use strict';
/* Lot geometry for the ACTIVE hotel: lanes, stalls, open sides, temp slots, helipad.
   These are module-level `let`s that every system reads directly (they are hot-path values).
   They are only ever written by setGeometry(), which app/flow.js loadHotel() calls before a shift.

   Lane layout (one row of stalls, indices 0..NS-1, west -> east):
     both ends open:  [ west stack 0..HALF-1 | east stack HALF..NS-1 ]   cars enter from each end
     west end only:   [ west stack 0..NS-1 ]                              one deep stack            */
const SPD = CONFIG.speed;
const LANE_NAMES = 'ABCDEFGHIJ';
const SIDES = ['west', 'east'];
const SPOTS = [84, 236, 68, 252, 52, 268, 36, 284, 20, 300]; // pickup waiting spots along the curb

let HOTEL = null; // the active hotel definition (data/hotels/*)
let MAP, LOT, NL, NS, SW, SH, HALF, LOT_R, LOT_B;
let LOT_SIDES = SIDES; // the row ends cars can enter from
let TEMPS = [];
let PAD = null,
  PAD_MEET = null; // helipad (null when the hotel has none)

function setGeometry(hotel) {
  HOTEL = hotel;
  MAP = { ...CONFIG.map, ...hotel.map };
  LOT = { ...CONFIG.lot, ...hotel.lot, tempSlots: { ...CONFIG.lot.tempSlots, ...hotel.lot.tempSlots } };
  NL = LOT.lanes;
  NS = LOT.stallsPerLane;
  [SW, SH] = LOT.stallPx;
  LOT_SIDES = SIDES.filter(s => (LOT.openSides || SIDES).includes(s));
  HALF = LOT_SIDES.length === 2 ? Math.ceil(NS / 2) : LOT_SIDES[0] === 'west' ? NS : 0;
  LOT_R = MAP.lotX + NS * SW;
  LOT_B = MAP.lotY + NL * SH;
  TEMPS = [];
  let n = 1;
  for (const side of SIDES)
    for (let k = 0; k < LOT.tempSlots[side]; k++)
      TEMPS.push({ x: side === 'west' ? MAP.lotX - 30 : LOT_R + 30, y: MAP.lotY + 11 + k * 18, side, name: 'T' + n++ });
  PAD = hotel.pad ? { ...hotel.pad } : null;
  PAD_MEET = PAD ? [PAD.x - 15, PAD.y] : null;
  setPremiumGeometry();
}

const laneY = i => MAP.lotY + i * SH + Math.floor(SH / 2);
const stallX = j => MAP.lotX + j * SW + SW / 2;
const aisleX = side => (side === 'west' ? MAP.lotX - 8 : LOT_R + 8);
const sideOpen = side => LOT_SIDES.includes(side);
const sideSize = side => (side === 'west' ? HALF : NS - HALF); // stalls reachable from that end
const sideOfIdx = idx => (idx < HALF ? 'west' : 'east');
