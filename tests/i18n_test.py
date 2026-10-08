"""Every word on screen must come from a language table. Installs a fake language 'xx' where each English
string is wrapped in [brackets], visits every screen, the tutorial and a busy shift, records everything
drawText() draws, and fails if letters appear outside brackets (except names that are the same in every
language: car models, valet names, lane/stall codes). Also checks switching back to English."""
import sys
from harness import Game, run, tour

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
        # each language names itself, and the menu adds "/ Language" so anyone can find the picker
        import re
        for n in await g.js('() => languageList().map(l => l.name)') + ['Language']:
            allowed |= set(re.findall(r"[A-Za-z][A-Za-z'.]*\d*", n))
        await tour(g, shots='i18n')
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
        # the Language screen picks a language and remembers it; 'Device language' forgets the choice
        cyc = await g.js('''() => { goScreen('language'); const pick = c => SCREENS.language.buttons().find(b => b.lang === c).fn();
          pick('xx'); const a = [I18N.code, SAVE.lang, JSON.parse(localStorage.getItem(CONFIG.career.saveKey)).lang];
          SCREENS.language.buttons()[0].fn(); return a.concat([SAVE.lang, I18N.code]); }''')
        good = cyc == ['xx', 'xx', 'xx', None, 'en']
        print(('OK   ' if good else 'FAIL ') + 'language screen', cyc)
        ok &= good
        if g.errors:
            ok = False
            print('FAIL page errors', g.errors[:5])
    print('PASS' if ok else 'FAILED')
    sys.exit(0 if ok else 1)

run(main())
