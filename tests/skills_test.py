"""Skill tree: points per promotion, branch order, reset refund, and each perk reaching the shift via S.perks."""
import sys
from harness import Game, run

SAVE = {'version': 3, 'tutorialSeen': True}
checks = []


def check(name, ok, info=''):
    checks.append(ok)
    print('OK  ' if ok else 'FAIL', name, info)


async def main():
    async with Game(save=SAVE) as g:
        await g.js('() => { activeChar().rank = 3; activeChar().skills = {}; }')
        check('3 points at rank 3', await g.js('skillPoints()') == 3)
        check('tier 2 needs tier 1', await g.js("skillBlock('fastHands')") == 'needsPrev')
        await g.js("goScreen('title')")
        await g.run(200)
        await g.shot('skills_title')
        await g.js("goScreen('career')")
        await g.run(200)
        await g.tap(168 + 48, 168)  # Skills button
        await g.run(200)
        check('skills screen opens from career', await g.js('UI.screen') == 'skills')
        await g.tap(8 + 48, 44 + 10)  # Quick Feet node
        await g.tap(216 + 48, 168)  # Learn
        await g.run(200)
        check('learn by tapping', await g.js("ownsSkill('quickFeet') && skillPoints() === 2"))
        for sid in ['fastHands', 'smoothTalker']:
            await g.js(f"learnSkill('{sid}')")
        check('no points left', await g.js('skillPoints()') == 0)
        check('cannot overspend', await g.js("learnSkill('goodHire')") is False)
        await g.js("UI.skillSel = SKILLS.findIndex(s => s.id === 'secondWind')")
        await g.run(200)
        await g.shot('skills_screen')
        await g.tap(112 + 48, 168)  # Reset
        check('reset refunds all', await g.js('skillPoints() === 3 && skillsOwned() === 0'))

        # every perk on: snapshot reaches the shift
        await g.js('() => { activeChar().rank = 5; for (const s of SKILLS) activeChar().skills[s.id] = true; }')
        await g.js("startGame('monte_carlo', { goals: [], loadout: [] })")
        await g.run(300)
        p = await g.js('MCV.S.perks')
        check('perks snapshot has all keys', all(k in p for k in ['walk', 'handle', 'secondWind', 'patience',
              'whalePatience', 'freeComps', 'helperDiscount', 'heatCool', 'lotSense']), sorted(p))
        r = await g.js("""() => ({
          walk: valetWalkRate(), pat: perkPatience('standard'), whale: perkPatience('whale'),
          wage: helperWage({ jobs: 0 }), base: memberWage({ jobs: 0 }), comp: compPrice('room'),
        })""")
        check('helpers $20 cheaper', r['base'] - r['wage'] == 20, r)
        check('walk 10% faster', abs(r['walk'] - 1.1) < 1e-6, r)
        check('patience boosts', abs(r['pat'] - 1 / 0.9) < 1e-6 and abs(r['whale'] - 1 / 0.9 / 0.8) < 1e-6, r)
        check('first comp free', r['comp'] == 0, r)
        heat = await g.js('() => { MCV.S.heat = 50; coolHeat(10); return MCV.S.heat; }')
        check("manager's pet cools 15% more", abs(heat - 38.5) < 1e-6, heat)
        sel = None
        for _ in range(40):
            sel = await g.js('''() => {
              for (const car of MCV.S.cars.values()) {
                const gu = MCV.S.guests.get(car.guestId);
                if (car.loc.t === 'curb' && gu && gu.state === 'curbDrop' && gu.tier !== 'limo') {
                  MCV.S.selected = { carId: car.id, bags: false };
                  const b = fastestStall(selectionOptions().stalls);
                  return b ? b.est : null;
                }
              }
              return null; }''')
            if sel is not None:
                break
            await g.run(500)
        await g.run(100)
        await g.shot('skills_lotsense')
        check('lot sense finds a fastest stall', sel is not None, sel)
        await g.js('() => { MCV.S.selected = null; }')
        await g.bot()
        await g.run(30000)
        check('second wind claimed in play', await g.js('workers().some(w => w.windWave !== undefined)'))
        check('no page errors', not g.errors, g.errors[:3])
    sys.exit(0 if all(checks) else 1)


run(main())
