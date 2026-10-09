"""Comps for upset whales (data/comps.js, sim/comps.js, ui/comp_menu.js)."""
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
        await g.js("() => { MCV.S.t = phaseTime('dinner', 0.1); MCV.S.money = 2000; MCV.S.heat = 40; }")
        gid = await g.js("() => spawnArrival('whale').id")
        for _ in range(100):
            if await g.js("id => MCV.S.guests.get(id).state === 'curbDrop'", gid):
                break
            await g.run(100)
        G = 'MCV.S.guests.get(id)'
        # calm whale: tap does what it always did (no menu)
        await g.js(f'id => tapGuest({G})', gid)
        check(await g.js('() => MCV.S.comps.menu === null'), 'calm whale tap: no comp menu')
        # make him visibly annoyed
        await g.js(f'id => {{ const g = {G}; g.wait = g.patience * 0.75; }}', gid)
        await g.run(300)
        check(await g.js('() => MCV.S.comps.hinted && MCV.S.banners.some(b => String(b.text).startsWith("Upset"))'),
              'first upset whale shows the comp hint')
        await g.js(f'id => tapGuest({G})', gid)
        check(await g.js('() => !!MCV.S.comps.menu'), 'upset whale tap opens the comp menu')
        await g.shot('comp_menu')
        # champagne via a REAL tap on its menu row
        row = await g.js('() => { const r = compMenuRows()[0]; return [r.x + r.w / 2, r.y + 4]; }')
        before = await g.js(f'id => {{ const g = {G}; return [g.wait / g.patience, MCV.S.money]; }}', gid)
        await g.tap(*row)
        await g.run(100)
        after = await g.js(f'id => {{ const g = {G}; return [g.wait / g.patience, MCV.S.money]; }}', gid)
        check(after[0] < before[0] - 0.4 and before[1] - after[1] >= 100, 'champagne: +50% patience, $100', [before, after])
        check(await g.js('() => MCV.S.comps.used.champagne && MCV.S.comps.menu === null'), 'champagne used, menu closed')
        # upset again -> champagne greyed out, showgirl freezes the drain
        await g.js(f'id => {{ const g = {G}; g.wait = g.patience * 0.75; }}', gid)
        await g.run(200)
        await g.js(f'id => tapGuest({G})', gid)
        r = await g.js("() => compMenuRows().map(r => [r.id, r.ok, String(r.price)])")
        check(r[0][1] is False and r[0][2] == 'used', 'used comp is greyed out', r[0])
        await g.js(f"id => applyComp('showgirl', {G})", gid)
        w0 = await g.js(f'id => {G}.wait', gid)
        await g.run(2000)
        await g.shot('comp_showgirl')
        w1 = await g.js(f'id => {G}.wait', gid)
        check(abs(w1 - w0) < 0.01, 'showgirl: no patience drain', [w0, w1])
        # comp room: full patience + forgives heat
        h0 = await g.js('() => MCV.S.heat')
        await g.js(f'id => {{ const g = {G}; g.ignoreT = 0; g.wait = g.patience * 0.8; g.stage = stageOf(g); }}', gid)
        ok = await g.js(f"id => applyComp('room', {G})", gid)
        st = await g.js(f'id => [{G}.wait, MCV.S.heat]', gid)
        check(ok and st[0] < 0.05 and st[1] <= h0 - 14, 'comp room: full patience, heat forgiven', [h0, st])
        # menu closes when tapping elsewhere
        await g.js(f'id => {{ const g = {G}; g.wait = g.patience * 0.75; g.stage = stageOf(g); tapGuest(g); }}', gid)
        await g.tap(80, 120)
        await g.run(100)
        check(await g.js('() => MCV.S.comps.menu === null'), 'tap elsewhere closes the menu')
        # a regular guest is never offered comps
        check(await g.js("() => { const gg = spawnArrival(TIERS[0]); gg.state = 'curbDrop'; gg.wait = gg.patience; gg.stage = 4; return !compEligible(gg); }"),
              'non-whale is never eligible')
        check(not g.errors, 'no page errors', g.errors[:3])
    print('FAILED' if FAILS else 'PASS')
    sys.exit(1 if FAILS else 0)


if __name__ == '__main__':
    run(main())
