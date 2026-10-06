'use strict';
/* Vehicle tiers and car models (name, legacy shape, colours). */

const TIERS = ['beater', 'standard', 'premium', 'whale', 'ultra', 'limo'];
const isWhale = t => t === 'whale' || t === 'ultra';
// Board letter + colour per tier (retrieve board, vehicle guide).
const TIER_MARK = {
  beater: ['B', PAL.khaki],
  standard: ['S', PAL.blue],
  premium: ['P', PAL.lav],
  whale: ['W', PAL.pink],
  ultra: ['U', PAL.yellow],
  limo: ['L', PAL.white],
};
/* ------------------------------ SPRITES ------------------------------ */
// Cars face EAST (front = right). Legend: k tire, b body, d body-dark, l body-light, w glass,
// h headlight, t taillight, r rust, g chrome/grey, c stripe (white)
const SHAPES = {
  hatch: [
    '.kk.....kk...',
    'llllllllllll.',
    'tbwwbbrbbwbbh',
    'dbwwbbbbbwbbd',
    'tbwwbrbbbwbbh',
    'dddddddddddd.',
    '.kk.....kk...',
  ],
  civvy: [
    '.kk.....kk...',
    'llllllllllll.',
    'tbwbrbbbbwwbh',
    'dbwbbbbrbwwbd',
    'tbwbbbrbbwwbh',
    'dddddddddddd.',
    '.kk.....kk...',
  ],
  van: [
    '.kk.....kk...',
    'llllllllllll.',
    'tbbbbrbbbbwwh',
    'dbbbbbbbbbwwd',
    'tbbrbbbbbbwwh',
    'dddddddddddd.',
    '.kk.....kk...',
  ],
  sedan: [
    '..kk......kk..',
    '.llllllllllll.',
    'tbbwbbbbbwwbbh',
    'dbbwbbbbbwwbbd',
    'tbbwbbbbbwwbbh',
    '.dddddddddddd.',
    '..kk......kk..',
  ],
  wagon: [
    '..kk......kk..',
    '.llllllllllll.',
    'tbwbbbbbbbwwbh',
    'dbwbbbbbbbwwbd',
    'tbwbbbbbbbwwbh',
    '.dddddddddddd.',
    '..kk......kk..',
  ],
  lux: [
    '..kk.......kk..',
    '.lllllllllllll.',
    'tbbbwbbbbbwwbbh',
    'dbbbwbbbbbwwbbg',
    'tbbbwbbbbbwwbbh',
    '.ddddddddddddd.',
    '..kk.......kk..',
  ],
  sport: [
    '.kk........kk..',
    'lllllllllllllll',
    'tbbbbbwwwbbbbbh',
    'cccccwwwwwccccc',
    'tbbbbbwwwbbbbbh',
    'ddddddddddddddd',
    '.kk........kk..',
  ],
  wedge: [
    '.kk........kk..',
    'lllllllllllllll',
    'tbbbbwwwbbbbbbh',
    'ccccwwwwcccccch',
    'tbbbbwwwbbbbbbh',
    'ddddddddddddddd',
    '.kk........kk..',
  ],
  gt: [
    '..kk........kk..',
    '.llllllllllllll.',
    'tggwwbbbbbbbbbbh',
    'dggwwbbbbbbbbbgg',
    'tggwwbbbbbbbbbbh',
    '.dddddddddddddd.',
    '..kk........kk..',
  ],
  limo: [
    '..kk...............kk...',
    '.llllllllllllllllllllll.',
    'tbbwwbwwbwwbwwbbbbwwbbbh',
    'dbbwwbwwbwwbwwbbbbwwbbbd',
    'tbbwwbwwbwwbwwbbbbwwbbbh',
    '.dddddddddddddddddddddd.',
    '..kk...............kk...',
  ],
};
// Models: [name, shape, body, dark, light]
const MODELS = {
  beater: [
    ['RUSTBUCKET HATCH', 'hatch', PAL.khaki, PAL.dgrey, PAL.peach],
    ['HONDO CIVVY', 'civvy', PAL.lav, PAL.mauve, PAL.lgrey],
    ['SOCCER-MOM VAN', 'van', PAL.olive, PAL.dgrey, PAL.khaki],
  ],
  standard: [
    ['TOYODA CAMREE', 'sedan', PAL.lgrey, PAL.dgrey, PAL.white],
    ['FORD FUSSION', 'sedan', PAL.blue, PAL.royal, PAL.white],
    ['SUBAROO', 'wagon', PAL.green, PAL.teal, PAL.emer],
  ],
  premium: [
    ['AUDEE A8', 'lux', PAL.lav, PAL.mauve, PAL.lgrey],
    ['BIMMER 7', 'lux', PAL.white, PAL.lgrey, PAL.white],
    ['MERC S', 'lux', PAL.asph3, PAL.asph, PAL.lgrey],
    ['LEXXUS', 'lux', PAL.brown, PAL.rust, PAL.peach],
  ],
  whale: [
    ['FERRUCCIO', 'sport', PAL.red, PAL.crimson, PAL.pink],
    ['LAMBORGOTTI', 'wedge', PAL.yellow, PAL.orange, PAL.cream],
    ['PORSCH 911', 'sport', PAL.lime, PAL.emer, PAL.leaf],
    ['MCLARREN', 'wedge', PAL.orange, PAL.tang, PAL.yellow],
  ],
  ultra: [
    ['ROLLS-ROIZ PHANTASM', 'gt', PAL.asph2, PAL.ink, PAL.lgrey],
    ['BENTLEE', 'gt', PAL.green, PAL.teal, PAL.emer],
    ['BUGATTO', 'gt', PAL.blue, PAL.royal, PAL.white],
  ],
  limo: [
    ['STRETCH LIMO', 'limo', PAL.white, PAL.lgrey, PAL.white],
    ['STRETCH LIMO', 'limo', PAL.asph, PAL.ink, PAL.asph3],
  ],
};
