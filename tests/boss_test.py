"""Boss waves (v2.20, sim/boss.js): the hotel's event wave is a boss fight. Helipad hotels land the headliner
first, then the Hummdinger Stretch and its limo entourage arrive, then a surge of high rollers. Checks the
stages, each way to lose, the Hummer (boss-only model, jumps the queue), fun events held back, the unlock
gate on the next hotel (with saves from before gates kept open), and boss rematch shifts."""
import sys
from harness import Game, run


def check(name, ok, detail=''):
    print(('OK   ' if ok else 'FAIL ') + name, detail)
    return ok


STAGE = '() => { const B = MCV.S.boss; return { stage: B.stage, leaks: B.leaks, result: B.result, failed: B.failed, ent: B.entourage.length } }'


async def fresh(g, hotel='monte_carlo'):
    await g.start(hotel)
    await g.js('() => { CONFIG.heat.max = 1e9; }')


async def main():
    ok = True
    async with Game() as g:
        # ---- a full fight at Monte Carlo with the autopilot and two helpers
        await fresh(g)
        start = await g.js('''() => { MCV.S.money = 5000; startAtBossWave(); const S = MCV.S;
            const r = { atWave: S.t === phaseStart(S.boss.waveI), heli: S.heli.phase, rematch: S.rematch }; hireValet(); hireValet(); return r; }''')
        ok &= check('rematch start: at the boss wave, past landings skipped', start == {'atWave': True, 'heli': 'gone', 'rematch': True}, start)
        await g.bot(speed=6)
        stages, hum = [], None
        for _ in range(160):
            await g.run(300)
            st = await g.js(STAGE)
            if not stages or stages[-1] != st['stage']:
                stages.append(st['stage'])
            if hum is None:
                hum = await g.js('() => { const B = MCV.S.boss, gg = B.hummer != null && MCV.S.guests.get(B.hummer); return gg ? { mi: MCV.S.cars.get(gg.carId).mi, boss: bossModel("limo"), name: carName(MCV.S.cars.get(gg.carId)) } : null }')
            if st['stage'] == 'done':
                break
        ok &= check('stages in order', stages == ['wait', 'herald', 'motorcade', 'surge', 'mop', 'done'] or stages == ['wait', 'herald', 'motorcade', 'surge', 'done'], stages)
        ok &= check('the Hummer is the boss model', hum and hum['mi'] == hum['boss'] and hum['name'] == 'Hummdinger Stretch', hum)
        ok &= check('boss beaten with crew', st['result'] == 'won' and st['ent'] == 4, st)
        ok &= check('win counted', await g.js('() => MCV.S.stats.bossWon === 1 && MCV.S.stats.bossTries === 1'))
        await g.js('() => { completeShift(); }')  # a rematch reaching 2 AM is practice, not a full night
        await g.run(4500)
        practice = await g.js('() => RESULT && { complete: RESULT.complete, everyCar: RESULT.st.everyCar, awards: RESULT.awards }')
        ok &= check('rematch: no full-shift bonus, every-car bonus or full-night awards',
                    practice and not practice['complete'] and not practice['everyCar'] and 'fullNight' not in practice['awards'] and 'everyCar' not in practice['awards'], practice)
        r = await g.js('() => RESULT && { bossNew: RESULT.bossNew, stars: RESULT.stars, isHigh: RESULT.isHigh, rec: activeChar().hotels.monte_carlo }')
        ok &= check('career: boss beaten recorded, rematch is practice (no stars, no high score)',
                    r and r['bossNew'] and r['rec']['bossBeaten'] and r['rec']['bossTries'] == 1 and r['stars'] == 0 and not r['isHigh'] and r['rec']['highScore'] == 0, r)

        # ---- the unlock gate
        gate = await g.js('''() => { const me = activeChar(); me.rank = 1; const was = me.hotels.monte_carlo.bossBeaten;
            me.hotels.monte_carlo.bossBeaten = false; const locked = hotelAccess(HOTELS.las_vegas);
            me.hotels.las_vegas = { highScore: 10, shifts: 2, best: {} }; const kept = hotelAccess(HOTELS.las_vegas);
            delete me.hotels.las_vegas; me.hotels.monte_carlo.bossBeaten = was; const open = hotelAccess(HOTELS.las_vegas);
            me.rank = 0; const lowRank = hotelAccess(HOTELS.las_vegas);
            return { locked: [locked.ok, String(locked.reason)], kept: kept.ok, open: open.ok, lowRank: lowRank.ok }; }''')
        ok &= check('next hotel locked until the boss is beaten', not gate['locked'][0] and 'Crown Prince' in gate['locked'][1], gate)
        ok &= check('hotels already played stay open', gate['kept'], gate)
        ok &= check('boss beaten + rank: open; rank still needed', gate['open'] and not gate['lowRank'], gate)

        # ---- ways to lose (driving the rules directly)
        await fresh(g)
        await g.js('() => { MCV.S.boss.stage = "herald"; bossHeliDone(false); }')
        ok &= check('missing the headliner loses', (await g.js(STAGE))['failed'] == 'heli')
        await fresh(g)
        res = await g.js('''() => { const B = MCV.S.boss; B.stage = 'surge'; const out = [];
            for (let k = 0; k < 3; k++) { bossLeak({ x: 100, y: 40 }); out.push([B.leaks, B.stage]); } return out; }''')
        ok &= check('two leaks allowed, the third loses', res[1] == [2, 'surge'] and res[2][1] == 'done' and (await g.js(STAGE))['failed'] == 'leaks', res)
        await fresh(g)
        await g.js('() => { MCV.S.boss.stage = "surge"; bossLeak({ boss: true, x: 100, y: 40 }); }')
        ok &= check('ignoring the Hummer loses', (await g.js(STAGE))['failed'] == 'hummer')
        await fresh(g)
        await g.js('() => { MCV.S.boss.stage = "mop"; MCV.S.boss.hummer = null; updateBoss(0.016); }')
        ok &= check('never greeting the Hummer loses at the end', (await g.js(STAGE))['failed'] == 'hummer')

        # ---- motorcade details
        await fresh(g)
        q = await g.js('''() => { const S = MCV.S, B = S.boss; spawnArrival('beater'); spawnArrival('beater');
            B.stage = 'motorcade'; B.spawnT = 0; updateBoss(0.016); const gg = S.guests.get(B.hummer);
            return { front: S.streetQueue[0] === gg.carId, patience: gg.patience, boss: gg.boss }; }''')
        ok &= check('the Hummer jumps the street queue', q['front'] and q['boss'], q)
        ok &= check('no fun events during the fight', not await g.js('() => eventCanStart("secretAgent")'))
        ok &= check('surge sets pace and mix', await g.js('''() => { MCV.S.boss.stage = 'surge'; MCV.S.boss.surgeEnd = MCV.S.t + 30;
            const iv = nextInterval(); return arrivalMix() === CONFIG.boss.surge.mix && iv >= 2.4 && iv <= 3.4; }'''))
        limos = await g.js('() => { const out = []; for (let k = 0; k < 60; k++) out.push(MCV.S.cars.get(spawnArrival("limo").carId).mi); return out; }')
        ok &= check('ordinary limos never roll the Hummer', await g.js('() => bossModel("limo")') not in limos)
        ok &= check('vehicle guide hides the boss model', await g.js('() => !guestModels("limo").includes(bossModel("limo"))'))

        # ---- the preview warns about the boss; a no-pad hotel skips the helicopter
        await fresh(g)
        pv = await g.js('() => { const i = MCV.S.boss.waveI; MCV.S.t = phaseStart(i - 1) + 1; return nextWavePreview(); }')
        ok &= check('break before the event previews the boss', pv and pv['boss'], pv)
        await fresh(g, 'las_vegas')
        await g.js('() => { MCV.S.t = MCV.S.boss.at; updateBoss(0.016); }')
        ok &= check('no helipad: straight to the motorcade', (await g.js(STAGE))['stage'] == 'motorcade')

        # ---- rematch button on the prep screen only once the boss has been reached
        btn = await g.js('''() => { UI.hotelSel = 'dubai'; goScreen('prep'); const before = SCREENS.prep.buttons().some(b => String(b.label) === 'Boss Rematch');
            activeChar().hotels.dubai = { highScore: 0, shifts: 1, best: {}, bossTries: 1 }; const after = SCREENS.prep.buttons().some(b => String(b.label) === 'Boss Rematch');
            return [before, after]; }''')
        ok &= check('rematch offered only after reaching the boss', btn == [False, True], btn)
        ok &= check('no page errors', not g.errors, g.errors[:3])
    sys.exit(0 if ok else 1)


run(main())
