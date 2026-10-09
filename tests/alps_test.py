"""Swiss Alps signature features: snowmobiles (events/snowmobiles.js) and blizzard (events/blizzard.js).
- Only eligible at snow hotels.
- With share forced to 1, everyday arrivals are snowmobiles: faster, own names, drawn as sleds, park fine.
- A blizzard slows walking, slows patience drain, draws an overlay, ends by itself."""
import sys
from harness import Game, run
FAILS = []
def check(ok, what, info=''):
    print(('OK  ' if ok else 'FAIL') + ' ' + what, info)
    if not ok:
        FAILS.append(what)
QUIET = ('() => { MCV.DEBUG.scale = 4; for (const k of ["drunkDriver", "vipHeli", "joyride"]) '
         'EVENT_CONFIG[k].enabled = false; EVENT_CONFIG.blizzard.chance = 0; }')
async def main():
    async with Game() as g:
        await g.start('monte_carlo')
        on = await g.js('() => [eventOn("snowmobiles"), eventOn("blizzard")]')
        check(on == [False, False], 'not eligible at Monte Carlo', on)
    async with Game() as g:
        await g.start('swiss_chalet')
        await g.js(QUIET)
        on = await g.js('() => [eventOn("snowmobiles"), eventOn("blizzard")]')
        check(on == [True, True], 'eligible at the Swiss chalet', on)
        await g.js('() => { EVENT_CONFIG.snowmobiles.share = 1; for (let i = 0; i < 3; i++) spawnArrival("standard"); }')
        await g.run(2500)
        await g.shot('alps_sleds_arrive')
        info = await g.js('() => { const cs = [...MCV.S.cars.values()].filter(c => c.tier === "standard"); '
                          'return cs.map(c => ({ sled: !!c.sled, name: carName(c), sp: vehicleSpeed(c) })); }')
        check(len(info) >= 3 and all(c['sled'] for c in info), 'standard arrivals became snowmobiles', info)
        check(all(c['name'] in ('Ski-Dew Summit', 'Arctic Kat ZR', 'Polarus Rush', 'Yamahoo Sidewinder', 'Lynks Rave')
                  for c in info), 'snowmobile names on the board')
        check(all(abs(c['sp'] - 1.8) < 1e-6 for c in info), 'snowmobiles drive faster')
        whale = await g.js('() => { const c = { tier: "whale", mi: 0, loc: { t: "street" } }; eventHook("carCreated", c); return !!c.sled; }')
        check(not whale, 'whales keep their cars')
        await g.bot(4)
        await g.run(12000)
        parked = await g.js('() => [...MCV.S.cars.values()].filter(c => c.sled && (c.loc.t === "stall" || c.loc.t === "temp" || c.loc.t === "prem")).length')
        check(parked >= 1, 'snowmobiles get parked', parked)
        await g.shot('alps_sleds_parked')
        # ---- blizzard
        await g.js('() => { MCV.S.events.active = null; MCV.S.events.cooldown = 0; blizzardStart(); }')
        await g.run(1500)  # ~6 s of game time at DEBUG.scale 4
        b = await g.js('() => ({ id: MCV.S.events.active && MCV.S.events.active.id, walk: eventWalkRate(), wait: eventWaitRate() })')
        check(b['id'] == 'blizzard' and abs(b['walk'] - 0.7) < 1e-6 and abs(b['wait'] - 0.6) < 1e-6, 'blizzard slows walking and patience', b)
        await g.shot('alps_blizzard')
        await g.run(9000)  # past the 35 s duration
        after = await g.js('() => ({ active: MCV.S.events.active && MCV.S.events.active.id, walk: eventWalkRate() })')
        check(after['active'] != 'blizzard' and after['walk'] == 1, 'blizzard ends by itself', after)
        errs = getattr(g, 'errors', [])
        check(not errs, 'no page errors', errs[:3])
    print('PASS' if not FAILS else 'FAILED: ' + ', '.join(FAILS))
    sys.exit(1 if FAILS else 0)
run(main())
