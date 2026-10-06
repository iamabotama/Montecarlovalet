'use strict';
/* Level 2: bigger lot, a faster and flashier crowd, no helipad. */
defineHotel({
  id: 'las_vegas',
  name: 'THE HIGH ROLLER',
  city: 'LAS VEGAS',
  blurb: ['BIGGEST LOT, BUSIEST CROWD.', 'MORE LIMOS. NO HELIPAD.'],
  unlockRank: 1,
  lot: { lanes: 6, stallsPerLane: 7, openSides: ['west', 'east'], tempSlots: { west: 2, east: 2 } },
  map: { lotX: 46, lotY: 81 },
  pad: null,
  event: { name: 'FIGHT NIGHT', short: 'FIGHT' },
  starTarget: 800,
  arrivals: { intervalMult: 0.85, mixMult: [1, 1.2, 1.2, 1, 1, 1.6] },
  mods: { tipMult: 1.1 },
  theme: {
    facade: PAL.navy,
    trim: PAL.royal,
    pillar: PAL.yellow,
    sign: PAL.yellow,
    signOff: PAL.orange,
    awning: [PAL.red, PAL.yellow],
    ground: [PAL.khaki, PAL.brown],
    fountain: true,
    decor: 'palms',
    weather: null,
  },
});
