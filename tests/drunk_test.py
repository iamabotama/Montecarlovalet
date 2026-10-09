"""Drunk driver event (js/events/drunk_driver.js) with chance forced to 1.
Run A: tipsy whale hiccups; tapping him calls a cab (car and guest leave, no crash).
Run B: hand him his keys -> crash at the east entrance; east end closed; help driver + call cops;
cops then tow arrive; road reopens; bonus paid."""
import sys
from harness import Game, run
from premium_test import first_curb_car

FAILS = []


def check(ok, what, info=''):
    print(('OK  ' if ok else 'FAIL') + ' ' + what, info)
    if not ok:
        FAILS.append(what)


async def drunk_whale(g):
    """Park the first curb car in a row stall, make its owner a whale, bring him out for pickup."""
    await g.js('() => { MCV.DEBUG.scale = 4; EVENT_CONFIG.drunkDriver.chance = 1; EVENT_CONFIG.vipHeli.enabled = false; MCV.S.events.cooldown = 0; }')
    c = await first_curb_car(g)
    await g.js('id => { const o = selectionOptions(); const s = o.stalls.find(s => s.prem == null && !s.bad); '
               'enqueue({ type: "park", carId: id, lane: s.lane, side: s.side }); }', c['id'])
    for _ in range(40):
        if await g.js('id => MCV.S.cars.get(id).loc.t === "stall"', c['id']):
            break
        await g.run(250)
    await g.js('id => { MCV.S.t = phaseStart(4); const car = MCV.S.cars.get(id); const gg = MCV.S.guests.get(car.guestId); '
               'gg.tier = "whale"; gg.stay = 0; }', c['id'])
    for _ in range(40):
        st = await g.js('id => { const gg = MCV.S.guests.get(MCV.S.cars.get(id).guestId); return gg && [gg.state, !!gg.drunk, !!gg.ticket]; }', c['id'])
        if st and st[0] == 'pickWait' and st[2]:
            break
        await g.run(250)
    return c['id'], st


async def main():
    # ---- A: call a cab
    async with Game() as g:
        await g.start('monte_carlo')
        cid, st = await drunk_whale(g)
        check(st and st[1], 'whale at pickup is tipsy', st)
        await g.run(2500)
        hic = await g.js('() => MCV.S.floaters.some(f => String(f.text) === t("event.drunk.hic"))')
        check(hic, 'he hiccups')
        r = await g.js('id => { const car = MCV.S.cars.get(id); const gg = MCV.S.guests.get(car.guestId); tapGuest(gg); '
                       'return { car: MCV.S.cars.has(id), guest: MCV.S.guests.has(gg.id), cabs: MCV.S.stats.cabs, ev: !!MCV.S.events.active }; }', cid)
        check(not r['car'] and not r['guest'] and r['cabs'] == 1 and not r['ev'], 'tap = cab: car and guest leave, no event', r)
        check(not g.errors, 'no page errors (A)', g.errors[:3])
    # ---- B: the crash
    async with Game() as g:
        await g.start('monte_carlo')
        cid, st = await drunk_whale(g)
        await g.js('id => enqueue({ type: "fetch", carId: id })', cid)
        for _ in range(80):
            ph = await g.js('() => MCV.S.events.active && MCV.S.events.active.phase')
            if ph == 'scene':
                break
            await g.run(250)
        check(ph == 'scene', 'keys handed over -> crash scene', ph)
        r = await g.js('() => ({ sides: LOT_SIDES.slice(), base: LOT_BASE_SIDES.slice(), rate: eventWaitRate() })')
        check(r['sides'] == ['west'] and r['base'] == ['west', 'east'] and r['rate'] < 1, 'east end closed, guests more patient', r)
        await g.run(600)
        await g.shot('drunk_crash')
        await g.js('() => { const ev = activeEvent("drunkDriver"); ddHelpDriver(ev); }')
        await g.run(200)
        await g.js('() => { MCV.S.money += 0; const ev = activeEvent("drunkDriver"); MCV.S.activeW = MCV.S.valet.id; ddCallCops(ev); }')
        m0 = await g.js('() => MCV.S.money')
        seen_cop = False
        for i in range(240):
            r = await g.js('() => { const ev = MCV.S.events.active; return ev ? { d: ev.driver && ev.driver.state, cops: ev.copsCalled, you: ev.byYou, '
                           'cop: !!ev.cop, lights: !!(ev.cop && ev.cop.lights), tow: !!ev.tow } : null; }')
            if r and r['lights'] and not seen_cop:
                seen_cop = True
                await g.run(1500)
                await g.shot('drunk_cops')
            if r is None:
                break
            await g.run(250)
        check(seen_cop, 'cop car arrives with lights')
        fin = await g.js('() => ({ sides: LOT_SIDES.slice(), handled: MCV.S.stats.drunkHandled || 0, car: MCV.S.cars.has(%d) })' % cid)
        m1 = await g.js('() => MCV.S.money')
        check(r is None and fin['sides'] == ['west', 'east'] and not fin['car'], 'tow takes the car, road reopens', fin)
        check(fin['handled'] == 1 and m1 - m0 >= 200, 'both jobs done -> bonus', {'gain': m1 - m0})
        check(not g.errors, 'no page errors (B)', g.errors[:3])
    print('FAILED' if FAILS else 'PASS')
    sys.exit(1 if FAILS else 0)


if __name__ == '__main__':
    run(main())
