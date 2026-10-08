#!/usr/bin/env python3
"""Draft translations of js/i18n/en.js with an LLM, one language file per code.

  python3 tools/translate.py fr de          # fill in missing keys for French and German
  python3 tools/translate.py --all          # every language in LANGUAGES below
  python3 tools/translate.py fr --redo hud.manager board.free   # re-draft specific keys
  python3 tools/translate.py --all --fix-long   # re-draft lines over their length budget (after layout_test --limits)

Only keys missing from js/i18n/<code>.js are sent, so it is cheap to run after adding English text.
Existing (e.g. human-reviewed) lines are never overwritten unless named with --redo.
Every draft is checked: same {placeholders}, lists stay lists, and short UI labels stay within a
length budget (see budget(); tools/i18n_limits.json holds measured limits for tight slots). Failures are re-asked with the reason, then reported.
Needs an OpenAI-compatible endpoint: OPENAI_API_KEY (+ OPENAI_API_BASE), and `pip install openai`.
After running: node tools/check_i18n.js, then python3 tools/build_fonts.py if a CJK file changed.
Machine drafts should be reviewed by a native speaker before a big launch.
"""
import argparse, concurrent.futures as cf, json, math, os, re, subprocess, sys, unicodedata
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
I18N = os.path.join(ROOT, 'js', 'i18n')
MODEL = os.environ.get('MCV_TRANSLATE_MODEL', 'gpt-5')

# code: (English name, own name, face, notes for the translator)
LANGUAGES = {
    'es': ('Spanish', 'Español', 'latin', 'Neutral international Spanish, understandable in Spain and Latin America. Use tú. 24-hour clock: "{h24}:{m}".'),
    'fr': ('French', 'Français', 'latin', 'France French. Use tu with the player. 24-hour clock is normal: clock.am/pm may be "{h24}h{m}".'),
    'de': ('German', 'Deutsch', 'latin', 'Use du. German runs long: prefer short words for UI labels. 24-hour clock: "{h24}:{m}".'),
    'it': ('Italian', 'Italiano', 'latin', 'Use tu. 24-hour clock: "{h24}:{m}".'),
    'pt': ('Brazilian Portuguese', 'Português', 'latin', 'Brazilian Portuguese, informal você. 24-hour clock: "{h24}:{m}".'),
    'pl': ('Polish', 'Polski', 'latin', 'Informal (ty). 24-hour clock: "{h24}:{m}".'),
    'tr': ('Turkish', 'Türkçe', 'latin', 'Informal (sen). 24-hour clock: "{h24}:{m}".'),
    'uk': ('Ukrainian', 'Українська', 'latin', 'Informal (ти). 24-hour clock: "{h24}:{m}".'),
    'ru': ('Russian', 'Русский', 'latin', 'Informal (ты). 24-hour clock: "{h24}:{m}".'),
    'zh': ('Simplified Chinese', '中文', 'zh', 'Mainland Simplified Chinese. Use full-width Chinese punctuation (，。！？：). 24-hour clock: "{h24}:{m}".'),
    'ja': ('Japanese', '日本語', 'ja', 'Natural casual-polite game Japanese. Use full-width punctuation. Always 24-hour clock: "{h24}:{m}".'),
    'ko': ('Korean', '한국어', 'ko', 'Natural game Korean (해요체 for instructions, short nouns for labels). Korean uses spaces between words. Clock: "{h24}:{m}".'),
}

GAME = """Monte Carlo Valet is a cute 16-bit pixel-art arcade game. The player is a hotel valet: greet arriving
guests, park their cars in a lot (lanes A-F, temporary spots T1-T4), and fetch cars back when guests hand a
ticket to the podium. Rich guests (whales, VIPs, helicopter arrivals) tip big. A manager's "heat" meter rises
when guests wait too long; at 100% you're fired. A night is split into waves of arrivals with breaks between.
There is a career (ranks, XP, hotels in Monte Carlo, Las Vegas, the Swiss Alps and Dubai), helpers you can
hire, power-ups, nightly goals and a vehicle guide. Tone: playful, a little cheeky, classy Riviera glamour.
Text is drawn in a tiny pixel font on a 320x180 screen, so short is always better.
Who speaks: instructions talk to the player (informal). Guests in speech bubbles talk to the valet; "posh"
lines are snooty rich guests and use the formal/polite register (e.g. vous, Sie, Вы). The manager is gruff
and calls the player "kid".
"""

