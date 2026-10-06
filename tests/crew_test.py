import asyncio
from playwright.async_api import async_playwright
BOT='''() => { window._rr=0; window._done={}; window._bot=setInterval(()=>{ const S=MCV.S; if(!S||S.phase!=='play')return;
 for(const w of workers()) if(w.job) _done[w.id]=(_done[w.id]||0)+0; 
 for(const g of S.guests.values()){ const car=S.cars.get(g.carId);
  const pick=()=>{ const ws=workers().filter(w=>!w.leaving); S.activeW=ws[(_rr++)%ws.length].id; };
  if(g.state==='curbDrop' && !S.jobs.some(j=>j.carId===car.id)){ pick(); if(g.tier==='limo'){enqueue({type:'greet',carId:car.id});continue;}
   let done=false; for(let l=0;l<6&&!done;l++) for(const s of ['west','east']) if(entryIndex(l,s,pendingParks(l,s))){ enqueue({type:'park',carId:car.id,lane:l,side:s}); g.claimed=true; done=true; break;} }
  if(g.state==='pickWait' && !S.jobs.some(j=>j.carId===car.id)) { pick(); enqueue({type:'fetch',carId:car.id}); } } }, 250);
 const orig=endJob; window.endJob=endJob; }'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/chromium'); pg = await b.new_page(viewport={'width':1280,'height':720})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///home/ubuntu/repo/index.html'); await pg.wait_for_timeout(400)
        await pg.evaluate('SAVE.tutorialSeen=true'); await pg.mouse.click(640, 498); await pg.wait_for_timeout(300)
        await pg.evaluate('MCV.S.money=1000')
        await pg.mouse.click(16*4, 146*4); await pg.wait_for_timeout(1500)
        await pg.evaluate('MCV.S.activeW=0'); await pg.mouse.click(16*4, 146*4); await pg.wait_for_timeout(1500)
        print(await pg.evaluate('() => ({helpers: MCV.S.helpers.length, money: MCV.S.money, active: MCV.S.activeW})'))
        await pg.screenshot(path='/tmp/c0.png')
        await pg.evaluate(BOT); await pg.evaluate('MCV.DEBUG.scale=4')
        # count jobs per worker via JOBLOG wrapper
        await pg.evaluate("() => { window._per={}; setInterval(()=>{ for(const w of workers()) if(w.job) window._per[w.id]=(window._per[w.id]||0)+1; }, 200); }")
        for i in range(3):
            await pg.wait_for_timeout(15000)
            print(await pg.evaluate('() => { const S=MCV.S; return {t:Math.round(S.t), money:S.money, wages:S.stats.wages, heat:+S.heat.toFixed(1), parked:S.stats.carsParked, angry:S.stats.angry, busyTicks:window._per, jobs:S.jobs.map(j=>j.type[0]+j.wid+(j.worker?"*":"")+(j.waitMsg?"!":"")).join(" ")} }'))
            await pg.screenshot(path=f'/tmp/c{i+1}.png')
        # tap helper 2 to select, then send home
        xy = await pg.evaluate('() => { const w=MCV.S.helpers[0]; return [w.x+(w.off||0), w.y-4, !!w.job]; }')
        print('helper pos', xy)
        await pg.evaluate("clearInterval(window._bot)"); await pg.wait_for_timeout(8000)
        xy = await pg.evaluate('() => { const w=MCV.S.helpers[0]; return [w.x+(w.off||0), w.y-4, !!w.job]; }')
        await pg.mouse.click(xy[0]*4, xy[1]*4); await pg.wait_for_timeout(300)
        print('active after tap', await pg.evaluate('MCV.S.activeW'))
        await pg.screenshot(path='/tmp/c4.png')
        await pg.mouse.click(16*4, 146*4); await pg.wait_for_timeout(3000)
        print(await pg.evaluate('() => ({helpers: MCV.S.helpers.length, active: MCV.S.activeW})'))
        print('ERRORS', errs[:5]); await b.close()
asyncio.run(main())
