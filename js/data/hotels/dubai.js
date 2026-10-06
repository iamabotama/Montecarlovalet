'use strict';
/* Level 4: small lot, the richest crowd, three VIP helicopters a night. */
defineHotel({
  id: 'dubai',
  name: 'DUBAI TOWER',
  city: 'DUBAI',
  blurb: ['SMALL LOT, SUPERCARS EVERYWHERE.', 'THREE VIP HELICOPTERS A NIGHT.'],
  unlockRank: 3,
  product: 'hotel_pack_1',
  lot: { lanes: 4, stallsPerLane: 7, openSides: ['west', 'east'], tempSlots: { west: 2, east: 2 } },
  map: { lotX: 46, lotY: 81 },
  pad: { x: 196, y: 150 },
  helo: {
    times: [
      [240, 300],
      [460, 520],
      [660, 720],
    ],
  },
  event: { name: 'THE ROYAL WEDDING', short: 'ROYAL' },
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
