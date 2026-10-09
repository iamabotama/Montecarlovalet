'use strict';
/* Awards (the Career screen's medal wall). Pure data: each award is judged once, right after a shift is banked
   (career/awards.js), and kept by the character forever.
     tier    1 bronze / 2 silver / 3 gold - sets the medal colour and the XP it pays (AWARD_XP)
     icon    an ICONS name (art/sprites.js) drawn on the medal
     secret  true = shown as "?" until earned (easter eggs)
     check(L, r, c)  L = lifetime sums (character.life), r = the shift just played
                     ({ complete, stars, money, st }), c = the character
   Display text: i18n keys award.<id> (name) and award.<id>.desc (how to earn it).
   Lifetime sums come from the shift's own stats, so a new award rarely needs any new hook. Event awards read
   L.marks.<key>: every event start counts under its id, and events can add their own with eventMark(key). */
const AWARD_XP = { 1: 100, 2: 250, 3: 500 };
const AWARDS = [
  { id: 'firstShift', tier: 1, icon: 'key', check: L => L.shifts >= 1 },
  { id: 'fullNight', tier: 1, icon: 'moon', check: (L, r) => r.complete },
  { id: 'threeStars', tier: 2, icon: 'star', check: (L, r) => r.stars >= 3 },
  { id: 'calmNight', tier: 3, icon: 'thumb', check: (L, r) => r.complete && !r.st.angry },
  { id: 'parked100', tier: 1, icon: 'car', check: L => L.carsParked >= 100 },
  { id: 'parked1000', tier: 3, icon: 'car', check: L => L.carsParked >= 1000 },
  { id: 'whales25', tier: 2, icon: 'whale', check: L => L.whalesServed >= 25 },
  { id: 'bigTip', tier: 2, icon: 'coin', check: (L, r) => r.st.biggestTip >= 500 },
  { id: 'tips10k', tier: 3, icon: 'coin', check: L => L.tips >= 10000 },
  { id: 'limos10', tier: 1, icon: 'cup', check: L => L.limos >= 10 },
  { id: 'helis10', tier: 2, icon: 'heli', check: L => L.heliMet >= 10 },
  { id: 'drunkHero', tier: 2, icon: 'phone', check: L => L.drunkHandled >= 3 },
  { id: 'streak3', tier: 1, icon: 'flame', check: (L, r, c) => c.streak.best >= 3 },
  { id: 'streak7', tier: 3, icon: 'flame', check: (L, r, c) => c.streak.best >= 7 },
  { id: 'globetrotter', tier: 2, icon: 'globe', check: (L, r, c) => regularHotels().every(h => c.hotels[h.id]) },
  {
    id: 'allStars',
    tier: 3,
    icon: 'star',
    check: (L, r, c) => regularHotels().every(h => (c.hotels[h.id] || {}).stars >= 3),
  },
  { id: 'joyride', tier: 1, icon: 'wheel', secret: true, check: L => L.marks.joyride >= 1 },
  { id: 'agent', tier: 2, icon: 'bow', secret: true, check: L => L.marks.agentParked >= 1 },
  { id: 'ejector', tier: 1, icon: 'bow', secret: true, check: L => L.marks.agentEject >= 1 },
  { id: 'potus', tier: 3, icon: 'crown', secret: true, check: () => !!SAVE.secrets.potus },
];
const awardById = id => AWARDS.find(a => a.id === id);
