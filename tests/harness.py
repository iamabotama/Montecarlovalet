"""Shared Playwright harness for the browser tests.

Usage:  async with Game() as g: await g.start('dubai'); await g.bot(); await g.run(30) ...
Tests drive the game through window.MCV + the global functions (classic scripts), not screen coordinates,
so menu layout changes don't break them. Screenshots go to /tmp/mcv_*.png.
"""
import asyncio, os
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file://' + os.path.join(ROOT, 'index.html')
CHROME = '/usr/bin/chromium' if os.path.exists('/usr/bin/chromium') else None

# Simple autopilot: parks every curb car in the first open lane end, greets limos, fetches every ticket,
# meets helicopters, round-robins jobs across the crew.
BOT_JS = '''() => { window._rr = 0; clearInterval(window._bot); window._bot = setInterval(() => { const S = MCV.S; if (!S || S.phase !== 'play') return;
  const pickW = () => { const ws = workers().filter(w => !w.leaving); S.activeW = ws[(window._rr++) % ws.length].id; };
  if (S.heli && S.heli.phase === 'incoming' && !heliJob()) { pickW(); enqueue({ type: 'heli' }); }
  for (const g of S.guests.values()) { const car = S.cars.get(g.carId); if (!car) continue;
    if (g.state === 'curbDrop' && !S.jobs.some(j => j.carId === car.id)) { pickW();
      if (g.tier === 'limo') { enqueue({ type: 'greet', carId: car.id }); continue; }
      let done = false; for (let l = 0; l < NL && !done; l++) for (const s of LOT_SIDES) if (entryIndex(l, s, pendingParks(l, s))) { enqueue({ type: 'park', carId: car.id, lane: l, side: s }); g.claimed = true; done = true; break; } }
    if (g.state === 'pickWait' && !S.jobs.some(j => j.carId === car.id)) { pickW(); enqueue({ type: 'fetch', carId: car.id }); } } }, 250); }'''

STATE_JS = '''() => { const S = MCV.S; return { hotel: HOTEL.id, t: Math.round(S.t), money: Math.round(S.money), heat: +S.heat.toFixed(1), phase: S.phase,
  parked: S.stats.carsParked, angry: S.stats.angry, heliMet: S.stats.heliMet, heliMissed: S.stats.heliMissed, stalls: NL * NS, sides: LOT_SIDES.join('+') }; }'''


class Game:
    def __init__(self, viewport=(1280, 720), save=None):
        self.viewport, self.save, self.errors = viewport, save, []

    async def __aenter__(self):
        self._p = await async_playwright().start()
        self.browser = await self._p.chromium.launch(executable_path=CHROME)
        self.page = await self.browser.new_page(viewport={'width': self.viewport[0], 'height': self.viewport[1]})
        self.page.on('pageerror', lambda e: self.errors.append(str(e) + ' @ ' + (e.stack or '').split(chr(10))[1:3].__str__()))
        self.page.on('console', lambda m: m.type == 'error' and self.errors.append(m.text))
        if self.save is not None:  # seed localStorage before boot
            await self.page.goto(URL)
            await self.page.evaluate('s => localStorage.setItem("mcvalet.save", JSON.stringify(s))', self.save)
        await self.page.goto(URL)
        await self.page.wait_for_function('() => !!window.MCV', timeout=10000)  # boot waits for the pixel font
        await self.page.wait_for_timeout(300)
        return self

    async def __aexit__(self, *a):
        await self.browser.close()
        await self._p.stop()

    async def js(self, code, arg=None):
        return await self.page.evaluate(code, arg) if arg is not None else await self.page.evaluate(code)

    async def start(self, hotel='monte_carlo'):
        await self.js('h => { SAVE.tutorialSeen = true; startGame(h); }', hotel)

    async def bot(self, speed=4):
        await self.js(BOT_JS)
        await self.js(f'MCV.DEBUG.scale = {speed}')

    async def run(self, ms):
        await self.page.wait_for_timeout(ms)

    async def state(self):
        return await self.js(STATE_JS)

    async def shot(self, name):
        await self.page.screenshot(path=f'/tmp/mcv_{name}.png')

    async def tap(self, gx, gy):  # tap in game coordinates (320x180 grid)
        box = await self.page.evaluate('() => { const r = cv.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; }')
        await self.page.mouse.click(box[0] + gx / 320 * box[2], box[1] + gy / 180 * box[3])


def run(coro):
    asyncio.run(coro)


FRAME = 120


async def tour(g, shots=None, hotels=('monte_carlo', 'dubai'), busy=12):
    """Visit every screen and page, every tutorial step and busy shifts (HUD, board, bubbles, crew,
    helicopter, banners, toasts), then the fired summary and a promotion. Used by the text tests."""
    for scr in ['title', 'settings', 'language', 'howto', 'hotels', 'prep']:
        await g.js(f"() => goScreen('{scr}')"); await g.run(FRAME)
        if scr == 'howto':
            for p in range(1, await g.js('() => HOWTO.length')):
                await g.js(f'() => {{ UI.howPage = {p}; }}'); await g.run(FRAME)
    await g.js("() => goScreen('guide')")
    for p in range(await g.js('() => GUIDE_PAGES.length')):
        await g.js(f'() => {{ UI.guidePage = {p}; }}'); await g.run(FRAME)
    if shots:
        await g.shot(shots + '_guide')
    await g.js('() => startTutorial()'); await g.run(400)
    for i in range(await g.js('() => TUT_STEPS.length')):
        await g.js(f'() => {{ TUT.i = {i}; TUT.t = 5; }}'); await g.run(FRAME)
    await g.js('() => { TUT.on = false; MCV.S.tutorial = false; }')
    for hotel in hotels:
        await g.start(hotel)
        await g.js('() => { const S = MCV.S; S.money = 5000; }')
        await g.bot(speed=14)
        for _ in range(busy):
            await g.run(900)
            await g.js('() => { try { if (MCV.S.helpers.length < 2) hireValet(); } catch (e) {} if (MCV.S.heat > 60) MCV.S.heat = 20; }')
        await g.js('() => { UI.paused = true; }'); await g.run(FRAME); await g.js('() => { UI.paused = false; }')
    if shots:
        await g.shot(shots + '_game')
    await g.js('() => fire()'); await g.run(4500)
    await g.js("() => { if (!RESULT) finishRun(); goScreen('summary'); }"); await g.run(300)
    if shots:
        await g.shot(shots + '_summary')
    await g.js("() => { RESULT.promotions = RESULT.promotions.length ? RESULT.promotions : [1]; goScreen('promotion'); }")
    await g.run(FRAME)
