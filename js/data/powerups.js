'use strict';
/* Power-up card definitions (display + targeting). Tuning lives in CONFIG.power. */

const POWER_INFO = {
  pawnOff: { short: 'P', name: 'PAWN OFF', color: PAL.lime, target: 'curbNonWhale' },
  directAway: { short: 'D', name: 'DIRECT AWAY', color: PAL.blue, target: 'curbStdPrem' },
  ignore: { short: 'I', name: 'IGNORE', color: PAL.lav, target: 'guest' },
  bags: { short: 'B', name: 'BAGS & CART', color: PAL.orange, target: 'curbWhale' },
  hustle: { short: 'H', name: 'HUSTLE', color: PAL.yellow, target: 'self' },
  reserved: { short: 'R', name: 'RESERVED', color: PAL.pink, target: 'none' },
  spareKeys: { short: 'K', name: 'SPARE KEYS', color: PAL.peach, target: 'self' },
  bribe: { short: '$', name: 'BRIBE', color: PAL.cream, target: 'curbLimo' },
  fakeSmile: { short: 'S', name: 'FAKE SMILE', color: PAL.salmon || PAL.pink, target: 'guest' },
  coffee: { short: 'C', name: 'COFFEE', color: PAL.brown, target: 'self' },
};
