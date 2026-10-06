'use strict';
/* Level 1: the original. Balanced lot, open at both ends, one VIP helicopter. */
defineHotel({
  id: 'monte_carlo',
  name: 'HOTEL MONTE CARLO',
  city: 'MONTE CARLO',
  blurb: ['THE RIVIERA CLASSIC.', 'BOTH ROW ENDS OPEN, ONE VIP HELICOPTER.'],
  unlockRank: 0,
  lot: { lanes: 6, stallsPerLane: 6, openSides: ['west', 'east'], tempSlots: { west: 2, east: 2 } },
  map: { lotX: 46, lotY: 81 },
  pad: { x: 190, y: 148 },
  helo: { times: [[330, 420]] },
  event: { name: 'THE GALA', short: 'GALA' },
  starTarget: 600,
  theme: {
    facade: PAL.plum,
    trim: PAL.wine,
    pillar: PAL.mauve,
    sign: PAL.pink,
    signOff: PAL.plum,
    awning: [PAL.red, PAL.white],
    ground: [PAL.green, PAL.teal],
    fountain: true,
    decor: 'palms',
    weather: null,
  },
});
