"""Characters on the sidewalk never overlap: sample a busy shift and measure the drawn gap between neighbours."""
import sys
from harness import Game, run

PARK_ALL = """() => { for (const x of MCV.S.guests.values())
  if (x.state === 'curbDrop' && x.tier !== 'limo' && !MCV.S.jobs.some(j => j.carId === x.carId))
    for (let l = 0; l < NL; l++) for (const s of LOT_SIDES)
      if (entryIndex(l, s, pendingParks(l, s)) && enqueue({ type: 'park', carId: x.carId, lane: l, side: s })) return; }"""
# min drawn gap between sprite left edges among people in the sidewalk band (5px sprite width => >= 5 means no overlap)
# standing = not walking: curb guests, podium/ticket line, waiting guests, idle valets. These must never overlap.
MIN_GAP = """() => { const STAND = new Set(['curbDrop', 'handTicket', 'pickWait', 'greeting']);
  const standing = p => (p.ref.state ? STAND.has(p.ref.state) : p.ref.walking === false);
  const m = crowdMembers().filter(p => p.ref && p.y >= CROWD.band[0] && p.y <= CROWD.band[1])
    .map(p => ({ x: p.x + crowdOff(p.ref), st: standing(p) })).sort((a, b) => a.x - b.x);
  let all = 99, st = 99;
  for (let i = 1; i < m.length; i++) { const d = m[i].x - m[i - 1].x; all = Math.min(all, d); if (m[i].st && m[i - 1].st) st = Math.min(st, d); }
  return [m.length, all, st]; }"""


async def main():
    async with Game() as g:
        await g.start('monte_carlo')
        await g.js("() => { MCV.S.t = phaseStart(4); for (let i = 0; i < 10; i++) spawnArrival(['standard','premium','whale','beater','limo'][i % 5]); }")
        samples, bad, worst, passing = 0, 0, 99, 0
        for step in range(40):
            await g.js(PARK_ALL)
            if step == 15:
                await g.js("() => { for (const x of MCV.S.guests.values()) if (x.state === 'inside') x.stay = 0; }")
            await g.run(500)
            n, gap_all, gap_st = await g.js(MIN_GAP)
            if n >= 2:
                samples += 1
                worst = min(worst, gap_st)
                bad += gap_st < 5
                passing += gap_all < 5
            if step in (12, 22, 32):
                await g.shot(f'crowd_{step}')
        print({'samples': samples, 'standing_overlaps': bad, 'worst_standing_gap_px': round(worst, 2), 'walker_passing_moments': passing})
        ok = samples > 20 and bad == 0 and not g.errors
        print('OK' if ok else 'FAIL', 'errors', g.errors[:3])
    sys.exit(0 if ok else 1)


run(main())
