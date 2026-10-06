'use strict';
/* Sidewalk crowd layout (presentation only - the simulation never sees it).
   Everyone drawn in the sidewalk band (guests, valets on foot, the helicopter VIP, NPCs) is spaced so
   sprites never overlap, and nobody stands inside a fixed prop such as the podium. Each entity keeps a
   smoothed visual offset (_co), so people "step aside" instead of jumping. Draw code and tap targets
   read crowdOff(entity). */
const CROWD = {
  air: 2, // px between neighbours
  band: [24, 46], // drawn top-y range treated as one row (hotel sidewalk + valet stand)
  ease: 90, // max offset change, px per second (fast enough to step aside before a walker arrives)
  passes: 40, // relaxation sweeps; lines pushed against a fixed prop need several
};
const crowdOff = e => (e && e._co) || 0;

// people: [{ ref, k, x, y, w?, fixed? }]
//   x = sprite left edge from the sim, y = drawn top, w = drawn width (default 5: a person),
//   k = stable sort key, fixed = a prop that never moves (others are pushed off it).
function layoutCrowd(people, dt) {
  const row = people.filter(p => p.y >= CROWD.band[0] && p.y <= CROWD.band[1]);
  for (const p of people) if (!row.includes(p) && p.ref) p.ref._co = 0;
  row.sort((a, b) => a.x - b.x || a.k - b.k);
  const lx = row.map(p => p.x),
    w = row.map(p => p.w || 5);
  for (let n = 0; n < CROWD.passes; n++)
    for (let i = 1; i < lx.length; i++) {
      const d = lx[i - 1] + w[i - 1] + CROWD.air - lx[i];
      if (d <= 0) continue;
      const a = row[i - 1].fixed,
        b = row[i].fixed;
      if (a && b) continue;
      const left = a ? 0 : b ? d : d / 2;
      lx[i - 1] -= left;
      lx[i] += d - left;
    }
  row.forEach((p, i) => {
    if (p.fixed) return;
    const want = lx[i] - p.x,
      cur = p.ref._co || 0;
    p.ref._co = cur + clamp(want - cur, -CROWD.ease * dt, CROWD.ease * dt);
  });
}
