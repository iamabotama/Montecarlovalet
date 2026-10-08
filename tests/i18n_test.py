"""Every word on screen must come from a language table. Installs a fake language 'xx' where each English
string is wrapped in [brackets], visits every screen, the tutorial and a busy shift, records everything
drawText() draws, and fails if letters appear outside brackets (except names that are the same in every
language: car models, valet names, lane/stall codes). Also checks switching back to English."""
import sys
from harness import Game, run

PSEUDO_JS = r'''() => {
  const src = LANGS.en.table, xx = {};
  // bracket every word (so wrapped lines stay bracketed) but leave {placeholders} bare: values the code
  // fills in must be bracketed themselves, i.e. come from the table too
  const wrap = s => s.split(' ').map(w => w.replace(/(\{\w+\})|([^{}]+)/g, (m, ph, txt) => ph || '[' + txt + ']')).join(' ');
  for (const [k, v] of Object.entries(src)) xx[k] = Array.isArray(v) ? v.map(wrap) : wrap(v);
  defineLanguage('xx', 'Brackets', xx); setLanguage('xx');
  window._drawn = new Set(); const orig = window.drawText;
  window.drawText = function (c, s, ...rest) { window._drawn.add(String(s)); return orig(c, s, ...rest); };
}'''
SAME_EVERYWHERE_JS = '''() => { const w = new Set(CONFIG.helpers ? [] : []);
  for (const t of Object.values(MODELS)) for (const m of t) for (const p of m[0].split(/[ -]/)) w.add(p);
  for (const n of CONFIG.roster ? CONFIG.roster.names : []) w.add(n);
  for (const n of (CONFIG.crew && CONFIG.crew.names) || []) w.add(n);
  return [...w]; }'''
FRAME = 120

def leaks(drawn, allowed):
    import re
    out = []
    for s in drawn:
        r = s
        while True:  # strip bracketed text, innermost first
            r2 = re.sub(r'\[[^\[\]]*\]', ' ', r)
            if r2 == r:
                break
            r = r2
        for tok in re.findall(r"[A-Za-z][A-Za-z'.]*\d*", r):
            if tok in allowed or re.fullmatch(r'[A-J]\d{0,2}|T\d|D\d|[A-Z]|M?\d*', tok):
                continue
            out.append(s)
            break
    return sorted(set(out))

async def main():
    ok = True
    async with Game() as g:
        allowed = set(await g.js(SAME_EVERYWHERE_JS))
        names = await g.js("() => { const out = []; (function walk(o, d) { if (d > 3 || !o || typeof o !== 'object') return; for (const [k, v] of Object.entries(o)) { if (k === 'names' && Array.isArray(v)) out.push(...v); else walk(v, d + 1); } })(CONFIG, 0); return out; }")
        allowed |= set(names)
        await g.js(PSEUDO_JS)
        allowed |= set(await g.js('() => languageList().map(l => l.name)'))  # each language names itself
        for scr in ['title', 'settings', 'howto', 'hotels', 'prep']:
            await g.js(f"() => goScreen('{scr}')"); await g.run(FRAME)
            if scr == 'howto':
                for p in range(1, await g.js('() => HOWTO.length')):
                    await g.js(f'() => {{ UI.howPage = {p}; }}'); await g.run(FRAME)
        await g.js("() => goScreen('guide')")
        for p in range(await g.js('() => GUIDE_PAGES.length')):
            await g.js(f'() => {{ UI.guidePage = {p}; }}'); await g.run(FRAME)
        await g.shot('i18n_guide')
        # tutorial: render every step
        await g.js('() => startTutorial()'); await g.run(400)
        n = await g.js('() => TUT_STEPS.length')
        for i in range(n):
            await g.js(f'() => {{ TUT.i = {i}; TUT.t = 5; }}'); await g.run(FRAME)
        await g.js('() => { TUT.on = false; MCV.S.tutorial = false; }')
        # a busy shift on every hotel: HUD, board, bubbles, crew, helicopter, banners, toasts
        for hotel in ['monte_carlo', 'dubai']:
            await g.start(hotel)
            await g.js('() => { const S = MCV.S; S.money = 5000; }')
            await g.bot(speed=14)
            for _ in range(12):
                await g.run(900)
                await g.js('() => { try { if (MCV.S.helpers.length < 2) hireValet(); } catch (e) {} if (MCV.S.heat > 60) MCV.S.heat = 20; }')
            await g.js('() => { UI.paused = true; }'); await g.run(FRAME); await g.js('() => { UI.paused = false; }')
        await g.shot('i18n_game')
        await g.js('() => fire()'); await g.run(4500)
        await g.js("() => { if (!RESULT) finishRun(); goScreen('summary'); }"); await g.run(300)
        await g.shot('i18n_summary')
        await g.js("() => { RESULT.promotions = RESULT.promotions.length ? RESULT.promotions : [1]; goScreen('promotion'); }"); await g.run(FRAME)
        drawn = await g.js('() => [...window._drawn]')
        bad = leaks(drawn, allowed)
        print(f'drawn strings: {len(drawn)}, bracketed: {sum("[" in s for s in drawn)}')
        if bad:
            ok = False
            print('FAIL text not from the language table:', bad[:40])
        else:
            print('OK   all drawn text comes from the language table')
        # switching back to English changes lazy data text too
        back = await g.js("() => { setLanguage('en'); return [String(HOTELS.monte_carlo.name), String(POWER_INFO.bribe.name), t('nope.missing')]; }")
        good = back == ['Hotel Monte Carlo', 'Bribe', 'nope.missing']
        print(('OK   ' if good else 'FAIL ') + 'switch back to English', back)
        ok &= good
        # the Settings language button cycles languages and remembers the choice
        cyc = await g.js("() => { goScreen('settings'); const b = SCREENS.settings.buttons().find(b => String(b.label).startsWith('Language')); b.fn(); return [I18N.code, SAVE.lang, JSON.parse(localStorage.getItem(CONFIG.career.saveKey)).lang]; }")
        good = cyc == ['xx', 'xx', 'xx']
        print(('OK   ' if good else 'FAIL ') + 'settings language button', cyc)
        ok &= good
        if g.errors:
            ok = False
            print('FAIL page errors', g.errors[:5])
    print('PASS' if ok else 'FAILED')
    sys.exit(0 if ok else 1)

run(main())
