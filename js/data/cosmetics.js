'use strict';
/* Valet cosmetics. Purely visual. Unlocked by rank (CONFIG.career.ranks[].unlock 'uniform:<id>' / 'nametag:<id>'). */
const UNIFORMS = {
  red: { name: 'CLASSIC RED', shirt: PAL.red, hat: PAL.red },
  blue: { name: 'RIVIERA BLUE', shirt: PAL.royal, hat: PAL.royal },
  black: { name: 'BLACK TIE', shirt: PAL.asph, hat: PAL.ink },
  gloves: { name: 'WHITE GLOVES', shirt: PAL.ink, hat: PAL.ink, hands: PAL.white },
  gold: { name: 'SUPPORTER GOLD', shirt: PAL.yellow, hat: PAL.orange }, // supporter product
};
const NAMETAGS = {
  none: { name: 'NO NAME TAG', color: null },
  gold: { name: 'GOLD NAME TAG', color: PAL.yellow },
};
const DEFAULT_COSMETIC = { uniform: 'red', nametag: 'none' };
