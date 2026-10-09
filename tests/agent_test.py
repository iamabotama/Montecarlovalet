"""Secret agent easter egg (js/events/secret_agent.js), Monte Carlo only.
A: 7 fountain taps start it; the GT is named and drawn; parking it in time pays the tip; sedan leaves.
B: too slow -> henchman walks to the GT, ejector seat launches him off screen; event ends; no tip."""
import sys
from harness import Game, run
FAILS = []
def check(ok, what, info=''):
    print(('OK  ' if ok else 'FAIL') + ' ' + what, info)
    if not ok:
        FAILS.append(what)
QUIET = ('() => { MCV.DEBUG.scale = 4; for (const k of ["drunkDriver", "vipHeli", "joyride"]) '
         'EVENT_CONFIG[k].enabled = false; EVENT_CONFIG.secretAgent.chance = 0; MCV.S.events.cooldown = 0; }')
async def main():
    async with Game() as g:
        await g.start('swiss_chalet')
        check(not await g.js('() => eventOn("secretAgent")'), 'not at the Swiss chalet')
    async with Game() as g:
        await g.start('monte_carlo')
        await g.js(QUIET)
        await g.run(500)
        for _ in range(7):
            await g.tap(161, 61)
            await g.run(80)
        ev = await g.js('() => MCV.S.events.active && { id: MCV.S.events.active.id, car: MCV.S.events.active.carId }')
        check(ev and ev['id'] == 'secretAgent', '7 fountain taps start the agent', ev)
        name = await g.js('id => carName(MCV.S.cars.get(id))', ev['car'])
        check(name == 'Aston Marten DB-0', 'GT has its name', name)
        await g.run(2500)
        await g.shot('agent_arrive')
        m0 = await g.js('() => MCV.S.money')
        await g.bot(4)
        res = None
        for _ in range(80):
            res = await g.js('id => ({ a: MCV.S.events.active && MCV.S.events.active.stage, m: MCV.S.money, loc: MCV.S.cars.get(id) && MCV.S.cars.get(id).loc.t, t: MCV.S.events.active && Math.round(MCV.S.events.active.t) })', ev['car'])
            if res['a'] in ('leave', None):
                break
            await g.run(250)
        check(res['m'] - m0 >= 700, 'parked in time pays the $700 tip', res['m'] - m0)
        await g.shot('agent_success')
        errs = getattr(g, 'errors', [])
        check(not errs, 'no page errors (A)', errs[:3])
    async with Game() as g:
        await g.start('monte_carlo')
        await g.js(QUIET)
        await g.js('() => agentStart(true)')
        seen = set(); shot = False
        for _ in range(160):
            st = await g.js('() => MCV.S.events.active && MCV.S.events.active.id === "secretAgent" ? MCV.S.events.active.stage : null')
            seen.add(st)
            if st == 'eject' and not shot:
                await g.run(250)
                await g.shot('agent_eject'); shot = True
            if st is None and 'eject' in seen:
                break
            await g.run(250)
        check({'sneak', 'eject'} <= seen, 'henchman sneaks in and gets ejected', sorted(map(str, seen)))
        check(st is None, 'event ends after the ejection', st)
        errs = getattr(g, 'errors', [])
        check(not errs, 'no page errors (B)', errs[:3])
    print('PASS' if not FAILS else 'FAILED: ' + ', '.join(FAILS))
    sys.exit(1 if FAILS else 0)
run(main())
