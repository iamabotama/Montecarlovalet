'use strict';
/* Power-up card definitions (display + targeting). Tuning lives in CONFIG.power. */

const POWER_INFO = {
  pawnOff: { short: 'P', name: tl('power.pawnOff'), color: PAL.lime, target: 'curbNonWhale' },
  directAway: { short: 'D', name: tl('power.directAway'), color: PAL.blue, target: 'curbStdPrem' },
  ignore: { short: 'I', name: tl('power.ignore'), color: PAL.lav, target: 'guest' },
  bags: { short: 'B', name: tl('power.bags'), color: PAL.orange, target: 'curbWhale' },
  hustle: { short: 'H', name: tl('power.hustle'), color: PAL.yellow, target: 'self' },
  reserved: { short: 'R', name: tl('power.reserved'), color: PAL.pink, target: 'self' }, // sim/reserved.js
  spareKeys: { short: 'K', name: tl('power.spareKeys'), color: PAL.peach, target: 'self' },
  bribe: { short: '$', name: tl('power.bribe'), color: PAL.cream, target: 'curbLimo' },
  fakeSmile: { short: 'S', name: tl('power.fakeSmile'), color: PAL.salmon || PAL.pink, target: 'guest' },
  coffee: { short: 'C', name: tl('power.coffee'), color: PAL.brown, target: 'self' },
};
