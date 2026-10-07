# Monte Carlo Valet: code architecture

Plain JavaScript, no build step, no framework. `index.html` loads the files listed in **`js/modules.js`** in order. The service worker (`sw.js`) precaches the same list, and CI checks the list matches the files on disk (`tools/check_modules.js`).

## Layers

Each folder owns one job. Files only *call down* the list (UI calls sim, sim calls world, and so on). Data files hold no logic.

| Folder | Owns | Must not |
| --- | --- | --- |
| `core/` | Tiny helpers (random, clamp, lerp) | Know about the game |
| `data/` | All tuning and content as plain objects: `config.js`, vehicles, power-ups, goals, cosmetics, products, **`hotels/`** | Contain logic or touch state |
| `art/`, `audio/` | Palette, pixel font, procedural car and people sprites, sound | Read game state |
| `world/` | The active lot's geometry, the routing graph, the lot model (stalls, temps, curb), and planning and running valet jobs | Award money or heat |
| `career/` | Everything that **persists between shifts**: save and migrations, XP and ranks, unlocks, crew roster, store ownership | Run during a shift (except roster and wage lookups) |
| `sim/` | The rules of **one shift**: run state `S`, the night's waves/breaks (`waves.js`), arrivals, guests, heat, economy, power-ups, helicopter, goals, crew wages, shift end | Draw anything |
| `tutorial/` | The scripted first shift | Change rules for normal play |
| `render/` | Drawing the world: themed background, people, crowd spacing (`crowd.js`), helicopter, the game frame | Change state |
| `ui/` | In-game HUD, board, selection, crew panel, input hit-targets, debug overlay, widgets | Hold rules |
| `screens/` | One file per screen (`defineScreen`). Covers title, hotels, shift prep, game, promotion, summary, settings and how-to | Build run state themselves |
| `app/` | Flow between screens: `loadHotel()`, `startGame()` | |
| `main.js` | Boot and the fixed-timestep loop | |

## Key ideas

- **Hotels are data.** `data/hotels/<id>.js` calls `defineHotel({...})`. It sets the lot shape (lanes, stalls, open row ends, temp slots), helipad and landings, rush event, arrival mix, modifiers (tips, driving) and visual theme. `world/geometry.js` turns it into live geometry through `setGeometry()`, and `app/flow.js#loadHotel` rebuilds the routing graph and the background. No other code mentions a specific hotel.
- **Two kinds of state.** `S` is one shift: `newRun()` creates it and it is thrown away afterwards. `SAVE` is the career: only `career/*` and the settings screen write it. `finishRun()` hands the shift to `awardShift()` once, at the end.
- **Goals read stats.** Nightly goals (`data/goals.js`) are `value(S)` functions over `S.stats`. The rules never call into the goal system; they only count things.
- **Save versioning.** Bump `CONFIG.career.saveVersion` and add a `MIGRATIONS[n]` entry in `career/save.js`. Old saves get upgraded, never wiped.
- **Store is one switch.** `CONFIG.store.enabled = false` means everything is owned. Going live means implementing `StoreProvider.purchase()` in `career/store.js` against a real payment backend. Nothing else changes.

## Where does a new thing go?

| You want to add... | Touch |
| --- | --- |
| A hotel | New `data/hotels/<id>.js` plus one line in `js/modules.js` |
| A wave, break or difficulty change | `CONFIG.shift.phases` (data only; `sim/waves.js` reads it). Helicopter timing is `helo.times` in the hotel file |
| A nightly goal | One entry in `data/goals.js` (count any new stat in `S.stats`) |
| A power-up | `data/powerups.js` (info) and `CONFIG.power`. Logic goes in `sim/powerups.js#useCard`, or its own `sim/<name>.js` if it has state (see `sim/reserved.js`). Unlock it in `CONFIG.career.ranks` |
| A uniform or name tag | `data/cosmetics.js`, plus an unlock key in a rank |
| A rank | `CONFIG.career.ranks` |
| A screen | New `screens/<name>.js` with `defineScreen`, plus `js/modules.js` (e.g. `vehicle_guide.js`) |
| Something that stands on the sidewalk | Add it to `crowdMembers()` in `render/game.js` (props use `fixed: true`) and draw it at `x + crowdOff(ref)` |
| A paid product | `data/products.js`, then point a hotel's `product` at it |
| Tuning | `data/config.js` only |

## Tests

Browser tests use Playwright plus system Chromium. `tests/harness.py` drives the game through code (`startGame`, `enqueue`...), not screen coordinates.

```
cd tests
python3 hotels_test.py     # every hotel plays 10 sim-minutes without errors
python3 career_test.py     # v1 save migration, hotel locks, prep, promotion, roster, persistence
python3 reserved_test.py   # RESERVED power-up
python3 crowd_test.py      # standing characters never overlap
python3 waves_test.py      # a full night: waves, breaks, last call, shift complete
python3 tutorial_test.py   # full scripted tutorial
python3 gameplay_test.py; python3 crew_test.py; python3 heli_test.py
```

Formatting: `npx prettier@3 --write "js/**/*.js"` (settings in `.prettierrc`).
