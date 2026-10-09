'use strict';
/* SECRET hotel (easter egg): hidden until you meet POTUS on a helipad and he walks into your hotel
   (events/vip_heli.js sets SAVE.secrets.potus). Plays like a level above Dubai: gold everything,
   the richest crowd, three VIP helicopters a night, the biggest tips. */
defineHotel({
  id: 'trump_towers',
  name: tl('hotel.trump_towers.name'),
  city: tl('hotel.trump_towers.city'),
  blurb: [tl('hotel.trump_towers.blurb1'), tl('hotel.trump_towers.blurb2')],
  secret: 'potus', // only listed (and playable) once SAVE.secrets.potus is set
  lot: { lanes: 4, stallsPerLane: 7, openSides: ['west', 'east'], tempSlots: { west: 1, east: 1 } },
  map: { lotX: 46, lotY: 81 },
  pad: { x: 196, y: 150 },
  helo: {
    times: [
      ['dinner', 0.3, 0.7],
      ['high', 0.3, 0.7],
      ['after', 0.2, 0.6],
    ],
  },
  event: { name: tl('hotel.trump_towers.event'), short: tl('hotel.trump_towers.eventShort') },
  starTarget: 1500,
  arrivals: { intervalMult: 0.95, mixMult: [0.2, 0.5, 1.1, 2.2, 2.6, 1.4] },
  mods: { tipMult: 1.5 },
  theme: {
    facade: PAL.yellow,
    trim: PAL.orange,
    pillar: PAL.cream,
    sign: PAL.navy,
    signOff: PAL.ink,
    awning: [PAL.ink, PAL.yellow],
    ground: [PAL.cream, PAL.yellow],
    fountain: true,
    decor: 'palms',
    weather: null,
  },
});
