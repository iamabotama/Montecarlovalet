"""Every hotel loads, renders and survives ~10 sim-minutes of autopilot without errors."""
import sys
from harness import Game, run

HOTELS = ['monte_carlo', 'las_vegas', 'swiss_chalet', 'dubai']


async def main():
    failed = False
    for h in HOTELS:
        async with Game() as g:
            await g.start(h)
            await g.run(400)
            await g.shot(f'hotel_{h}_start')
            await g.bot(speed=8)
            await g.run(40000)  # ~5.3 sim-minutes at 8x
            await g.shot(f'hotel_{h}_busy')
            await g.run(40000)
            st = await g.state()
            await g.shot(f'hotel_{h}_late')
            ok = not g.errors and st['parked'] >= 5  # the bot is crude at 8x; this checks stability, not skill
            failed |= not ok
            print('OK ' if ok else 'FAIL', st, g.errors[:3])
    sys.exit(1 if failed else 0)


run(main())
