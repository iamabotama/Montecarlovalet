"""Premium stalls (world/premium.js) and premium gates (career/store.js premiumFeature).
Checks: P1 locked at rank 0 / open at rank 1; P2 open while the store is off; a car parks in a premium
stall faster than in any row stall, is fetched back and leaves; with the store on and nothing bought,
P2, the 3rd valet and the last hotel are gated."""
import sys
from harness import Game, run

FAILS = []


def check(ok, what, info=''):
    print(('OK  ' if ok else 'FAIL') + ' ' + what, info)
    if not ok:
        FAILS.append(what)


# Wait for the first car at the curb, select it, return its park choices.
CURB_CAR = '''() => {
  for (const car of MCV.S.cars.values()) {
    const g = MCV.S.guests.get(car.guestId);
    if (car.loc.t === 'curb' && g && g.state === 'curbDrop' && g.tier !== 'limo') {
      MCV.S.selected = { carId: car.id, bags: false };
      const o = selectionOptions();
      const row = o.stalls.filter(s => s.prem == null && !s.bad).map(s => s.est);
      const prem = o.stalls.filter(s => s.prem != null).map(s => ({ i: s.prem, est: s.est }));
      return { id: car.id, row: Math.min(...row), prem };
    }
  }
  return null;
}'''


async def first_curb_car(g):
    for _ in range(60):
        c = await g.js(CURB_CAR)
        if c:
            return c
        await g.run(250)
    return None


async def main():
    async with Game() as g:
        await g.js('() => { MCV.DEBUG.scale = 4; }')
        # --- rank 0, store off: P1 locked, P2 open
        await g.js('() => { SAVE.careerXP = 0; syncRank(); }')
        await g.start('monte_carlo')
        await g.js('() => { MCV.DEBUG.scale = 4; }')
        open0 = await g.js('() => MCV.S.prem.map(p => p.open)')
        check(open0 == [False, True], 'rank 0: P1 locked, P2 open (store off)', open0)
        c = await first_curb_car(g)
        check(c is not None, 'a car reached the curb')
        if c:
            check([p['i'] for p in c['prem']] == [1], 'only P2 offered', c['prem'])
            check(c['prem'] and c['prem'][0]['est'] < c['row'], 'P2 is quicker than the best row stall',
                  {'p2': c['prem'] and c['prem'][0]['est'], 'row': c['row']})
            await g.js('id => enqueue({ type: "park", carId: id, prem: 1 })', c['id'])
            for _ in range(40):
                loc = await g.js('id => MCV.S.cars.get(id).loc', c['id'])
                if loc['t'] == 'prem':
                    break
                await g.run(250)
            check(loc == {'t': 'prem', 'i': 1}, 'car parked in P2', loc)
            await g.run(600)
            await g.shot('premium_parked')
            info = await g.js('''id => { const car = MCV.S.cars.get(id); return {
                board: spotName(car.loc), free: premFree(1), offered: (MCV.S.selected = null, true) }; }''', c['id'])
            check(info['board'] == 'P2' and not info['free'], 'board says P2 and it is taken', info)
            # send the guest out and fetch the car
            await g.js('id => { MCV.S.t = phaseStart(4); const car = MCV.S.cars.get(id); MCV.S.guests.get(car.guestId).stay = 0; }', c['id'])
            for _ in range(60):
                st = await g.js('''id => { const car = MCV.S.cars.get(id); const g = car && MCV.S.guests.get(car.guestId);
                    if (g && g.state === 'pickWait' && !MCV.S.jobs.some(j => j.type === 'fetch' && j.carId === id))
                      enqueue({ type: 'fetch', carId: id });
                    return car ? car.loc.t : 'gone'; }''', c['id'])
                if st in ('gone', 'street', 'moving') and await g.js('() => MCV.S.prem[1].car === null'):
                    break
                await g.run(250)
            check(await g.js('() => MCV.S.prem[1].car === null'), 'fetched out of P2, stall free again', st)
        # --- rank 1: P1 opens
        await g.js('() => { SAVE.careerXP = 1000; syncRank(); }')
        await g.start('monte_carlo')
        open1 = await g.js('() => MCV.S.prem.map(p => p.open)')
        check(open1 == [True, True], 'rank 1: P1 unlocked', open1)
        lines = await g.js('() => rankUnlockLines(1).map(String)')
        check(any('P1' in l for l in lines), 'promotion screen lists the premium stall', lines)
        # --- store on, nothing bought: premium features gated
        gated = await g.js('''() => { CONFIG.store.enabled = true; SAVE.entitlements = []; SAVE.careerXP = 99999; syncRank();
            startGame('monte_carlo');
            const r = { p2: MCV.S.prem[1].open, cap: helperCap(), swiss: hotelAccess(HOTELS.swiss_chalet).ok,
                        dubai: hotelAccess(HOTELS.dubai).ok };
            SAVE.entitlements = ['premium']; startGame('monte_carlo');
            r.p2Bought = MCV.S.prem[1].open; r.capBought = helperCap(); r.swissBought = hotelAccess(HOTELS.swiss_chalet).ok;
            CONFIG.store.enabled = false; SAVE.entitlements = []; return r; }''')
        check(gated == {'p2': False, 'cap': 1, 'swiss': False, 'dubai': False,
                        'p2Bought': True, 'capBought': 3, 'swissBought': True}, 'premium gates (store on)', gated)
        # --- tutorial: no premium stalls
        tut = await g.js('() => { startTutorial(); return [premOpen(0), premOpen(1)]; }')
        check(tut == [False, False], 'premium stalls closed in the tutorial', tut)
        check(not g.errors, 'no page errors', g.errors[:3])
    print('FAILED' if FAILS else 'PASS')
    sys.exit(1 if FAILS else 0)


if __name__ == "__main__":
    run(main())
