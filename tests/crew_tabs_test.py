"""Valet number buttons (ui/crew_panel.js): one per crew slot, tap selects that valet, Tab cycles."""
import sys
from harness import Game, run


async def main():
    fails = []
    async with Game() as g:
        await g.start('monte_carlo')
        r = await g.js('''() => { MCV.S.money = 1000; hireValet(); hireValet();
            const tabs = crewTabs().map(b => b.w ? b.w.id : null);
            const b = crewTabs()[2]; dispatch(currentTargets(), b.x + 2, b.y + 4); const tapped = MCV.S.activeW;
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' })); const tabbed = MCV.S.activeW;
            return { tabs, tapped, tabbed, ids: workers().map(w => w.id) }; }''')
        ids = r['ids']
        ok = len(ids) == 3 and r['tabs'][:3] == ids and r['tabs'][3] is None and r['tapped'] == ids[2] and r['tabbed'] == ids[0]
        print('OK  ' if ok else 'FAIL', 'buttons, tap and Tab select valets', r)
        if not ok:
            fails.append(1)
        await g.run(1500)
        await g.shot('crew_tabs')
        if g.errors:
            fails.append(1)
        print('errors', g.errors[:3])
    print('FAILED' if fails else 'PASS')
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    run(main())
