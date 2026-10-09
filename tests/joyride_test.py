"""Joyride (js/events/joyride.js): a hired valet takes a whale car for a spin, flies back, and parks it."""
import sys
from harness import Game, run

FAILS = []


def check(ok, what, info=''):
    print(('OK  ' if ok else 'FAIL') + ' ' + what, info)
    if not ok:
        FAILS.append(what)


STATE = '''() => { const a = MCV.S.events.active; const c = a && MCV.S.cars.get(a.carId);
  const h = MCV.S.helpers[0]; return { stage: a && a.id === 'joyride' ? a.stage : null, car: a && a.carId,
  loc: c && c.loc.t, away: h && !!h.away, heat: MCV.S.heat }; }'''


async def wait_stage(g, stage, ms=20000):
    for _ in range(ms // 100):
        s = await g.js(STATE)
        if s['stage'] == stage:
            return s
        await g.run(100)
    return await g.js(STATE)


async def main():
    async with Game() as g:
        await g.start('monte_carlo')
        await g.js("() => { MCV.S.t = phaseTime('dinner', 0.1); EVENT_CONFIG.joyride.awaySec = 4; }")
        await g.js('() => jrDebugRide()')
        s = await wait_stage(g, 'spin')
        check(s['stage'] == 'spin' and s['away'] and s['loc'] == 'away' and s['heat'] == 0, 'helper parks the whale -> joyride starts (no heat)', s)
        ghost = await g.js('id => MCV.S.cars.get(id).loc.t !== "curb" && !Object.values(MCV.S.curb).some(c => c.car === id)', s['car'])
        check(ghost, 'no ghost car left at the curb')
        car = s['car']
        await g.run(500)
        await g.shot('joy_spin')
        s = await wait_stage(g, 'gone')
        check(s['stage'] == 'gone', 'tears off the east end of the road', s)
        # the owner comes out for his car while it is away
        h0 = await g.js('id => { const c = MCV.S.cars.get(id); const gg = MCV.S.guests.get(c.guestId); gg.state = "pickWait"; gg.wait = 0; return MCV.S.heat; }', car)
        await g.run(600)
        r = await g.js('id => { const c = MCV.S.cars.get(id); const gg = MCV.S.guests.get(c.guestId); return { heat: MCV.S.heat, wait: gg.wait }; }', car)
        check(r['heat'] <= h0 and r['wait'] < 0.8, 'owner never knows: no heat, normal patience', {'before': h0, **r})
        await g.js('id => { const c = MCV.S.cars.get(id); MCV.S.guests.get(c.guestId).state = "inside"; }', car)
        s = await wait_stage(g, 'fly')
        await g.run(1200)
        await g.shot('joy_fly')
        check(s['stage'] == 'fly', 'flies back in from the west', s)
        s = await wait_stage(g, 'skid')
        await g.run(300)
        await g.shot('joy_skid')
        check(s['stage'] == 'skid', 'hard landing, sloppy 180', s)
        for _ in range(200):
            s = await g.js('id => ({ ev: !!MCV.S.events.active, loc: MCV.S.cars.get(id).loc.t, away: !!MCV.S.helpers[0].away })', car)
            if s['loc'] == 'stall':
                break
            await g.run(100)
        check(not s['ev'] and s['loc'] == 'stall' and not s['away'], 'drives it to its stall; helper back on duty', s)
        check(not g.errors, 'no page errors', g.errors[:3])
    print('FAILED' if FAILS else 'PASS')
    sys.exit(1 if FAILS else 0)


if __name__ == '__main__':
    run(main())
