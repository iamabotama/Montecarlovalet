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
// Models: [name, shape, body, dark, light]. Names are made-up brands: the same in every language.
const MODELS = {
  beater: [
    ['Rustbucket Hatch', 'hatch', PAL.khaki, PAL.dgrey, PAL.peach],
    ['Hondo Civvy', 'civvy', PAL.lav, PAL.mauve, PAL.lgrey],
    ['Soccer-Mom Van', 'van', PAL.olive, PAL.dgrey, PAL.khaki],
  ],
  standard: [
    ['Toyoda Camree', 'sedan', PAL.lgrey, PAL.dgrey, PAL.white],
    ['Ford Fussion', 'sedan', PAL.blue, PAL.royal, PAL.white],
    ['Subaroo', 'wagon', PAL.green, PAL.teal, PAL.emer],
  ],
  premium: [
    ['Audee A8', 'lux', PAL.lav, PAL.mauve, PAL.lgrey],
    ['Bimmer 7', 'lux', PAL.white, PAL.lgrey, PAL.white],
    ['Merc S', 'lux', PAL.asph3, PAL.asph, PAL.lgrey],
    ['Lexxus', 'lux', PAL.brown, PAL.rust, PAL.peach],
  ],
  whale: [
    ['Ferruccio', 'sport', PAL.red, PAL.crimson, PAL.pink],
    ['Lamborgotti', 'wedge', PAL.yellow, PAL.orange, PAL.cream],
    ['Porsch 911', 'sport', PAL.lime, PAL.emer, PAL.leaf],
    ['McLarren', 'wedge', PAL.orange, PAL.tang, PAL.yellow],
  ],
  ultra: [
    ['Rolls-Roiz Phantasm', 'gt', PAL.asph2, PAL.ink, PAL.lgrey],
    ['Bentlee', 'gt', PAL.green, PAL.teal, PAL.emer],
    ['Bugatto', 'gt', PAL.blue, PAL.royal, PAL.white],
  ],
  limo: [
    ['Stretch Limo', 'limo', PAL.white, PAL.lgrey, PAL.white],
    ['Stretch Limo', 'limo', PAL.asph, PAL.ink, PAL.asph3],
  ],
};
