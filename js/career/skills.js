'use strict';
/* Skill points and owned skills for a character (data in data/skills.js).
   Points: one per promotion (rank), minus skills owned. Reset is free and refunds everything.
   The shift never reads this file's state directly: startGame() passes skillPerks() into newRun(). */
const ownsSkill = (id, c = activeChar()) => !!c.skills[id];
const skillsOwned = (c = activeChar()) => SKILLS.filter(s => c.skills[s.id]).length;
const skillPoints = (c = activeChar()) => Math.max(0, c.rank - skillsOwned(c));
// Why a skill can't be learned right now ('' = it can).
function skillBlock(id, c = activeChar()) {
  const s = skillById(id);
  if (ownsSkill(id, c)) return 'owned';
  const prev = SKILLS.find(o => o.branch === s.branch && o.tier === s.tier - 1);
  if (prev && !ownsSkill(prev.id, c)) return 'needsPrev';
  if (!skillPoints(c)) return 'noPoints';
  return '';
}
function learnSkill(id, c = activeChar()) {
  if (skillBlock(id, c)) return false;
  c.skills[id] = true;
  writeSave();
  return true;
}
function resetSkills(c = activeChar()) {
  c.skills = {};
  writeSave();
}
// The merged perks of every owned skill, for one shift.
function skillPerks(c = activeChar()) {
  const perks = {};
  for (const s of SKILLS) if (c.skills[s.id]) Object.assign(perks, s.perks);
  return perks;
}
