"""Every-car bonus: a completed night with no unparked arrivals pays CONFIG.shift.everyCarBonus and the
Every Last Car award; waving off one car (a beater) loses both."""
import sys
from harness import Game, run
SAVE = {'version': 3, 'tutorialSeen': True}
checks = []
def check(name, ok, info=''):
    checks.append(ok)
    print('OK  ' if ok else 'FAIL', name, info)
async def shift(g, wave_one):
    await g.js("goScreen('title')")
    await g.js("startGame('monte_carlo', { goals: [], loadout: [] })")
    await g.run(300)
    await g.js('() => { MCV.S.stats.carsParked = 12; }')
    if wave_one:
        await g.js("""() => { const g = spawnArrival('beater'); const car = MCV.S.cars.get(g.carId); waveOff(car, g); }""")
    await g.js('completeShift()')
    for _ in range(40):  # the summary appears after the clock-out animation
        await g.run(500)
        if await g.js('() => UI.screen !== "game"'):
            break
    while await g.js('UI.screen') == 'promotion':
        await g.tap(160, 166)
        await g.run(300)
    return await g.js('() => ({ every: RESULT.st.everyCar, unparked: RESULT.st.unparked, money: RESULT.money, awards: RESULT.awards, scr: UI.screen })')
async def main():
    async with Game(save=SAVE) as g:
        r = await shift(g, wave_one=True)
        check('waved-off beater: no bonus, no award', r['every'] == 0 and r['unparked'] == 1 and 'everyCar' not in r['awards'], r)
        r = await shift(g, wave_one=False)
        check('every car parked: bonus + award', r['every'] == 1 and r['unparked'] == 0 and 'everyCar' in r['awards'], r)
        await g.shot('every_car_summary')
        check('no page errors', not g.errors, g.errors[:3])
    sys.exit(0 if all(checks) else 1)
run(main())
