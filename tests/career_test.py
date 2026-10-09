"""Career flow: v1 save migrates, title -> hotels -> prep -> shift -> promotion -> summary, locks, roster, goals."""
import sys
from harness import Game, run

V1_SAVE = {'version': 1, 'careerXP': 900, 'rank': 0, 'highScore': 432, 'bestStats': {'biggestTip': 120},
           'tutorialSeen': True, 'muted': True, 'cosmetic': {'uniform': 'red', 'nametag': 'none'}}
checks = []


def check(name, ok, info=''):
    checks.append(ok)
    print('OK  ' if ok else 'FAIL', name, info)


async def main():
    async with Game(save=V1_SAVE) as g:
        s = await g.js('() => SAVE')
        check('migrated to v2', s['version'] == 2 and s['careerXP'] == 900 and s['hotels']['monte_carlo']['highScore'] == 432, s['hotels'])
        check('rank synced', s['rank'] == 0)
        await g.shot('c_title')
        await g.js("goScreen('hotels')")
        await g.run(200)
        await g.shot('c_hotels_locked')
        acc = await g.js("() => regularHotels().map(id => hotelAccess(HOTELS[id]).ok)")
        check('only monte carlo open at rookie', acc == [True, False, False, False], acc)
        check('hotel order', await g.js('regularHotels()') == ['monte_carlo', 'las_vegas', 'dubai', 'swiss_chalet'])
        # tap a locked card: selection must not change
        await g.tap(6 + 78 * 2 + 30, 60)
        check('locked card not selectable', await g.js('UI.hotelSel') == 'monte_carlo')
        await g.tap(260, 166)  # NEXT >
        await g.run(200)
        check('prep screen', await g.js('UI.screen') == 'prep')
        prep = await g.js('() => ({ goals: UI.prep.goals.length, loadout: UI.prep.loadout, picks: loadoutPicks() })')
        check('3 goals drawn, 2 picks', prep['goals'] == 3 and prep['picks'] == 2, prep)
        await g.shot('c_prep')
        await g.tap(260, 166)  # START SHIFT
        await g.run(300)
        st = await g.js('() => ({ scr: UI.screen, hotel: HOTEL.id, goals: MCV.S.goals.length, cards: MCV.S.cards.map(c => c.type) })')
        check('shift started with loadout + goals', st['scr'] == 'game' and st['goals'] == 3, st)
        # hire a crew member -> roster entry
        await g.js("() => { MCV.S.money = 500; hireValet(); }")
        r = await g.js('() => ({ roster: SAVE.roster, name: MCV.S.helpers[0].name })')
        check('roster member enlisted', len(r['roster']) == 1 and r['name'] == r['roster'][0]['name'], r)
        await g.js("() => { MCV.S.helpers[0].jobsDone = 7; MCV.S.stats.tips = 150; MCV.S.money = 200; }")
        # pause shows goals panel
        await g.js('UI.paused = true')
        await g.run(200)
        await g.shot('c_paused_goals')
        await g.js('UI.paused = false')
        await g.js('completeShift()')
        await g.run(4000)
        scr = await g.js('UI.screen')
        res = await g.js('() => ({ xp: RESULT.xp, promos: RESULT.promotions, rank: SAVE.rank, jobs: SAVE.roster[0].jobs })')
        check('promoted to Valet (rank 1)', scr == 'promotion' and res['promos'] == [1] and res['rank'] == 1, res)
        check('roster banked jobs', res['jobs'] == 7, res)
        await g.shot('c_promotion')
        await g.tap(160, 166)
        await g.run(300)
        check('summary after promotion', await g.js('UI.screen') == 'summary')
        check('2 stars for completing the night', await g.js('() => [RESULT.stars, hotelStars("monte_carlo")]') == [2, 2])
        await g.shot('c_summary')
        acc = await g.js("() => regularHotels().map(id => hotelAccess(HOTELS[id]).ok)")
        check('vegas unlocked at Valet', acc[:2] == [True, True], acc)
        await g.js("goScreen('hotels')")
        await g.run(200)
        await g.shot('c_hotels_valet')
        # persisted across reload
        await g.page.reload()
        await g.run(500)
        s = await g.js('() => SAVE')
        check('save persisted', s['rank'] == 1 and s['totals']['shifts'] == 1 and len(s['roster']) == 1, s['totals'])
        check('no page errors', not g.errors, g.errors[:3])
    sys.exit(0 if all(checks) else 1)


run(main())