RULES = """Rules:
- Translate the VALUES. Keep every {placeholder} exactly (you may move it). Do not add new placeholders.
- A value that is a JSON list stays a list of short lines (any number of items); a string stays a string.
- Keep as-is: the game title lines (title.line1 "Monte Carlo", title.line2 "Valet"), city names may be localised
  normally, "XP", "VIP", "$" amounts, lane/stall codes (A3, T1), and the "V" in valet numbers like "V1"/"V{n}"
  (V = valet number). "HI" is the high score: use your language's usual short form or keep "HI".
- side.westShort / side.eastShort are 1-letter compass abbreviations.
- Each item has "max": the most characters that fit (count one CJK character as 1.25, and one half-width
  letter/digit in CJK text as 0.65). Never exceed it; abbreviate naturally if needed.
- Use only characters the pixel font has: Latin with accents, Cyrillic, CJK/kana/hangul, digits, common
  punctuation. No emoji. Plain straight apostrophes are fine.
- Reply with ONE JSON object mapping each key to its translated value, nothing else."""

TIGHT = {'btn', 'title', 'settings', 'career', 'clock', 'rank', 'uniform', 'nametag', 'hud', 'board', 'crew', 'pause',
         'sel', 'side', 'job', 'float', 'tier', 'wait', 'phase', 'power', 'lang', 'unlock', 'store', 'product'}


LIMITS_FILE = os.path.join(ROOT, 'tools', 'i18n_limits.json')  # measured slot sizes (tests/layout_test.py --limits)
LIMITS = json.load(open(LIMITS_FILE)) if os.path.exists(LIMITS_FILE) else {}


def budget(key, en):
    """Most Latin-character units a translation of en may use."""
    if key in LIMITS:
        return LIMITS[key]
    if isinstance(en, list):
        return max(budget(key, e) for e in en)
    n = len(en)
    if n <= 2:
        return n + 1
    if key.split('.')[0] in TIGHT:
        return max(n + 3, math.ceil(n * 1.3))
    return math.ceil(n * 1.5) + 4


def cjk_units(s, face):
    if face == 'latin':
        return len(s)
    n = 0.0
    for ch in s:
        n += 1.25 if (unicodedata.east_asian_width(ch) in 'WF') else 0.65
    return n


def node_table(path):
    """Load a language file's table via node (keys in order)."""
    js = (
        "global.defineLanguage=(c,n,t,o)=>{process.stdout.write(JSON.stringify({code:c,name:n,table:t,opts:o||{}}))};"
        f"require({json.dumps(path)});"
    )
    return json.loads(subprocess.check_output(['node', '-e', js]))


PH = re.compile(r'\{(\w+)\}')
# Typical widest values the game fills in, so length checks see what the player sees.
SAMPLE = {'range': '$100-$300', 'money': '$1,000', 'name': 'Marco', 'power': 'Reserved', 'hotel': 'Hotel Monte Carlo',
          'event': 'The Gala', 'city': 'Las Vegas', 'list': 'Las Vegas x1.1'}
fill = lambda v: PH.sub(lambda m: SAMPLE.get(m.group(1), '00'), v)


def problems(key, en, val, face):
    out = []
    if isinstance(en, list) != isinstance(val, list):
        return ['must be a ' + ('JSON list' if isinstance(en, list) else 'string')]
    ens = en if isinstance(en, list) else [en]
    vals = val if isinstance(val, list) else [val]
    if not vals or not all(isinstance(v, str) and v.strip() for v in vals):
        return ['empty or non-text value']
    want = set(PH.findall(' '.join(ens)))
    for v in vals:
        if set(PH.findall(v)) != want and not (isinstance(en, list)):
            out.append(f'placeholders must be exactly {sorted(want) or "none"}')
            break
    if key.startswith('clock.'):
        if not ({'h', 'm'} <= set(PH.findall(vals[0])) or {'h24', 'm'} <= set(PH.findall(vals[0]))):
            out.append('clock needs {h} or {h24}, and {m}')
        out = [o for o in out if not o.startswith('placeholders')]
    lim = budget(key, en)
    for v in vals:
        shown = fill(v)
        if cjk_units(shown, face) > lim + 0.01:
            out.append(f'too long ({cjk_units(shown, face):.1f} > max {lim})')
            break
    if re.search('[\U0001F300-\U0001FAFF\u2600-\u27BF]', ' '.join(vals)):
        out.append('no emoji')
    return out


