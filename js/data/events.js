'use strict';
/* Fun events: on/off switches, odds and tuning. One block per event (js/events/<name>.js).
   Set enabled: false to switch an event off; nothing else needs to change. */
const EVENT_CONFIG = {
  cooldownSec: 60, // quiet time after an event before another may start (only one runs at a time)
  drunkDriver: {
    enabled: true,
    chance: 1 / 12, // per whale/ultra pickup (x the wave's eventMult: 3 at the after party)
    hicEverySec: 2.2, // warning sign: hiccups while he waits
    cabHeatRelief: 5, // tapping him calls a cab instead (car stays overnight)
    waitRate: 0.6, // everyone's patience drains at 60% while the scene is active
    driverHelpSec: 45, // walk the driver inside before this, or heat
    callCopsSec: 30, // call the cops at the podium before this, or heat (someone else calls)
    ignoreDriverHeat: 8,
    ignoreCopsHeat: 4,
    phoneSec: 1.5,
    copsDelaySec: 6, // call -> cop car arrives
    towDelaySec: 18, // cops on scene -> tow truck arrives
    hookSec: 3,
    bonus: 200, // both tasks done by you
    bonusHeatRelief: 10,
  },
  vipHeli: {
    enabled: true,
    chance: 1 / 3, // per helicopter landing (only when no other event is running)
    weights: { royal: 45, celeb: 35, potus: 20 },
    royalTitles: 4, // event.vip.royal1..4
    royal: { tip: 2000, suvX: [252, 276], waitSec: 25 }, // motorcade waits on the road, right side blocked
    celeb: { tip: 1500, paparazziSec: 20 },
    potus: { tip: 1000 },
    force: null, // debug: the next landing is this kind
  },
  snowmobiles: {
    enabled: true, // Swiss Alps only (snow hotels): passive, never blocks other events
    share: 0.3, // of everyday arrivals ride up on a snowmobile
    tiers: ['beater', 'standard', 'premium'],
    speedMult: 1.8, // drives this much faster than a car (quicker park and fetch)
    trailSec: 2.5, // snow puffs fade over this long
  },
  blizzard: {
    enabled: true, // Swiss Alps only
    chance: 1 / 90, // per second during waves (x the wave's eventMult)
    durationSec: 35,
    rampSec: 4, // snow thickens and eases over this long
    walkMult: 0.7, // everyone walks slower
    waitMult: 0.6, // guests are more forgiving (patience drains slower)
  },
  secretAgent: {
    enabled: true, // Monte Carlo only
    chance: 1 / 900, // per second during waves (x the wave's eventMult); or tap the fountain
    taps: 7, // fountain taps...
    tapWindowSec: 6, // ...within this long
    parkSec: 40, // from his arrival: park the GT before this or the henchman makes his move
    tip: 700,
    sedanX: 40, // where the henchman sedan idles on the street
    ejectPxSec: 25, // ejector seat launch speed (plus a gentle acceleration)
  },
  joyride: {
    enabled: true,
    chance: 1 / 15, // per whale/ultra park by a HIRED valet (x the wave's eventMult)
    spinSec: 1.1, // burnout at the curb
    awaySec: 30, // gone this long
    flyAlt: 40, // px above the road as he flies back in
    flySec: 2.2,
    landX: 70, // touchdown x on the road (west half)
    skidSec: 0.9,
    shoutSec: 2.5, // the big joy-ride shout over the car
    pingEverySec: 0.22, // chiptune tyre squeal while he tears off
  },
};
