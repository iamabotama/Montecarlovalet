'use strict';
/* Level 3: rows open on the WEST end only (deep single stacks), snow slows driving. */
defineHotel({
  id: 'swiss_chalet',
  name: 'CHALET ST. MORITZ',
  city: 'SWISS ALPS',
  blurb: ['ROWS OPEN AT ONE END ONLY.', 'DEEP STACKS. SNOW SLOWS THE CARS.'],
  unlockRank: 2,
  product: 'hotel_pack_1',
  lot: { lanes: 6, stallsPerLane: 5, openSides: ['west'], tempSlots: { west: 2, east: 2 } },
  map: { lotX: 46, lotY: 81 },
  pad: null,
  event: { name: 'APRES-SKI', short: 'APRES' },
  arrivals: { intervalMult: 1.1, mixMult: [0.6, 1, 1.3, 1.2, 1.2, 0.8] },
  mods: { tipMult: 1.15, driveMult: 0.85 },
  theme: {
    facade: PAL.brown,
    trim: PAL.rust,
    pillar: PAL.khaki,
    sign: PAL.white,
    signOff: PAL.lgrey,
    awning: [PAL.green, PAL.white],
    ground: [PAL.white, PAL.lgrey],
    fountain: false,
    decor: 'pines',
    weather: 'snow',
  },
});
