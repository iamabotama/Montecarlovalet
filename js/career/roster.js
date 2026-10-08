'use strict';
/* Persistent crew. Hired valets are named regulars stored in SAVE.roster = [{ id, name, jobs }].
   They level up from jobs completed (CONFIG.helpers.roster.levelJobs): faster, but higher wages.
   sim/crew.js asks this module who comes in next and what they cost; it never edits SAVE itself. */
const RC = CONFIG.helpers.roster;

const memberLevel = m => RC.levelJobs.reduce((lv, need, i) => (m.jobs >= need ? i : lv), 0);
const memberSpeed = m => CONFIG.helpers.speed * (1 + RC.speedPerLevel * memberLevel(m));
const memberWage = m => CONFIG.helpers.costPerHour + RC.wagePerLevel * memberLevel(m);
const memberById = id => SAVE.roster.find(m => m.id === id) || null;

// The regular who would answer the next hire call: an off-shift regular, or a new (not yet saved) recruit.
// Side-effect free, so the crew panel can preview the name and wage.
function rosterCandidate(onShiftIds) {
  const free = SAVE.roster.find(m => !onShiftIds.includes(m.id));
  if (free) return free;
  const used = SAVE.roster.map(m => m.name);
  const name = RC.names.find(n => !used.includes(n)) || t('crew.fallbackName', { n: SAVE.roster.length + 2 });
  return { id: 'v' + (SAVE.roster.length + 1), name, jobs: 0 };
}
// Hiring makes a recruit a permanent regular.
function rosterEnlist(m) {
  if (!memberById(m.id)) SAVE.roster.push(m);
  return m;
}
// crewJobs: { memberId: jobsDoneThisShift }
function rosterBankShift(crewJobs) {
  for (const [id, n] of Object.entries(crewJobs || {})) {
    const m = memberById(id);
    if (m) m.jobs += n;
  }
}
