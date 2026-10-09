'use strict';
/* Comps for upset whales: rules only (no drawing). Data: data/comps.js. Menu + visuals: ui/comp_menu.js.
   Tapping an upset whale/ultra opens the comp menu instead of fetching; the menu also offers
   "Get car" so nothing is lost. Calm guests and everyone else behave exactly as before. */
function newCompsState() {
  return { used: {}, menu: null, hinted: false, free: 0 }; // free: comps given free by Silver Tongue
}
const compEligible = g => !!g && isWhale(g.tier) && WAITING.has(g.state) && g.stage >= COMPS.minStage;
const compUsed = id => !!S.comps.used[id];
const compAffordable = id => S.money >= compPrice(id);
const compsLeft = () => COMPS.order.some(id => !compUsed(id));

// Called first thing when a guest is tapped (sim/commands.js). True = the tap opened the menu.
function compTapGuest(g) {
  if (S.tutorial || !compEligible(g) || !compsLeft()) return false;
  S.comps.menu = { guestId: g.id };
  Sound.sfx('click');
  return true;
}

function applyComp(id, g) {
  const C = COMPS[id];
  if (!compEligible(g) || compUsed(id)) return false;
  if (!compAffordable(id)) {
    toast(t('toast.compCantAfford'));
    Sound.sfx('deny');
    return false;
  }
  const price = compPrice(id);
  if (!price) S.comps.free++;
  S.money -= price;
  S.comps.used[id] = true;
  S.comps.menu = null;
  if (C.refill) g.wait = Math.max(0, g.wait - C.refill * g.patience);
  if (C.refill === 1) g.over = 0;
  if (C.freezeSec) g.ignoreT = Math.max(g.ignoreT || 0, C.freezeSec);
  if (C.forgiveHeat) {
    S.heat = Math.max(0, S.heat - C.forgiveHeat);
    floater(t('comp.heatForgiven', { n: C.forgiveHeat }), g.x + 3, g.y - 6, PAL.lime);
  }
  g.stage = stageOf(g);
  g.line = '';
  g.comp = { id, t: 0, dur: C.freezeSec || COMPS.fxSec }; // drives the visuals in ui/comp_menu.js
  S.stats.comps = (S.stats.comps || 0) + 1;
  Sound.sfx('coin');
  return true;
}

function updateComps(dt) {
  const m = S.comps.menu;
  if (m && !compEligible(S.guests.get(m.guestId))) S.comps.menu = null; // car arrived / guest left
  for (const g of S.guests.values()) if (g.comp && (g.comp.t += dt) > g.comp.dur + COMPS.walkSec) g.comp = null;
  if (!S.comps.hinted && !S.tutorial && compsLeft())
    for (const g of S.guests.values())
      if (compEligible(g)) {
        S.comps.hinted = true; // once per shift: teach the player that upset whales can be comped
        S.banners.push({ text: t('comp.hint'), sub: t('comp.hintSub'), t: 4 });
        break;
      }
}
