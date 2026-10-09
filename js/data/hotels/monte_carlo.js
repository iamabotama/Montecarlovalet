'use strict';
/* Level 1: the original. Balanced lot, open at both ends, one VIP helicopter. */
defineHotel({
  id: 'monte_carlo',
  name: tl('hotel.monte_carlo.name'),
  city: tl('hotel.monte_carlo.city'),
  blurb: [tl('hotel.monte_carlo.blurb1'), tl('hotel.monte_carlo.blurb2')],
  unlockRank: 0,
  lot: { lanes: 6, stallsPerLane: 6, openSides: ['west', 'east'], tempSlots: { west: 1, east: 1 } },
  map: { lotX: 46, lotY: 81 },
  pad: { x: 190, y: 148 },
  helo: {
    times: [
      ['dinner', 0.3, 0.7],
      ['high', 0.3, 0.7],
    ],
  }, // two VIP landings: Dinner Rush, High Rollers
  event: { name: tl('hotel.monte_carlo.event'), short: tl('hotel.monte_carlo.eventShort') },
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
