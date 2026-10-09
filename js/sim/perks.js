'use strict';
/* Reading skill perks during a shift. S.perks is a plain snapshot made at newRun (see data/skills.js for keys);
   nothing here touches the career save. Every helper returns the neutral value when a perk is absent. */
const perk = (key, none = 1) => (S.perks && S.perks[key] !== undefined ? S.perks[key] : none);
// Patience multiplier for a guest tier (Smooth Talker, Whale Charmer).
const perkPatience = tier => perk('patience') * (isWhale(tier) ? perk('whalePatience') : 1);
// Second Wind: a valet's first job in each wave runs faster. Called once when a job really starts.
function claimSecondWind(w, j) {
  const boost = perk('secondWind');
  if (boost === 1 || !w || S.tutorial) return;
  const wave = S.phaseI;
  const ph = curPhase();
  if (!ph || ph.kind !== 'wave' || w.windWave === wave) return;
  w.windWave = wave;
  j.windMult = boost;
}
const jobWind = j => (j && j.windMult) || 1;
// Silver Tongue: the first N comps of the shift are free.
const freeCompLeft = () => (S.comps.free || 0) < perk('freeComps', 0);
const compPrice = id => (freeCompLeft() ? 0 : COMPS[id].cost);
// Good Hire: a helper's hourly wage after the skill discount.
const helperWage = m => Math.max(0, memberWage(m) - perk('helperDiscount', 0));
