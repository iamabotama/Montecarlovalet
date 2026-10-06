import asyncio, json
from playwright.async_api import async_playwright
BOT='''() => { window._bot=setInterval(()=>{ const S=MCV.S; if(!S||S.phase!=='play')return;
 for(const g of S.guests.values()){ const car=S.cars.get(g.carId);
  if(g.state==='curbDrop' && !S.jobs.some(j=>j.carId===car.id)){ if(g.tier==='limo'){MCV.enqueue({type:'greet',carId:car.id});continue;}
   let done=false; for(let l=0;l<6&&!done;l++) for(const s of ['west','east']) if(MCV.entryIndex(l,s,0)){ MCV.enqueue({type:'park',carId:car.id,lane:l,side:s}); g.claimed=true; done=true; break;} }
  if(g.state==='pickWait' && !S.jobs.some(j=>j.carId===car.id)) MCV.enqueue({type:'fetch',carId:car.id}); } }, 300); }'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/chromium')
        pg = await b.new_page(viewport={'width':1280,'height':720})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///home/ubuntu/repo/index.html'); await pg.wait_for_timeout(600)
        await pg.screenshot(path='/tmp/n_title.png'); await pg.evaluate('SAVE.tutorialSeen=true')
        await pg.mouse.click(640, 498); await pg.wait_for_timeout(300)
        await pg.evaluate(BOT); await pg.evaluate('MCV.DEBUG.scale=4')
        for i,secs in enumerate([10, 25, 30]):
            await pg.wait_for_timeout(secs*1000)
            st = await pg.evaluate('() => { const S=MCV.S; return {t:Math.round(S.t), money:S.money, heat:+S.heat.toFixed(1), phase:S.phase, angry:S.stats.angry, parked:S.stats.carsParked, board:[...S.guests.values()].filter(g=>g.ticket&&g.state!=="gone").length, guests:S.guests.size} }')
            print(st); await pg.screenshot(path=f'/tmp/n_game{i}.png')
        print('ERRORS', errs[:5]); await b.close()
asyncio.run(main())
