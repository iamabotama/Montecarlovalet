'use strict';
/* Level 2: bigger lot, a faster and flashier crowd, no helipad. */
defineHotel({
  id: 'las_vegas',
  name: tl('hotel.las_vegas.name'),
  city: tl('hotel.las_vegas.city'),
  blurb: [tl('hotel.las_vegas.blurb1'), tl('hotel.las_vegas.blurb2')],
  unlockRank: 1,
  lot: { lanes: 6, stallsPerLane: 7, openSides: ['west', 'east'], tempSlots: { west: 1, east: 1 } },
  map: { lotX: 46, lotY: 81 },
  pad: null,
  event: { name: tl('hotel.las_vegas.event'), short: tl('hotel.las_vegas.eventShort') },
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
