'use strict';
/* Skills screen (from the Career screen): three branches of three skills, learned top to bottom.
   Tap a skill to see it, Learn spends a point, Reset refunds all points for free.
   Rules live in career/skills.js; skill data in data/skills.js. */
const SKILL_COL = { x: 8, w: 96, gap: 8 };
const SKILL_ROW = { y: 44, h: 20, gap: 6 };
const skillRect = s => ({
  x: SKILL_COL.x + SKILL_BRANCHES.indexOf(s.branch) * (SKILL_COL.w + SKILL_COL.gap),
  y: SKILL_ROW.y + (s.tier - 1) * (SKILL_ROW.h + SKILL_ROW.gap),
  w: SKILL_COL.w,
  h: SKILL_ROW.h,
});
const selSkill = () => SKILLS[UI.skillSel] || SKILLS[0];
defineScreen('skills', {
  enter() {
    UI.skillSel = 0;
  },
  buttons() {
    const s = selSkill();
    const can = !skillBlock(s.id);
    return [
      ...SKILLS.map((k, i) => ({ ...skillRect(k), hidden: true, fn: () => (UI.skillSel = i) })),
      button(8, 162, 96, t('btn.back'), () => goScreen('career'), PAL.lgrey),
      button(112, 162, 96, t('btn.reset'), () => skillsOwned() && (resetSkills(), Sound.sfx('deny')), PAL.lgrey),
      button(
        216,
        162,
        96,
        t('btn.learn'),
        () => can && learnSkill(s.id) && Sound.sfx('coin'),
        can ? PAL.yellow : PAL.dgrey,
      ),
    ];
  },
  render() {
    R(0, 0, 320, 180, PAL.night);
    drawText(ctx, t('skills.title'), 160, 4, PAL.yellow, { align: 'center', scale: 2 });
    const pts = skillPoints();
    drawText(ctx, t('skills.points', { n: pts }), 8, 22, pts ? PAL.lime : PAL.lgrey);
    drawText(ctx, t('skills.perPromo'), 312, 22, PAL.dgrey, { align: 'right', maxW: 150 });
    SKILL_BRANCHES.forEach((b, i) => {
      const x = SKILL_COL.x + i * (SKILL_COL.w + SKILL_COL.gap);
      drawText(ctx, t('skills.branch.' + b), x + SKILL_COL.w / 2, 34, PAL.white, {
        align: 'center',
        maxW: SKILL_COL.w,
      });
    });
    SKILLS.forEach((s, i) => renderSkillNode(s, i === UI.skillSel));
    renderSkillDetail(selSkill(), 8, 124);
    drawButtons(this.buttons());
  },
});
function renderSkillNode(s, selected) {
  const r = skillRect(s);
  const block = skillBlock(s.id);
  const col = block === 'owned' ? PAL.lime : block ? PAL.dgrey : Math.floor(UI.t * 3) % 2 ? PAL.yellow : PAL.orange;
  if (s.tier > 1) R(r.x + r.w / 2, r.y - SKILL_ROW.gap, 1, SKILL_ROW.gap, block === 'owned' ? PAL.lime : PAL.dgrey);
  R(r.x, r.y, r.w, r.h, PAL.ink);
  RB(r.x, r.y, r.w, r.h, selected ? PAL.white : col);
  drawIcon(ctx, s.icon, r.x + 4, r.y + 4, col);
  drawText(ctx, t('skill.' + s.id), r.x + 12, r.y + 4, block === 'owned' ? PAL.white : PAL.lgrey, { maxW: r.w - 14 });
  const tag = block === 'needsPrev' ? 'locked' : block || 'learnable'; // short form; the detail line says why
  drawText(ctx, t('skills.' + tag), r.x + 12, r.y + 12, col, { maxW: r.w - 14 });
}
function renderSkillDetail(s, x, y) {
  drawText(ctx, t('skill.' + s.id), x, y, PAL.yellow, { maxW: 304 });
  wrapText(t('skill.' + s.id + '.desc'), 304)
    .slice(0, 2)
    .forEach((l, i) => drawText(ctx, l, x, y + 10 + i * 8, PAL.white));
  const block = skillBlock(s.id);
  drawText(
    ctx,
    t('skills.' + (block || 'learnable')),
    x,
    y + 28,
    block === 'owned' ? PAL.lime : block ? PAL.lgrey : PAL.yellow,
  );
}
