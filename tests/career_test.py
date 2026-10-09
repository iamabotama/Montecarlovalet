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
        c0 = s['chars'][0]
        check('migrated to v3 (career on character 0)', s['version'] == 3 and c0['xp'] == 900 and c0['hotels']['monte_carlo']['highScore'] == 432
              and s['tutorialSeen'] and c0['look']['uniform'] == 'red' and 'careerXP' not in s, c0)
        check('rank synced', c0['rank'] == 0)
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
        res = await g.js('() => ({ xp: RESULT.xp, promos: RESULT.promotions, rank: activeChar().rank, jobs: SAVE.roster[0].jobs })')
        check('promoted to Valet (rank 1)', scr == 'promotion' and res['promos'] == [1] and res['rank'] == 1, res)
        check('roster banked jobs', res['jobs'] == 7, res)
        await g.shot('c_promotion')
        await g.tap(160, 166)
        await g.run(300)
        check('summary after promotion', await g.js('UI.screen') == 'summary')
        aw = await g.js('() => ({ awards: RESULT.awards, streak: RESULT.streak, unseen: activeChar().awardsUnseen })')
        check('awards earned for the first full night', 'firstShift' in aw['awards'] and 'fullNight' in aw['awards'] and aw['unseen'] == len(aw['awards']), aw)
        check('streak day 1', aw['streak'] == 1, aw)
        check('2 stars for completing the night', await g.js('() => [RESULT.stars, hotelStars("monte_carlo")]') == [2, 2])
        await g.shot('c_summary')
        acc = await g.js("() => regularHotels().map(id => hotelAccess(HOTELS[id]).ok)")
        check('vegas unlocked at Valet', acc[:2] == [True, True], acc)
        await g.js("goScreen('hotels')")
        await g.run(200)
        await g.shot('c_hotels_valet')
        await g.js("goScreen('title')")
        await g.run(200)
        await g.shot('c_title_career_new')
        await g.js("goScreen('career')")
        await g.run(200)
        await g.shot('c_career_wall')
        await g.tap(8 + 1 * 28 + 13, 46 + 13)
        await g.run(100)
        check('career wall opened clears NEW', await g.js('() => [activeChar().awardsUnseen, UI.awardSel]') == [0, 1])
        await g.shot('c_career_detail')
        # persisted across reload
        await g.page.reload()
        await g.run(500)
        s = await g.js('() => SAVE')
        c0 = s['chars'][0]
        check('save persisted', c0['rank'] == 1 and c0['totals']['shifts'] == 1 and len(s['roster']) == 1 and c0['awards'].get('firstShift'), c0['totals'])
        check('no page errors', not g.errors, g.errors[:3])
    sys.exit(0 if all(checks) else 1)


run(main())
