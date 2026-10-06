'use strict';
/* Hotel (level) registry. A hotel is pure data: one file per hotel calls defineHotel({...}).
   Nothing outside this folder hard-codes a hotel. Fields (all optional except id/name):
     id, name (facade sign), city, blurb[]           identity + hotel-select text
     unlockRank                                      career rank index needed to play it
     product                                         store product id that also unlocks it (see data/products.js)
     lot:  { lanes, stallsPerLane, openSides, tempSlots:{west,east} }   merged over CONFIG.lot
     map:  { lotX, lotY }                            merged over CONFIG.map
     pad:  { x, y } | null                           helipad position (null = no helipad)
     helo: { times: [[minSec, maxSec], ...] }        one VIP landing per entry (needs a pad)
     event:{ name, short }                           the nightly rush (CONFIG.gala timing)
     arrivals: { intervalMult, mixMult[6] }          busier / richer crowds (mix order = TIERS)
     mods: { tipMult, driveMult }                    economy + handling
     starTarget                                      $ for the 3rd star (see career/progression.js shiftStars)
     theme: see render/background.js (colours, decor, weather) */
const HOTELS = {};
const HOTEL_ORDER = [];
const HOTEL_DEFAULTS = {
  unlockRank: 0,
  product: null,
  starTarget: 600,
  blurb: [],
  pad: null,
  helo: null,
  event: { name: 'THE GALA', short: 'GALA' },
  arrivals: { intervalMult: 1, mixMult: [1, 1, 1, 1, 1, 1] },
  mods: { tipMult: 1, driveMult: 1 },
};
function defineHotel(h) {
  const full = {
    ...HOTEL_DEFAULTS,
    ...h,
    arrivals: { ...HOTEL_DEFAULTS.arrivals, ...h.arrivals },
    mods: { ...HOTEL_DEFAULTS.mods, ...h.mods },
  };
  HOTELS[h.id] = full;
  HOTEL_ORDER.push(h.id);
  return full;
}
const hotelById = id => HOTELS[id] || HOTELS[HOTEL_ORDER[0]];
