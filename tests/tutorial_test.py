import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/chromium')
        pg = await b.new_page(viewport={'width':1280,'height':720})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///home/ubuntu/repo/index.html'); await pg.wait_for_timeout(500)
        await pg.screenshot(path='/tmp/u_title.png')
        await pg.mouse.click(640, 548); await pg.wait_for_timeout(400)
        S = lambda e: pg.evaluate(e)
        last=-1
        for k in range(160):
            st = await S('() => ({i:TUT.i, on:TUT.on, t:TUT.t, until: !!TUT_STEPS[TUT.i].until, scr: UI.screen, tut: !!(MCV.S&&MCV.S.tutorial)})')
            if not st['on']: print('finished', st); break
            if st['i']!=last:
                await pg.wait_for_timeout(1300); await pg.screenshot(path=f'/tmp/u_step{st["i"]:02d}.png'); last=st['i']; print('step', st['i'])
            i=st['i']
            if not st['until']:
                if st['t']>0.6: await pg.mouse.click(640, 400)
            elif i==3:
                xy = await S('() => { const g=MCV.S.guests.get(TUT.g1); const c=MCV.S.cars.get(g.carId); return [c.x,c.y]; }'); await pg.mouse.click(xy[0]*4, xy[1]*4)
            elif i==5:
                await S("() => { if(!MCV.S.jobs.length && !MCV.S.valet.job && MCV.S.stats.carsParked<1){ const g=MCV.S.guests.get(TUT.g1); MCV.enqueue({type:'park',carId:g.carId,lane:0,side:'west'}); } }")
            elif i==7:
                await S("() => { const g=MCV.S.guests.get(TUT.limo); if(g&&g.state==='curbDrop'&&!MCV.S.jobs.length&&!MCV.S.valet.job) MCV.enqueue({type:'greet',carId:g.carId}); }")
            elif i in (11,14):
                await pg.mouse.click(270*4, 105*4)
            await pg.wait_for_timeout(500)
        await pg.wait_for_timeout(800); await pg.screenshot(path='/tmp/u_after.png')
        print(await S('() => ({scr:UI.screen, tut:MCV.S.tutorial, money:MCV.S.money, seen:SAVE.tutorialSeen})'))
        print('ERRORS', errs[:5]); await b.close()
asyncio.run(main())
