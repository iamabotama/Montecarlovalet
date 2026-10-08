# Translating Monte Carlo Valet

Every word the player sees lives in a **language table**: one plain file per language in `js/i18n/`.
Nothing is translated while the game runs. If a table is missing a line, the game shows the English line,
so an unfinished translation never breaks the game.

| File | What it is |
| --- | --- |
| `js/i18n/en.js` | **English, the master table.** Every key starts here. |
| `js/i18n/<code>.js` | One per extra language, same keys. 12 today (below). |
| `js/i18n/i18n.js` | The lookup code (`t()`, `tl()`, `tlist()`, `chooseLanguage()`). Translators never touch it. |
| `tools/translate.py` | Drafts missing lines with an LLM, checks them, writes the language file. |
| `tools/build_fonts.py` | Rebuilds the Chinese/Japanese/Korean font subsets after their tables change. |
| `tools/i18n_limits.json` | Measured maximum lengths for tight slots (written by the layout test). |
| `tools/check_i18n.js` | The checker. It runs in CI and before every deploy. |

## Languages

| Code | Language | Font | Notes |
| --- | --- | --- | --- |
| `en` | English | Press Start 2P | master |
| `es` | Español | Press Start 2P | neutral international Spanish |
| `fr` | Français | Press Start 2P | |
| `de` | Deutsch | Press Start 2P | runs long: the layout test keeps it in check |
| `it` | Italiano | Press Start 2P | |
| `pt` | Português | Press Start 2P | Brazilian |
| `pl` | Polski | Press Start 2P | |
| `tr` | Türkçe | Press Start 2P | |
| `uk` | Українська | Press Start 2P | Cyrillic is in Press Start 2P |
| `ru` | Русский | Press Start 2P | |
| `zh` | 中文 | Fusion Pixel 10px (zh_hans) | Simplified |
| `ja` | 日本語 | Fusion Pixel 10px (ja) | |
| `ko` | 한국어 | Fusion Pixel 10px (ko) | |

The tables are **machine drafts** (GPT-5, with game context, register and length rules). They read well,
but a native speaker should skim them before a big launch. Edit any line by hand: the tool never
overwrites existing lines unless you ask it to.

**How the language is chosen.** By default the game follows the browser/system language (`navigator.languages`,
first match by its two-letter code, so `pt-BR` → `pt`, `zh-TW` → `zh`), falling back to English. **Language**
is the last item on the title menu. When the game is not in English the button also says "Language"
("Langue / Language"), so anyone can find it. The picker lists each language in its own script, plus
**Device language** to go back to following the device. The choice is stored in the save.

Easy to add later: Traditional Chinese (Fusion Pixel has a `zh_hant` font), Dutch, Indonesian, Vietnamese
(check its stacked accents render). Right-to-left (Arabic, Hebrew) and complex scripts (Hindi, Thai) would
need real layout work, not just a table.

## Adding or changing text (the usual job)

1. Add the English line to `js/i18n/en.js` and use it in code (`t('area.key')`).
2. `python3 tools/translate.py --all` drafts only the **new** keys in every language (needs
   `OPENAI_API_KEY`; set `MCV_TRANSLATE_MODEL` to pick a model). To re-draft lines you changed in English:
   `python3 tools/translate.py --all --redo area.key other.key`.
3. `python3 tools/build_fonts.py` if Chinese, Japanese or Korean got new characters (the checker tells you).
4. `node tools/check_i18n.js`, then `python3 tests/layout_test.py` (see below).

## Adding a language

1. Add it to `LANGUAGES` in `tools/translate.py` (English name, own name, font face, translator notes).
2. `python3 tools/translate.py <code>` creates `js/i18n/<code>.js`.
3. Add `'i18n/<code>.js',` to `js/modules.js` after the other languages.
4. A new script needs a font: add a face in `FACES` (`js/art/font.js`), name it with
   `defineLanguage(code, name, table, { face })`, and add the font to `sw.js` so it works offline.
5. Run the checks below.

## Rules for values

- **`{name}` placeholders.** The game fills these in. Keep every placeholder from the English line (you may move them around), and don't invent new ones. The checker fails if they don't match.
  `'toast.needToHire': 'Need {money} to hire {name}'` could become `'Il faut {money} pour recruter {name}'`.
- **Lists stay lists.** Lines like `'lines.murmur': ['...', '...']` are pools the game picks from at random. A list may have more or fewer lines than the English one.
- **Clock format.** `clock.am` / `clock.pm` choose 12-hour or 24-hour time. `{h}` is the 12-hour hour, `{h24}` the 24-hour hour, `{m}` the minutes. Everyone except English and Korean uses 24-hour time.
- **Length.** The screen is small. Buttons, the HUD, the ticket board, the crew panel and the Vehicle Guide columns have fixed slots. `tests/layout_test.py` measures them.
- **Register.** Instructions talk to the player informally. Posh guests in speech bubbles are snooty and formal (vous, Sie, Вы). The manager is gruff.
- **Names stay as they are.** Car models (Ferruccio, Bimmer 7...), valet names and lane codes (A3, T1) are the same in every language and are not in the tables.

## Rules for code (developers)

- Never write player-facing text in code. Add a key to `en.js` and call `t('area.key', { values })`.
- Data files load before a language is chosen, so they use `tl('area.key')`, a lazy reference that becomes the current language whenever it is drawn.
- Group keys by where they appear (`hud.`, `toast.`, `tut.`, `guide.`...). Values the code fills in go through `{placeholders}`, never `+` concatenation, because word order differs between languages.
- Measure text with `textW()` and wrap with `wrapText(s, widthPx)`. Never count characters: Chinese characters are wider than Latin ones and have no spaces.
- Text in a fixed slot passes its width: `drawText(..., { maxW })`. Buttons do this automatically. It changes nothing on screen, but the layout test reports anything wider.
- Don't name a local variable `t`, since it hides the translate function. The checker catches this.
- Internal ids that happen to be capitals (`'MET'`, `'VIP'`) take a trailing `// i18n-ignore` comment.

## What the checks catch

`node tools/check_i18n.js` (CI fails on errors):
- code that uses a key English doesn't have
- player text written straight into code instead of a table
- a translation with wrong `{placeholders}`, an unknown key, or a list where text belongs (or the other way round)
- a Chinese/Japanese/Korean character that isn't in that language's font subset (run `tools/build_fonts.py`)
- a local `t` hiding the translate function (needs `npm i --no-save acorn`; CI installs it)
- report only: English keys nothing uses, and how complete each language is

`python3 tests/i18n_test.py` plays every screen, the tutorial and two busy shifts in a fake "[bracket]"
language. It fails if any drawn word didn't come from a table. It also checks the Language screen.

`python3 tests/layout_test.py [codes]` plays the same tour in every real language and fails on text wider
than its slot, text off the screen edge, or text overlapping other text where English doesn't. Each problem
names its key. `--limits` records the measured maximum for those keys in `tools/i18n_limits.json`, so
`tools/translate.py <code> --redo <keys>` re-drafts them short enough.
