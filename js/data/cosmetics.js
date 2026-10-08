'use strict';
/* Valet cosmetics. Purely visual. Unlocked by rank (CONFIG.career.ranks[].unlock 'uniform:<id>' / 'nametag:<id>'). */
const UNIFORMS = {
  red: { name: tl('uniform.red'), shirt: PAL.red, hat: PAL.red },
  blue: { name: tl('uniform.blue'), shirt: PAL.royal, hat: PAL.royal },
  black: { name: tl('uniform.black'), shirt: PAL.asph, hat: PAL.ink },
  gloves: { name: tl('uniform.gloves'), shirt: PAL.ink, hat: PAL.ink, hands: PAL.white },
  gold: { name: tl('uniform.gold'), shirt: PAL.yellow, hat: PAL.orange }, // supporter product
};
const NAMETAGS = {
  none: { name: tl('nametag.none'), color: null },
  gold: { name: tl('nametag.gold'), color: PAL.yellow },
};
const DEFAULT_COSMETIC = { uniform: 'red', nametag: 'none' };
