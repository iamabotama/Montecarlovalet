'use strict';
/* Level 3: rows open on the WEST end only (deep single stacks), snow slows driving. */
defineHotel({
  id: 'swiss_chalet',
  name: tl('hotel.swiss_chalet.name'),
  city: tl('hotel.swiss_chalet.city'),
  blurb: [tl('hotel.swiss_chalet.blurb1'), tl('hotel.swiss_chalet.blurb2')],
  unlockRank: 4,
  product: 'premium',
  lot: { lanes: 6, stallsPerLane: 5, openSides: ['west'], tempSlots: { west: 1, east: 1 } },
  map: { lotX: 46, lotY: 81 },
  pad: null,
  event: { name: tl('hotel.swiss_chalet.event'), short: tl('hotel.swiss_chalet.eventShort') },
  starTarget: 700,
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
