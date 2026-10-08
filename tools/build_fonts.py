#!/usr/bin/env python3
"""Build fonts/fusion-pixel-<zh|ja|ko>.ttf: Fusion Pixel 10px (SIL OFL) cut down to the characters the
game actually uses in that language (its table, its own name, ASCII and Latin-1), so each is a few KB
instead of 4 MB.

  python3 tools/build_fonts.py        # after changing js/i18n/zh.js, ja.js or ko.js

The full fonts are downloaded once into .cache/fonts/ (not committed). Needs `pip install fonttools`.
Each font gets a .chars.txt list beside it; tools/check_i18n.js fails CI if a CJK table uses a character
that is not in its font (i.e. this script needs re-running).
"""
import io, json, os, subprocess, urllib.request, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VERSION = '2026.09.25'
ZIP = (f'https://github.com/TakWolf/fusion-pixel-font/releases/download/{VERSION}/'
       f'fusion-pixel-font-10px-monospaced-ttf-v{VERSION}.zip')
SOURCES = {'zh': 'fusion-pixel-10px-monospaced-zh_hans.ttf', 'ja': 'fusion-pixel-10px-monospaced-ja.ttf',
           'ko': 'fusion-pixel-10px-monospaced-ko.ttf'}
CACHE = os.path.join(ROOT, '.cache', 'fonts')
BASE = ''.join(chr(c) for c in range(0x20, 0x7F)) + ''.join(chr(c) for c in range(0xA1, 0x100) if c != 0xAD) + '…—–’“”·×'


def sources():
    if all(os.path.exists(os.path.join(CACHE, f)) for f in SOURCES.values()):
        return
    os.makedirs(CACHE, exist_ok=True)
    print('downloading Fusion Pixel', VERSION)
    data = urllib.request.urlopen(ZIP).read()
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        for f in list(SOURCES.values()) + ['OFL.txt']:
            with open(os.path.join(CACHE, f), 'wb') as out:
                out.write(z.read(f))


def used_text(code):
    js = (
        "global.defineLanguage=(c,n,t)=>{process.stdout.write(JSON.stringify([n,t]))};"
        f"require({json.dumps(os.path.join(ROOT, 'js', 'i18n', code + '.js'))});"
    )
    name, table = json.loads(subprocess.check_output(['node', '-e', js]))
    vals = [name]
    for v in table.values():
        vals += v if isinstance(v, list) else [v]
    return ''.join(vals)


def main():
    from fontTools import subset
    from fontTools.ttLib import TTFont
    sources()
    for code, src in SOURCES.items():
        path = os.path.join(ROOT, 'js', 'i18n', code + '.js')
        if not os.path.exists(path):
            continue
        chars = sorted(set(used_text(code) + BASE))
        font = TTFont(os.path.join(CACHE, src))
        opts = subset.Options()
        opts.name_IDs = ['*']  # keep the licence/copyright names
        opts.notdef_outline = True
        sub = subset.Subsetter(opts)
        sub.populate(text=''.join(chars))
        sub.subset(font)
        out = os.path.join(ROOT, 'fonts', f'fusion-pixel-{code}.ttf')
        font.save(out)
        with open(out.replace('.ttf', '.chars.txt'), 'w') as f:  # read by tools/check_i18n.js
            f.write(''.join(c for c in chars if ord(c) in font.getBestCmap()))
        cmap = font.getBestCmap()
        missing = [c for c in chars if ord(c) not in cmap and c.strip()]
        print(f'{code}: {len(chars)} chars -> {os.path.getsize(out) // 1024} KB' + (f', not in font: {"".join(missing)}' if missing else ''))
    with open(os.path.join(CACHE, 'OFL.txt')) as f, open(os.path.join(ROOT, 'fonts', 'OFL-FusionPixel.txt'), 'w') as o:
        o.write(f.read())


if __name__ == '__main__':
    main()
