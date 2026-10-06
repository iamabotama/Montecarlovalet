'use strict';
/* Money: earning pay/tips and the whale jackpot. */

function jackpot(g, tip) {
  const J = CONFIG.tips.jackpot;
  if (!isWhale(g.tier) || g.wait > J.maxWaitFrac * g.patience || Math.random() >= J.chance) return tip;
  S.banners.push({ text: 'JACKPOT! $' + J.amount + ' TIP!', t: 2.5 });
  Sound.sfx('gala');
  S.shake = 0.2;
  return J.amount;
}
function earn(amt, kind, g) {
  S.money += amt;
  S.stats[kind === 'tip' ? 'tips' : 'pay'] += amt;
  if (kind === 'tip') {
    S.stats.biggestTip = Math.max(S.stats.biggestTip, amt);
    floater('+$' + amt, g.x + 2, g.y - 4, PAL.yellow);
    Sound.sfx(amt >= 40 ? 'bigcoin' : 'coin');
  }
}
// Hotel tip multiplier for ordinary tips (fixed amounts like the jackpot and VIP tip are not scaled).
const hotelTip = amt => Math.round(amt * HOTEL.mods.tipMult);
