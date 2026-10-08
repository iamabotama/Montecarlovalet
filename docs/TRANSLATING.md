# Translating Monte Carlo Valet

Every word the player sees lives in a **language table**: one plain file per language in `js/i18n/`.
Nothing is translated while the game runs. If a table is missing a line, the game shows the English line,
so an unfinished translation never breaks the game.

| File | What it is |
| --- | --- |
| `js/i18n/en.js` | **English, the master table.** Every key starts here. |
| `js/i18n/<code>.js` | One per extra language (`fr.js`, `es.js`, `de.js`...), using the same keys. |
| `js/i18n/i18n.js` | The lookup code (`t()`, `tl()`, `tlist()`). Translators never touch it. |
| `tools/check_i18n.js` | The checker. It runs in CI and before every deploy. |

## Adding a language

1. Copy `js/i18n/en.js` to `js/i18n/fr.js`.
2. Change the first line to `defineLanguage('fr', 'Français', {`. The name is written in the language itself, because it appears on the Settings button.
3. Translate the **values** (right-hand side). Never change a **key** (left-hand side).
4. Add `'i18n/fr.js',` to `js/modules.js`, directly after `'i18n/en.js'`.
5. Run `node tools/check_i18n.js`. It reports what percentage is translated and any mistakes.

The game picks the device language automatically. Players can also change it with the **Language** button
in Settings, which only appears once there are two or more languages.

## Rules for values

- **`{name}` placeholders.** The game fills these in. Keep every placeholder from the English line (you may move them around), and don't invent new ones. The checker fails if they don't match.
  `'toast.needToHire': 'Need {money} to hire {name}'` could become `'Il faut {money} pour embaucher {name}'`.
- **Lists stay lists.** Lines like `'lines.murmur': ['...', '...']` are pools the game picks from at random. A list may have more or fewer lines than the English one.
- **Clock format.** `clock.am` / `clock.pm` choose 12-hour or 24-hour time. `{h}` is the 12-hour hour, `{h24}` the 24-hour hour, `{m}` the minutes. French could use `'{h24}h{m}'` for both.
- **Length.** The screen is small. Labels on buttons, the HUD and the ticket board should be about the same length as the English. Wrapped text (tutorial, how-to, guide notes) can run somewhat longer.
- **Characters.** The pixel font (Press Start 2P) covers Latin letters with accents (é, ñ, ü, ç...). Cyrillic, Greek, Chinese, Japanese, Korean or Arabic would need an extra font. Ask before starting one of those.
- **Names stay as they are.** Car models (Ferruccio, Bimmer 7...), valet names and lane codes (A3, T1) are the same in every language and are not in the tables.

## Rules for code (developers)

- Never write player-facing text in code. Add a key to `en.js` and call `t('area.key', { values })`.
- Data files load before a language is chosen, so they use `tl('area.key')`, a lazy reference that becomes the current language whenever it is drawn.
- Group keys by where they appear (`hud.`, `toast.`, `tut.`, `guide.`...). Values the code fills in go through `{placeholders}`, never `+` concatenation, because word order differs between languages.
- Don't name a local variable `t`, since it hides the translate function. The checker catches this.
- Internal ids that happen to be capitals (`'MET'`, `'VIP'`) take a trailing `// i18n-ignore` comment.

## What the checks catch

`node tools/check_i18n.js` (CI fails on errors):
- code that uses a key English doesn't have
- player text written straight into code instead of a table
- a translation with wrong `{placeholders}`, an unknown key, or a list where text belongs (or the other way round)
- a local `t` hiding the translate function (needs `npm i --no-save acorn`; CI installs it)
- report only: English keys nothing uses, and how complete each language is

`python3 tests/i18n_test.py` plays every screen, the tutorial and two busy shifts in a fake "[bracket]"
language. It fails if any drawn word didn't come from a table.