def ask(client, code, items, feedback=None):
    eng, own, face, notes = LANGUAGES[code]
    payload = {k: {'en': v, 'max': budget(k, v)} for k, v in items.items()}
    msg = [
        {'role': 'system', 'content': f'You are a professional video-game localiser translating into {eng}.'},
        {'role': 'user', 'content': GAME + '\n\n' + RULES + f'\n- {eng}: {notes}\n\nKeys are grouped by where the text appears '
         '(hud = top bar, board = ticket board, sel = car/guest action menu, toast = short pop-up, tut = tutorial box, '
         'howto = help pages, guide = vehicle guide, lines = speech bubbles over guests, manager = the manager speaking).'
         + (('\n\nYour previous answer had problems; fix them:\n' + json.dumps(feedback, ensure_ascii=False)) if feedback else '')
         + '\n\nItems:\n' + json.dumps(payload, ensure_ascii=False, indent=0)},
    ]
    r = client.chat.completions.create(model=MODEL, messages=msg, max_completion_tokens=60000,
                                       extra_body={'reasoning': {'effort': 'medium'}})
    txt = r.choices[0].message.content.strip()
    txt = re.sub(r'^```(json)?|```$', '', txt).strip()
    return json.loads(txt)


def write_file(code, en_src, en_table, table):
    eng, own, face, _ = LANGUAGES[code]
    lines = ["'use strict';",
             f"/* {eng}. Keys mirror i18n/en.js (the master). Drafted by tools/translate.py ({MODEL}, {date.today()});",
             "   lines a native speaker has reviewed can be edited freely - the tool only fills in missing keys. */",
             f"defineLanguage('{code}', {json.dumps(own, ensure_ascii=False)}, {{"]
    key_re = re.compile(r"^\s*'([\w.]+)':")
    for ln in en_src.split('\n'):
        st = ln.strip()
        if st.startswith('// ') and ln.startswith('  //'):
            lines.append(ln)
        m = key_re.match(ln)
        if m and m.group(1) in table:
            lines.append(f"  {json.dumps(m.group(1))}: {json.dumps(table[m.group(1)], ensure_ascii=False)},")
    opts = f", {{ face: '{face}' }}" if face != 'latin' else ''
    lines.append('}' + opts + ');')
    with open(os.path.join(I18N, code + '.js'), 'w') as f:
        f.write('\n'.join(lines) + '\n')


def translate(code, redo=(), client=None, fix_long=False):
    en = node_table(os.path.join(I18N, 'en.js'))['table']
    en_src = open(os.path.join(I18N, 'en.js')).read()
    path = os.path.join(I18N, code + '.js')
    have = node_table(path)['table'] if os.path.exists(path) else {}
    face = LANGUAGES[code][2]
    if fix_long:  # existing lines that break a (possibly newly measured) length budget
        redo = set(redo) | {k for k, v in have.items() if k in en and problems(k, en[k], v, face)}
    have = {k: v for k, v in have.items() if k in en and k not in redo}
    todo = {k: v for k, v in en.items() if k not in have}
    report = []
    feedback = None
    for attempt in range(3):
        if not todo:
            break
        got = {}
        keys = list(todo)
        for i in range(0, len(keys), 120):  # chunk to keep answers reliable
            chunk = {k: todo[k] for k in keys[i:i + 120]}
            fb = {k: v for k, v in (feedback or {}).items() if k in chunk} or None
            try:
                got.update(ask(client, code, chunk, fb))
            except Exception as e:  # bad JSON or API error: retry this chunk next attempt
                report.append(f'{code}: attempt {attempt + 1} chunk {i // 120}: {e}')
        feedback = {}
        for k in list(todo):
            if k not in got:
                feedback[k] = {'value': None, 'problems': ['missing from answer']}
                continue
            p = problems(k, en[k], got[k], face)
            if p and attempt < 2:
                feedback[k] = {'value': got[k], 'problems': p}
            else:
                if p:
                    report.append(f'{code}: kept {k} despite: {"; ".join(p)}')
                have[k] = got[k]
                del todo[k]
    for k in todo:
        report.append(f'{code}: {k} still missing (falls back to English)')
    ordered = {k: have[k] for k in en if k in have}
    write_file(code, en_src, en, ordered)
    return code, len(ordered), len(en), report + ([f'{code}: re-drafted {len(redo)}: {" ".join(sorted(redo))}'] if redo else [])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('codes', nargs='*')
    ap.add_argument('--all', action='store_true')
    ap.add_argument('--redo', nargs='*', default=[])
    ap.add_argument('--fix-long', action='store_true')
    a = ap.parse_args()
    codes = list(LANGUAGES) if a.all else a.codes
    bad = [c for c in codes if c not in LANGUAGES]
    if bad or not codes:
        sys.exit(f'unknown or no language codes {bad}; known: {", ".join(LANGUAGES)}')
    from openai import OpenAI
    client = OpenAI()
    with cf.ThreadPoolExecutor(max_workers=6) as ex:
        for code, n, total, report in ex.map(lambda c: translate(c, set(a.redo), client, a.fix_long), codes):
            print(f'{code}: {n}/{total} keys')
            for r in report:
                print('  ' + r)


if __name__ == '__main__':
    main()
