"""RESERVED power-up: holds a row end, a whale parks into it at depth 0, unused holds expire."""
import sys
from harness import Game, run

checks = []


def check(name, ok, info=''):
    checks.append(ok)
    print('OK  ' if ok else 'FAIL', name, info)


async def main():
    async with Game() as g:
        await g.start('monte_carlo')
        await g.js("() => { MCV.S.cards = []; grantCard('reserved', true); useCard(0); }")
        h = await g.js('() => MCV.S.vipHold')
        check('hold created', h is not None and h['idx'] in (0, 5), h)
        side_open = await g.js('() => entryIndex(MCV.S.vipHold.lane, MCV.S.vipHold.side)')
        check('held row end closed to others', side_open is None)
        # bring a whale to the curb
        await g.js("() => { MCV.DEBUG.scale = 4; spawnArrival('whale'); }")
        for _ in range(40):
            await g.run(250)
            st = await g.js("() => [...MCV.S.guests.values()].find(x => isWhale(x.tier))?.state")
            if st == 'curbDrop':
                break
        check('whale at curb', st == 'curbDrop', st)
        opt = await g.js("""() => { const gst = [...MCV.S.guests.values()].find(x => isWhale(x.tier));
            MCV.S.selected = { carId: gst.carId }; const o = selectionOptions().stalls.find(s => s.vip);
            return o ? { lane: o.lane, idx: o.idx, depth: o.depth } : null; }""")
        check('VIP stall offered for the whale', opt is not None and opt['depth'] == 0, opt)
        await g.shot('reserved_offer')
        await g.js("""() => { const o = selectionOptions().stalls.find(s => s.vip); enqueue(o.job); MCV.S.selected = null; }""")
        for _ in range(40):
            await g.run(250)
            loc = await g.js("() => { const gst = [...MCV.S.guests.values()].find(x => isWhale(x.tier)); return MCV.S.cars.get(gst.carId).loc; }")
            if loc['t'] == 'stall':
                break
        check('whale parked in the held stall', loc.get('t') == 'stall' and loc.get('idx') == opt['idx'] and loc.get('lane') == opt['lane'], loc)
        check('hold consumed', await g.js('() => MCV.S.vipHold') is None)
        # expiry
        await g.js("() => { grantCard('reserved', true); useCard(MCV.S.cards.findIndex(c => c.type === 'reserved')); MCV.S.vipHold.t = 0.5; }")
        await g.run(1500)
        check('unused hold expires', await g.js('() => MCV.S.vipHold') is None)
        check('no page errors', not g.errors, g.errors[:3])
    sys.exit(0 if all(checks) else 1)


run(main())
