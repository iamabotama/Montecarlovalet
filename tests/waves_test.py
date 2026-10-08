"""A full night: waves -> breaks -> last call -> shift complete. Heat is pinned at 0 so this checks the
structure of the night (sim/waves.js), not the autopilot's skill."""
import sys
from harness import Game, run

# Records phase changes, arrivals per phase and banners, sampling every 100ms of real time.
PROBE = '''() => { window._w = { phases: [], spawns: {}, banners: [] }; const W = window._w; let last = -2;
  const orig = window.spawnArrival; window.spawnArrival = function (t) { const i = phaseIndexAt(MCV.S.t);
    W.spawns[i] = (W.spawns[i] || 0) + 1; return orig(t); };
  setInterval(() => { const S = MCV.S; if (!S) return; S.heat = 0;
    if (S.phaseI !== last) { last = S.phaseI; W.phases.push([S.phaseI, Math.round(S.t)]); }
    const b = S.banners[0]; if (b && W.banners[W.banners.length - 1] !== String(b.text)) W.banners.push(String(b.text)); }, 100); }'''


def check(name, ok, detail=''):
    print(('OK   ' if ok else 'FAIL ') + name, detail)
    return ok


async def main():
    ok = True
    async with Game() as g:
        await g.start('monte_carlo')
        await g.js(PROBE)
        await g.bot(speed=12)
        info = await g.js('() => ({ n: PHASES().length, kinds: PHASES().map(p => p.kind), len: shiftLengthSec(), end: shiftEndHour() })')
        ok &= check('night ends at midnight', info['end'] == 24, info)
        # clock-out button is offered only on breaks after wave 2
        offered = []
        for _ in range(140):
            await g.run(500)
            st = await g.js('() => ({ t: MCV.S.t, i: MCV.S.phaseI, can: canClockOut(), phase: MCV.S.phase, scr: UI.screen })')
            if st['can']:
                offered.append(st['i'])
            if st['scr'] != 'game':
                break
        W = await g.js('() => window._w')
        seen = [p[0] for p in W['phases']]
        ok &= check('visited every phase in order', seen == list(range(info['n'])), seen)
        breaks = [i for i, k in enumerate(info['kinds']) if k != 'wave']
        ok &= check('no arrivals on breaks / last call', all(int(k) not in breaks for k in W['spawns']), W['spawns'])
        ok &= check('every wave had arrivals', all(str(i) in W['spawns'] or i in W['spawns'] for i, k in enumerate(info['kinds']) if k == 'wave'))
        ok &= check('clock-out only on breaks after wave 2', bool(offered) and set(offered) <= {3, 5}, sorted(set(offered)))
        ok &= check('wave banners queued', sum(b.startswith('Wave ') for b in W['banners']) == 4, W['banners'])
        await g.shot('waves_summary')
        res = await g.js('() => RESULT && { kind: RESULT.kind, complete: RESULT.complete, stars: RESULT.stars, waves: RESULT.st.wavesCleared, pay: RESULT.st.pay, events: RESULT.st.eventsSurvived }')
        ok &= check('shift completed', bool(res) and res['complete'] and res['kind'] == 'clockout', res)
        ok &= check('4 waves cleared, event survived', res and res['waves'] == 4 and res['events'] == 1)
        ok &= check('completion bonus paid', res and res['pay'] >= 150)
        ok &= check('2+ stars for completing', res and res['stars'] >= 2)
        ok &= check('no page errors', not g.errors, g.errors[:3])
    sys.exit(0 if ok else 1)


run(main())
