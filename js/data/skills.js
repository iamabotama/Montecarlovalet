'use strict';
/* Skill tree data. One skill point per promotion (career/skills.js); within a branch, tier n needs tier n-1.
   `perks` is what the skill gives during a shift. career/skills.js merges the owned skills' perks into S.perks
   at the start of a shift; the sim only reads S.perks via perk() (sim/perks.js). Each perk key:
     walk          valet walking speed multiplier
     handle        bags/greet steps speed multiplier
     secondWind    each valet's first job of every wave moves this much faster
     patience      all guests' patience multiplier (1/0.9 = drain 10% slower)
     whalePatience extra patience multiplier for whales and ultras
     freeComps     comps per shift that cost nothing
     helperDiscount $ off each helper's hourly wage
     heatCool      multiplier on every heat reduction
     lotSense      highlight the fastest stall when choosing where to park
   Text: i18n skill.<id>, skill.<id>.desc, skills.branch.<branch>. */
const SKILL_BRANCHES = ['footwork', 'charm', 'management'];
const SKILLS = [
  { id: 'quickFeet', branch: 'footwork', tier: 1, icon: 'boot', perks: { walk: 1.1 } },
  { id: 'fastHands', branch: 'footwork', tier: 2, icon: 'hand', perks: { handle: 1.25 } },
  { id: 'secondWind', branch: 'footwork', tier: 3, icon: 'wind', perks: { secondWind: 1.3 } },
  { id: 'smoothTalker', branch: 'charm', tier: 1, icon: 'talk', perks: { patience: 1 / 0.9 } },
  { id: 'whaleCharmer', branch: 'charm', tier: 2, icon: 'whale', perks: { whalePatience: 1 / 0.8 } },
  { id: 'silverTongue', branch: 'charm', tier: 3, icon: 'cup', perks: { freeComps: 1 } },
  { id: 'goodHire', branch: 'management', tier: 1, icon: 'coin', perks: { helperDiscount: 20 } },
  { id: 'managersPet', branch: 'management', tier: 2, icon: 'thumb', perks: { heatCool: 1.15 } },
  { id: 'lotSense', branch: 'management', tier: 3, icon: 'eye', perks: { lotSense: 1 } },
];
const skillById = id => SKILLS.find(s => s.id === id);
