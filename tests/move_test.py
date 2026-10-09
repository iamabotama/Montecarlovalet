"""Moving parked cars: select a valet, tap a parked car, tap a new spot (world/planner.js 'move')."""
import sys
from harness import Game, run

FAILS = []


def check(ok, what, info=''):
    print(('OK  ' if ok else 'FAIL') + ' ' + what, info)
    if not ok:
        FAILS.append(what)


async def main():
    async with Game() as g:
        await g.start('monte_carlo')
        # two cars parked straight into row 0: one at the west end, one just inside it
        ids = await g.js('() => [0, 1, 2].map(() => spawnArrival(TIERS[1]).carId)')
        for _ in range(100):
            if await g.js('ids => ids.every(id => MCV.S.cars.get(id).loc.t === "curb")', ids):
                break
            await g.run(100)
        # row 0: the first car at idx 1, boxed in by the second (idx 0, west end) and the third (idx 2, east side)
        await g.js('''ids => ids.forEach((id, n) => { const c = MCV.S.cars.get(id);
            MCV.S.curb[c.loc.k].car = null; placeInStall(c, 0, [1, 0, 2][n]); MCV.S.guests.get(c.guestId).state = 'inside'; })''', ids)
        deep, front = ids[0], ids[1]
        check(await g.js('id => !isMovable(MCV.S.cars.get(id))', deep), 'car behind another is not movable')
        await g.js('id => { const c = MCV.S.cars.get(id); tapCar(c, MCV.S.guests.get(c.guestId)); }', deep)
        check(await g.js('() => MCV.S.selected === null && MCV.S.toasts.some(o => String(o.msg).startsWith("Blocked"))'),
              'tapping it explains it is blocked')
        # hire a helper, select him, tap the front car, choose a stall in another row
        await g.js('() => { MCV.S.money += 1000; hireValet(); MCV.S.activeW = MCV.S.helpers[0].id; }')
        await g.run(3000)
        await g.js('id => { const c = MCV.S.cars.get(id); tapCar(c, MCV.S.guests.get(c.guestId)); }', front)
        opt = await g.js('''() => { const o = selectionOptions().stalls.find(s => s.job && s.lane === 2);
          return o && { type: o.job.type, lane: o.lane, side: o.side }; }''')
        check(opt and opt['type'] == 'move', 'selected parked car offers move destinations', opt)
        await g.js('''() => { const o = selectionOptions().stalls.find(s => s.job && s.lane === 2);
          enqueue(o.job); MCV.S.selected = null; }''')
        w = await g.js('() => MCV.S.jobs.length && MCV.S.jobs[0].wid === MCV.S.helpers[0].id')
        check(w, 'the selected helper got the move job')
        for _ in range(150):
            loc = await g.js('id => MCV.S.cars.get(id).loc', front)
            if loc.get('t') == 'stall' and loc.get('lane') == 2:
                break
            await g.run(100)
        check(loc.get('t') == 'stall' and loc.get('lane') == 2, 'car moved to row 2', loc)
        check(await g.js('() => MCV.S.lanes[0].cars[0] === null'), 'old stall is free')
        check(await g.js('id => isMovable(MCV.S.cars.get(id))', deep), 'the car behind is now movable')
        check(not g.errors, 'no page errors', g.errors[:3])
    print('FAILED' if FAILS else 'PASS')
    sys.exit(1 if FAILS else 0)


if __name__ == '__main__':
    run(main())
