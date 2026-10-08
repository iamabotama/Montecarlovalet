"""Does every language fit? For each language (or those named: python3 layout_test.py de ru), tour every
screen and record three things English must already pass:
  overflow  text wider than its slot (buttons, crew panel, hotel cards: drawText opt.maxW)
  offscreen text running past the 320px screen edge
  overlap   two different strings drawn on top of each other in the same frame
Overlaps are compared with English (same screen + same anchor points), so only new ones count. In the
moving world area (people tags, speech bubbles, floaters) overlaps are expected and ignored.
Each problem is mapped back to its language key(s). --limits writes the tightest length each offending
key may use into tools/i18n_limits.json, which tools/translate.py respects when re-drafting:
  python3 tests/layout_test.py --limits && python3 tools/translate.py de --redo <keys>
"""
import json, math, os, re, subprocess, sys
from harness import Game, run, tour

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIMITS = os.path.join(ROOT, 'tools', 'i18n_limits.json')

PROBE_JS = r'''() => {
  const L = (window._layout = { frame: -1, boxes: [], pairs: {}, offscreen: {} });
  const orig = window.drawText;
  // only static UI counts in the game screen: HUD rows, board, crew panel, centred banners/toasts
  const staticSpot = (x, y) => UI.screen !== 'game' || y < 20 || y >= 168 || x >= 220 || x <= 32 || x === 160;
  window.drawText = function (c, s, x, y, color, opt = {}) {
    const w = orig(c, s, x, y, color, opt);
    s = String(s);
    if (!s.trim() || opt.shadow || !staticSpot(x, y)) return w;
    if (L.frame !== UI.t) { L.frame = UI.t; L.boxes = []; }
    const sc = opt.scale || 1;
    const x0 = opt.align === 'center' ? Math.round(x - Math.floor(w / 2)) : opt.align === 'right' ? Math.round(x - w) : Math.round(x);
    const b = { s, x0, x1: x0 + w, y0: y, y1: y + 5 * sc, at: Math.round(x) + ',' + Math.round(y) };
    if (b.x0 < -0.5 || b.x1 > 320.5) L.offscreen[UI.screen + '|' + b.at] = s;
    for (const o of L.boxes) {
      if (o.s === s) continue;
      const ox = Math.min(o.x1, b.x1) - Math.max(o.x0, b.x0), oy = Math.min(o.y1, b.y1) - Math.max(o.y0, b.y0);
      if (ox > 0.6 && oy > 0.6) L.pairs[UI.screen + '|' + [o.at, b.at].sort().join('|')] = [o.s, s];
    }
    L.boxes.push(b);
    return w;
  };
}'''


def node_tables():
    js = ("const out={};global.defineLanguage=(c,n,t)=>{out[c]=t};"
          "for(const f of require('fs').readdirSync(process.argv[1]))if(f!=='i18n.js'&&f.endsWith('.js'))require(process.argv[1]+'/'+f);"
          "process.stdout.write(JSON.stringify(out));")
    return json.loads(subprocess.check_output(['node', '-e', js, os.path.join(ROOT, 'js', 'i18n')]))


def keys_for(s, table):
    """Which keys could have produced the drawn string s (a whole value, a filled template, or one wrapped line)."""
    found = []
    for k, v in table.items():
        for val in (v if isinstance(v, list) else [v]):
            if len(re.sub(r'\{\w+\}|\W', '', val)) < 3:  # mostly placeholders (clock, prices): matches anything
                continue
            pat = re.escape(val)
            pat = re.sub(r'\\\{\w+\\\}', '.*?', pat)
            if re.fullmatch(pat, s) or (len(s) > 6 and s in re.sub(r'\{\w+\}', '', val)):
                found.append(k)
                break
    return found


async def check(g, code):
    # same fresh career for every language, so screens are comparable with English
    await g.js(f"() => {{ SAVE = defaultSave(); SAVE.tutorialSeen = true; applyLanguage({json.dumps(code)}); TEXT_OVERFLOW.clear(); }}")
    await g.js(PROBE_JS)
    await tour(g, busy=6)
    r = await g.js('() => ({ pairs: window._layout.pairs, offscreen: window._layout.offscreen, '
                   'overflow: [...TEXT_OVERFLOW].map(([s, o]) => [s, o.w, o.maxW]) })')
    return r


async def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    tables = node_tables()
    codes = args or [c for c in tables if c != 'en']
    out, ok = {}, True
    async with Game() as g:
        base = await check(g, 'en')
        if base['overflow']:
            print('note: English itself overflows', base['overflow'][:5])
        for code in codes:
            r = await check(g, code)
            T = tables[code]
            probs = []
            for s, w, mx in r['overflow']:
                probs.append(('overflow', s, keys_for(s, T), math.floor((mx + 1) / 4)))
            for at, s in r['offscreen'].items():
                if at not in base['offscreen']:
                    probs.append(('offscreen', s, keys_for(s, T), None))
            for at, (a, b) in r['pairs'].items():
                if at not in base['pairs']:
                    probs.append(('overlap', a + '  <>  ' + b, keys_for(a, T) + keys_for(b, T), None))
            out[code] = probs
            print(f'{code}: {"OK" if not probs else str(len(probs)) + " problem(s)"}')
            for kind, s, ks, lim in probs:
                print(f'   {kind:9} {s[:90]!r} keys={ks}' + (f' max={lim}' if lim else ''))
            ok &= not probs
        if g.errors:
            ok = False
            print('page errors', g.errors[:5])
    if '--limits' in sys.argv:
        lim = json.load(open(LIMITS)) if os.path.exists(LIMITS) else {}
        en = tables['en']
        for probs in out.values():
            for kind, s, ks, mx in probs:
                for k in ks:
                    v = en.get(k)
                    if v is None or isinstance(v, list):
                        continue
                    cap = mx if mx else len(re.sub(r'\{\w+\}', '00', v))  # English already fits there
                    lim[k] = min(lim.get(k, cap), cap)
        json.dump(dict(sorted(lim.items())), open(LIMITS, 'w'), indent=1)
        print('wrote', LIMITS)
    print('PASS' if ok else 'FAILED')
    sys.exit(0 if ok else 1)


run(main())
