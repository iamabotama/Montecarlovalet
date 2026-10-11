"""Skipping dead time (v2.19): NEXT WAVE on a break once nothing is left outside (early-call bonus, wages
still charged, guests inside stay inside), END SHIFT once last call has emptied the hotel, and the
next-wave preview in the message dock. Buttons are tapped on screen, so the input wiring is covered too."""
import sys
from harness import Game, run

# Empty the property: no guests, cars, jobs or street queue; the helicopter is done for the night.
CLEAR = '''() => { const S = MCV.S;
  for (const g of [...S.guests.values()]) { const c = S.cars.get(g.carId); if (c) { removeCarFromWorld(c); S.cars.delete(c.id); } S.guests.delete(g.id); }
  S.jobs.length = 0; S.streetQueue.length = 0; if (S.heli) S.heli.phase = 'gone'; S.banners.length = 0; S.toasts.length = 0; }'''
# Jump into phase i as if it had been reached normally.
GOTO = '''i => { const S = MCV.S; S.t = phaseStart(i) + 1; S.phaseI = i - 1; S.stats.wavesCleared = PHASES().slice(0, i).filter(p => p.kind === 'wave').length; }'''
BUTTONS = '() => phaseButtons().map(b => ({ label: String(b.label), x: b.x + b.w / 2, y: b.y + b.h / 2 }))'


def check(name, ok, detail=''):
    print(('OK   ' if ok else 'FAIL ') + name, detail)
    return ok


async def tap_button(g, prefix):
    for b in await g.js(BUTTONS):
        if b['label'].startswith(prefix):
            await g.tap(b['x'], b['y'])
            await g.run(150)
            return True
    return False


async def main():
    ok = True
    async with Game() as g:
        await g.start('monte_carlo')
        await g.js('() => { CONFIG.heat.max = 1e9; }')
        brk = await g.js('() => PHASES().findIndex((p, i) => p.kind === "break" && i > 2)')  # the break after wave 2
        await g.js(CLEAR)
        await g.js(GOTO, brk)
        await g.run(300)

        # a guest at the curb blocks NEXT WAVE; clock-out (after wave 2) is still offered
        await g.js('() => { spawnArrival("standard"); }')
        await g.run(1200)
        st = await g.js('() => ({ next: canCallNextWave(), clock: canClockOut() })')
        ok &= check('guest outside: no NEXT WAVE', not st['next'] and st['clock'], st)

        # clear it, leave two guests inside, hire a helper; now it is offered
        await g.js(CLEAR)
        await g.js('''() => { const S = MCV.S; for (let k = 0; k < 2; k++) { const gg = spawnArrival('premium'); S.streetQueue.length = 0;
            const c = S.cars.get(gg.carId); c.loc = { t: 'street' }; gg.state = 'inside'; gg.stay = 999; } S.money = 1000; hireValet(); }''')
        await g.run(1600)  # helper walks in
        st = await g.js('() => ({ next: canCallNextWave(), btns: phaseButtons().map(b => String(b.label)), left: phaseLeftSec(), bonus: earlyCallBonus() })')
        ok &= check('board clear: NEXT WAVE offered above CLOCK OUT', st['next'] and st['btns'][0].startswith('Next Wave') and 'Clock Out Early' in st['btns'], st)
        ok &= check('bonus = $2 per second left', abs(st['bonus'] - round(st['left'] * 2)) <= 2, st)
        pv = await g.js('() => nextWavePreview()')
        ok &= check('preview names the next wave', pv and pv['cars'] > 0 and len(pv['counts']) > 0, pv)

        before = await g.js('() => ({ m: MCV.S.money, w: MCV.S.stats.wages, i: MCV.S.phaseI, paid: MCV.S.helpers[0].paidT })')
        tapped = await tap_button(g, 'Next Wave')
        after = await g.js('''() => ({ m: MCV.S.money, w: MCV.S.stats.wages, i: MCV.S.phaseI, kind: curPhase().kind, calls: MCV.S.stats.earlyCalls,
            sec: MCV.S.stats.earlySec, inside: [...MCV.S.guests.values()].filter(g => g.state === 'inside').length, paid: MCV.S.helpers[0].paidT })''')
        ok &= check('tap NEXT WAVE: next wave starts', tapped and after['i'] == brk + 1 and after['kind'] == 'wave', (before, after))
        ok &= check('early call counted', after['calls'] == 1 and after['sec'] >= st['left'] - 2, after)
        ok &= check('guests inside stay inside', after['inside'] == 2, after)
        ok &= check('skipped time counts toward wages', after['paid'] < before['paid'] - st['left'] + 2 or after['w'] > before['w'], (before, after))
        ok &= check('no NEXT WAVE during a wave', not await g.js('() => canCallNextWave()'))
        ok &= check('no preview during a wave', not await g.js('() => nextWavePreview()'))

        # CLOCK OUT still works from its new spot
        await g.js(CLEAR)
        await g.js(GOTO, brk)
        await g.run(300)
        await tap_button(g, 'Clock Out')
        ok &= check('tap CLOCK OUT ends the shift', await g.js('() => MCV.S.phase') == 'clockout')

    async with Game() as g:
        await g.start('monte_carlo')
        await g.js('() => { CONFIG.heat.max = 1e9; }')
        last = await g.js('() => PHASES().length - 1')
        await g.js(CLEAR)
        await g.js(GOTO, last)
        await g.js('() => { const gg = spawnArrival("beater"); MCV.S.streetQueue.length = 0; gg.state = "inside"; gg.stay = 999; }')
        await g.run(300)
        ok &= check('last call with a guest inside: no END SHIFT', not await g.js('() => canEndShift()'))
        await g.js(CLEAR)
        await g.run(300)
        btns = await g.js(BUTTONS)
        ok &= check('empty hotel: END SHIFT offered', [b['label'] for b in btns] == ['End Shift'], btns)
        await tap_button(g, 'End Shift')
        await g.run(4500)
        res = await g.js('() => RESULT && { complete: RESULT.complete, stars: RESULT.stars, pay: RESULT.st.pay, waves: RESULT.st.wavesCleared }')
        ok &= check('END SHIFT completes the night', res and res['complete'] and res['stars'] >= 2 and res['pay'] >= 150 and res['waves'] == 6, res)
        ok &= check('no page errors', not g.errors, g.errors[:3])
    sys.exit(0 if ok else 1)


run(main())
