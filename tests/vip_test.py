"""Special VIP helicopters (events/vip_heli.js) + the secret Trump Towers hotel."""
import sys
from harness import Game, run

FAILS = []


def check(ok, what, info=''):
    print(('OK  ' if ok else 'FAIL') + ' ' + what, info)
    if not ok:
        FAILS.append(what)


async def land_and_meet(g, kind):
    """Force a special landing of this kind, send the valet, return once the VIP is met."""
    await g.js(f"() => {{ debugEndEvent(); vipDebug('{kind}'); }}")
    for _ in range(80):
        if await g.js("() => MCV.S.heli.phase !== 'wait'"):
            break
        await g.run(100)
    sp = await g.js("() => MCV.S.heli.special && { kind: MCV.S.heli.special.kind, tip: MCV.S.heli.special.tip }")
    await g.js("() => tapHeli()")
    for _ in range(300):
        if await g.js('() => MCV.S.heli.ok !== null'):
            break
        await g.run(100)
    return sp, await g.js('() => MCV.S.heli.ok')


async def main():
    async with Game() as g:
        await g.start('monte_carlo')
        await g.js("() => { MCV.S.t = phaseTime('dinner', 0.1); MCV.S.money = 0; }")
        check(await g.js("() => !listedHotels().includes('trump_towers') && !hotelAccess(HOTELS.trump_towers).ok"),
              'Trump Towers hidden before the easter egg')

        # royalty: $2000, motorcade on the road, right side blocked, then everything reopens
        m0 = await g.js('() => MCV.S.money')
        sp, ok = await land_and_meet(g, 'royal')
        m1 = await g.js('() => MCV.S.money')
        check(sp and sp['kind'] == 'royal' and ok, 'royal VIP lands and is met', sp)
        check(m1 - m0 >= 2000, 'royal tip $2000', m1 - m0)
        await g.run(2500)
        await g.shot('vip_royal')
        st = await g.js("() => { const a = activeEvent('vipHeli'); return a && { n: a.vehicles.length, blocked: BLOCKED_SIDES.has('east') }; }")
        check(st and st['n'] == 2 and st['blocked'], 'motorcade of 2 SUVs, right side blocked', st)
        for _ in range(80):
            if not await g.js("() => !!activeEvent('vipHeli')"):
                break
            await g.run(500)
        check(await g.js("() => !activeEvent('vipHeli') && !BLOCKED_SIDES.has('east')"), 'motorcade leaves, right side reopens')

        # celebrity: $1500 + paparazzi
        m0 = await g.js('() => MCV.S.money')
        sp, ok = await land_and_meet(g, 'celeb')
        m1 = await g.js('() => MCV.S.money')
        check(sp and sp['kind'] == 'celeb' and ok and m1 - m0 >= 1500, 'celebrity met, $1500 tip', [sp, m1 - m0])
        await g.run(1500)
        check(await g.js("() => { const a = activeEvent('vipHeli'); return !!a && a.papT > 0; }"), 'paparazzi on the hotel front')
        await g.shot('vip_celeb')

        # POTUS: walks in -> TRUMP TOWERS, gold, all beaters, secret hotel unlocked
        await g.run(1500)
        sp, ok = await land_and_meet(g, 'potus')
        check(sp and sp['kind'] == 'potus' and ok, 'POTUS met', sp)
        await g.run(1200)
        await g.shot('vip_potus_walk')
        for _ in range(40):
            if await g.js('() => !!MCV.S.trumped'):
                break
            await g.run(200)
        r = await g.js("""() => ({ trumped: !!MCV.S.trumped, sign: String(HOTEL.name),
            beaters: [...MCV.S.cars.values()].every(c => c.tier === 'beater'), n: MCV.S.cars.size,
            secret: !!SAVE.secrets.potus, next: spawnArrival().tier })""")
        check(r['trumped'] and r['sign'] == 'TRUMP TOWERS', 'sign reads TRUMP TOWERS', r)
        check(r['beaters'] and r['n'] > 0 and r['next'] == 'beater', 'every car (and every new arrival) is a beater', r)
        check(r['secret'] and await g.js("() => listedHotels().includes('trump_towers') && hotelAccess(HOTELS.trump_towers).ok"),
              'secret Trump Towers hotel unlocked')
        await g.run(800)
        await g.shot('vip_trump_towers')

        # the next shift is the real hotel again
        await g.js("() => startGame('monte_carlo')")
        await g.run(300)
        r = await g.js("() => ({ sign: String(HOTEL.name), trumped: !!MCV.S.trumped })")
        check(r['sign'] != 'TRUMP TOWERS' and not r['trumped'], 'next shift: normal hotel again', r)
        # hotel select shows the gold secret button, and the secret hotel plays
        await g.js("() => goScreen('hotels')")
        await g.run(300)
        await g.shot('vip_hotel_select')
        await g.js("() => startGame('trump_towers')")
        await g.run(1500)
        await g.shot('trump_towers_hotel')
        check(await g.js("() => HOTEL.id === 'trump_towers' && MCV.S.phase === 'play'"), 'Trump Towers hotel plays')
        check(not g.errors, 'no page errors', g.errors[:3])
    print('FAILED' if FAILS else 'PASS')
    sys.exit(1 if FAILS else 0)


if __name__ == '__main__':
    run(main())
