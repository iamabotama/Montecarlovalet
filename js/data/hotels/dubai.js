'use strict';
/* Level 4: small lot, the richest crowd, three VIP helicopters a night. */
defineHotel({
  id: 'dubai',
  name: tl('hotel.dubai.name'),
  city: tl('hotel.dubai.city'),
  blurb: [tl('hotel.dubai.blurb1'), tl('hotel.dubai.blurb2')],
  unlockRank: 3,
  product: 'hotel_pack_1',
  lot: { lanes: 4, stallsPerLane: 7, openSides: ['west', 'east'], tempSlots: { west: 1, east: 1 } },
  map: { lotX: 46, lotY: 81 },
  pad: { x: 196, y: 150 },
  helo: {
    times: [
      ['dinner', 0.3, 0.7],
      ['high', 0.3, 0.7],
      ['after', 0.2, 0.6], // the after party
    ],
  },
  event: { name: tl('hotel.dubai.event'), short: tl('hotel.dubai.eventShort') },
  starTarget: 1000,
  arrivals: { intervalMult: 1, mixMult: [0.3, 0.6, 1.2, 2, 2.2, 1.2] },
  mods: { tipMult: 1.25 },
  theme: {
    facade: PAL.royal,
    trim: PAL.navy,
    pillar: PAL.blue,
    sign: PAL.cream,
    signOff: PAL.orange,
    awning: [PAL.white, PAL.yellow],
    ground: [PAL.cream, PAL.khaki],
    fountain: true,
    decor: 'palms',
    weather: null,
  },
});
