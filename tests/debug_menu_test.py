"""Debug menu (js/screens/debug_menu.js): title corner button opens it; each scenario starts a shift and fires.
Also checks the v2.8 tuning: 2 overflow slots, 6 waves to 2 AM, two Monte Carlo helicopters."""
import sys
from harness import Game, run

FAILS = []


def check(ok, what, info=''):
    print(('OK  ' if ok else 'FAIL') + ' ' + what, info)
    if not ok:
        FAILS.append(what)


PRESS = '''label => { const b = SCREENS[UI.screen].buttons().find(b => String(b.label).startsWith(label));
  if (!b) return false; b.fn(); return true; }'''


async def main():
    async with Game() as g:
        await g.js("() => { SAVE.tutorialSeen = true; goScreen('title'); }")
        check(await g.js(PRESS, 'DEBUG'), 'title has a DEBUG button')
        check(await g.js('() => UI.screen') == 'debugMenu', 'it opens the debug menu')
        await g.shot('debug_menu')
        # drunk-driver crash from the menu
        await g.js(PRESS, 'Drunk driver: CRASH')
        for _ in range(30):
            if await g.js('() => MCV.S.events.active && MCV.S.events.active.phase') == 'scene':
                break
            await g.run(250)
        r = await g.js('() => ({ screen: UI.screen, ph: MCV.S.events.active && MCV.S.events.active.phase, overlay: MCV.DEBUG.on, hotel: HOTEL.id })')
        check(r['screen'] == 'game' and r['ph'] == 'scene' and r['overlay'], 'menu CRASH starts a shift with the crash', r)
        # back to the menu, end it, call a helicopter
        await g.js("() => goScreen('debugMenu')")
        await g.js(PRESS, 'End current event')
        check(not await g.js('() => !!MCV.S.events.active'), 'End current event clears it')
        await g.js("() => goScreen('debugMenu')")
        await g.js(PRESS, 'Helicopter now')
        await g.run(3000)
        check(await g.js('() => heliVisible()'), 'Helicopter now brings one in')
        await g.js("() => goScreen('debugMenu')")
        await g.js(PRESS, 'Jump: After Party')
        await g.run(500)
        r = await g.js('() => ({ id: curPhase().id, tip: phaseTipMult(), ev: phaseEventMult() })')
        check(r == {'id': 'after', 'tip': 1.5, 'ev': 3}, 'Jump: After Party (1.5x tips, 3x event odds)', r)
        # tuning
        r = await g.js('() => ({ temps: TEMPS.length, waves: waveCount(), end: shiftEndHour(), helis: HOTEL.helo.times.length })')
        check(r == {'temps': 2, 'waves': 6, 'end': 26, 'helis': 2}, 'tuning: 2 overflow slots, 6 waves, 2 AM, 2 helicopters', r)
        # collapsed strip by default; DBG opens the panel; an event button folds it again; QUIT leaves debug mode
        check(await g.js('() => MCV.DEBUG.on && !MCV.DEBUG.open && debugButtons().length === 2'), 'collapsed to the DBG/QUIT strip')
        await g.shot('debug_strip')
        await g.js('() => debugButtons()[0].fn()')
        check(await g.js('() => MCV.DEBUG.open && debugButtons().length > 10'), 'DBG opens the full panel')
        await g.shot('debug_open')
        await g.js("() => debugButtons().find(b => b.label === 'END EV').fn()")
        check(not await g.js('() => MCV.DEBUG.open'), 'END EV folds the panel away')
        await g.js("() => debugButtons().find(b => b.label === 'QUIT').fn()")
        r = await g.js('() => ({ scr: UI.screen, on: MCV.DEBUG.on, en: MCV.DEBUG.enabled, odds: MCV.DEBUG.alwaysEvents, sc: MCV.DEBUG.scale })')
        check(r == {'scr': 'title', 'on': False, 'en': False, 'odds': False, 'sc': 1}, 'QUIT leaves debug mode for the title', r)
        await g.js(PRESS, 'DEBUG')
        await g.js(PRESS, 'Quit debug')
        check(await g.js('() => UI.screen') == 'title', 'menu Quit debug returns to the title')
        check(not g.errors, 'no page errors', g.errors[:3])
    print('FAILED' if FAILS else 'PASS')
    sys.exit(1 if FAILS else 0)


if __name__ == '__main__':
    run(main())
