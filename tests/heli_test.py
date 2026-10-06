import asyncio
from playwright.async_api import async_playwright
async def run(meet):
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/chromium'); pg = await b.new_page(viewport={'width':1280,'height':720})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///home/ubuntu/repo/index.html'); await pg.wait_for_timeout(400)
        await pg.evaluate('SAVE.tutorialSeen=true'); await pg.mouse.click(640, 498); await pg.wait_for_timeout(300)
        await pg.evaluate('MCV.S.heli.at = MCV.S.t + 1')
        await pg.wait_for_timeout(3500)
        tag = 'met' if meet else 'miss'
        await pg.screenshot(path=f'/tmp/h_{tag}_incoming.png')
        if meet:
            await pg.mouse.click(190*4, 148*4); await pg.wait_for_timeout(200)
            print('jobs', await pg.evaluate("MCV.S.jobs.map(j=>j.type+(j.worker?'*':''))"))
        await pg.wait_for_timeout(4500)
        await pg.screenshot(path=f'/tmp/h_{tag}_landed.png')
        await pg.wait_for_timeout(9000 if not meet else 3000)
        await pg.screenshot(path=f'/tmp/h_{tag}_after.png')
        print(tag, await pg.evaluate("() => { const S=MCV.S; return {phase:S.heli.phase, ok:S.heli.ok, money:S.money, heat:+S.heat.toFixed(1), stat:S.stats.heli, valet:S.valet.loc.t, jobs:S.jobs.length} }"))
        print('ERRORS', errs[:5]); await b.close()
async def main():
    await run(True); await run(False)
asyncio.run(main())
