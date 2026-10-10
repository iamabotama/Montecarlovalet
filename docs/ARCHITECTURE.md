# Monte Carlo Valet: code architecture

Plain JavaScript, no build step, no framework. `index.html` loads the files listed in **`js/modules.js`** in order. The service worker (`sw.js`) precaches the same list, and CI checks the list matches the files on disk (`tools/check_modules.js`).

## Layers

Each folder owns one job. Files only *call down* the list (UI calls sim, sim calls world, and so on). Data files hold no logic.

| Folder | Owns | Must not |
| --- | --- | --- |
| `core/` | Tiny helpers (random, clamp, lerp), display scale | Know about the game |
| `i18n/` | Every player-facing word: `i18n.js` (`t()`, `tl()`, language choice) and one table per language (`en.js` is the master) | Contain logic beyond lookup |
| `data/` | All tuning and content as plain objects: `config.js`, vehicles, power-ups, goals, cosmetics, products, **`hotels/`** | Contain logic or touch state |
| `art/`, `audio/` | Palette, pixel fonts (one face per script: Press Start 2P, Fusion Pixel for CJK), procedural car and people sprites, sound | Read game state |
| `world/` | The active lot's geometry, the routing graph, the lot model (stalls, temps, curb), and planning and running valet jobs | Award money or heat |
| `career/` | Everything that **persists between shifts**: save and migrations, characters (`character.js`), XP and ranks, unlocks, awards (`awards.js`), daily streaks (`streaks.js`), the skill tree (`skills.js`), crew roster, store ownership | Run during a shift (except roster and wage lookups) |
| `sim/` | The rules of **one shift**: run state `S`, the night's waves/breaks (`waves.js`), arrivals, guests, heat, economy, power-ups, helicopter, goals, crew wages, shift end | Draw anything |
| `events/` | **Fun events**, isolated from the core rules: `director.js` (registry, one event at a time, cooldown, core hooks), `actions.js` (the only things an event may do: close a lot end, send a valet on an errand, police/tow vehicles, siren, banners), then one file per event (`drunk_driver.js`), `joyride.js` (a hired valet takes a whale car for a spin; core hook `parkDriveStart`, `worker.away`). Odds and on/off live in `data/events.js`  `events/vip_heli.js` (special helicopters: royalty motorcade, celebrity paparazzi, POTUS -> TRUMP TOWERS for the shift + unlocks the secret `data/hotels/trump_towers.js`; core hooks heliIncoming/heliGreet/heliMissed/vipInside/arrivalTier). Secret hotels: `secret:` field in the hotel file, listed via `listedHotels()` once `SAVE.secrets[...]` is set. | Reach into lots, jobs or routing directly; change core rules permanently `snowmobiles.js` (Swiss passive: some everyday cars are faster snowmobiles; hooks carCreated/vehicleSpeed/drawCar/carName), `blizzard.js` (Swiss: white-out overlay, walkRate + waitRate). Def fields: `walkRate`, `overlay(ev)` (drawn above everything). `secret_agent.js` (Monte Carlo easter egg: 7 fountain taps; uses the new director `passiveTargets(add)`). |
| `tutorial/` | The scripted first shift | Change rules for normal play |
| `render/` | Drawing the world: themed background, people, crowd spacing (`crowd.js`), helicopter, the game frame | Change state |
| `ui/` | In-game HUD, board, selection, crew panel, input hit-targets, debug overlay, widgets | Hold rules |
| `screens/` | One file per screen (`defineScreen`). Covers title, hotels, shift prep, game, promotion, summary, settings, language, vehicle guide and how-to | Build run state themselves |
| `app/` | Flow between screens: `loadHotel()`, `startGame()` | |
| `main.js` | Boot and the fixed-timestep loop | |

## Key ideas

- **Hotels are data.** `data/hotels/<id>.js` calls `defineHotel({...})`. It sets the lot shape (lanes, stalls, open row ends, temp slots), helipad and landings, rush event, arrival mix, modifiers (tips, driving) and visual theme. `world/geometry.js` turns it into live geometry through `setGeometry()`, and `app/flow.js#loadHotel` rebuilds the routing graph and the background. No other code mentions a specific hotel.
- **Two kinds of state.** `S` is one shift: `newRun()` creates it and it is thrown away afterwards. `SAVE` is the career: only `career/*` and the settings screen write it. `finishRun()` hands the shift to `awardShift()` once, at the end.
- **Goals read stats.** Nightly goals (`data/goals.js`) are `value(S)` functions over `S.stats`. The rules never call into the goal system; they only count things.
- **Text is data.** Code never contains words: it calls `t('area.key', {values})` (or `tl()` in data files). Each language is a table in `i18n/`; its font face is named there. Layout measures text (`textW`, `wrapText(s, widthPx)`) instead of counting characters, and fixed slots pass `maxW` so `tests/layout_test.py` can prove every language fits. See `docs/TRANSLATING.md`.
- **Premium is one switch too.** Premium-only features (the last hotel, the 3rd and 4th valet, premium stall P2) ask `premiumFeature(key)` in `career/store.js`; the `premium` product in `data/products.js` grants those keys. With the store off, everyone has them.
- **Characters.** Everything about the player's valet (rank, XP, look, loadout, hotel records, lifetime stats, awards, streak) lives on a character record in `SAVE.chars`; code reads it through `activeChar()` (`career/character.js`). Account-wide things (language, sound, tutorial, purchases, secrets, crew roster) stay on `SAVE`. New character fields go in `newCharacter()`; old saves pick them up on load (`fillCharacter`), no migration needed. More characters later = `addCharacter()` / `selectCharacter()` plus a select screen.
- **Awards are data.** `data/awards.js` lists each award with a `check(L, r, c)` over lifetime sums, the shift just played and the character. Lifetime sums are built automatically from every number in `S.stats`, and events count under `L.marks` (each event start by id, plus `eventMark(key)`), so most new awards need no new hooks.
- **Skills reach the shift as a snapshot.** `startGame()` passes `skillPerks()` (career/skills.js) into `newRun()` as `S.perks`; sim and world code only read it through `perk(key)` and the helpers in `sim/perks.js`, never the save. A new skill = one row in `data/skills.js` with a `perks` entry, plus the one place in the sim that reads that perk key.
- **Freezing the shift.** An event returns true from its `freezePlay` hook to stop the clock, arrivals, guests and valets (only the helicopter and the event keep updating); see the POTUS motorcade in `events/vip_heli.js`.
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
| A rank | `CONFIG.career.ranks` (each rank above Rookie is also one skill point) |
| A skill | `data/skills.js` (+ i18n `skill.<id>`, `skill.<id>.desc`; read its perk with `perk('<key>')`, see `sim/perks.js`) |
| An award | `data/awards.js` (+ i18n `award.<id>` and `award.<id>.desc`; a new medal glyph goes in `ICONS`, `art/sprites.js`) |
| A screen | New `screens/<name>.js` with `defineScreen`, plus `js/modules.js` (e.g. `vehicle_guide.js`) |
| Something that stands on the sidewalk | Add it to `crowdMembers()` in `render/game.js` (props use `fixed: true`) and draw it at `x + crowdOff(ref)` |
| A paid product | `data/products.js`, then point a hotel's `product` at it |
| Tuning | `data/config.js` only |

## Tests

Browser tests use Playwright plus system Chromium. `tests/harness.py` drives the game through code (`startGame`, `enqueue`...), not screen coordinates.

```
cd tests
python3 hotels_test.py     # every hotel plays 10 sim-minutes without errors
python3 skills_test.py     # skill points, branch order, reset, every perk reaching the shift
python3 every_car_test.py  # every-car-parked bonus and award
python3 career_test.py     # v1->v3 save migration, hotel locks, prep, promotion, roster, awards, streak, career wall, persistence
python3 reserved_test.py   # RESERVED power-up
python3 crowd_test.py      # standing characters never overlap
python3 waves_test.py      # a full night: waves, breaks, last call, shift complete
python3 tutorial_test.py   # full scripted tutorial
python3 gameplay_test.py; python3 crew_test.py; python3 heli_test.py
```

Formatting: `npx prettier@3 --write "js/**/*.js"` (settings in `.prettierrc`).

## Adding a fun event

1. Add a tuning block to `data/events.js` (`enabled`, `chance`, timers, rewards).
2. Create `js/events/<name>.js` and call `defineEvent('<name>', { eligible, hooks, idle, update, draw, scenery, targets, waitRate })`.
   Start the scene with `startEvent()` and finish it with `endEvent()` (which also reopens any closed lot end and stops the siren).
3. Only use `events/actions.js` (plus `earn`, `addHeat`, `coolHeat`, `floater`, `toast`) to touch the game. If an event needs something new, add it there once, so the next event can reuse it.
4. The core calls events at fixed points only: `eventHook('pickupStart' | 'handOver' | 'tapGuest')` in `sim/`, `updateEvents()` in `sim/step.js`, `drawEvents()` in `render/game.js`, `eventTargets()` in `ui/input.js`, `eventWaitRate()` for guest patience.
5. Register the file in `js/modules.js` (after `events/actions.js`), add its text to `i18n/en.js` under `event.<name>.*`, run `tools/translate.py --all`.
6. Switch an event off with `enabled: false`; nothing else changes. Events never run in the tutorial.
7. Give it debug triggers: `debug: { LABEL: fn }` (and `cleanup(ev)` to tidy leftovers). They appear automatically as buttons in the debug overlay. Roll odds with `eventChance(id)` so the overlay's ODDS:ALL switch works.

## Messages on screen
All pop-up text goes through the message dock in `ui/messages.js` (under the ticket board). Sim code uses `toast(msg)` and `S.banners.push(...)`; events use `eventShout(who, text, sec)` / `eventBanner(text)` from `events/actions.js`. Never draw free-floating text over the play area: valets, guests, cars and the ticket board must stay visible.

## Comps
Comps are a player action, not a random event: `data/comps.js` (tuning), `sim/comps.js` (eligibility, applyComp, once-per-shift), `ui/comp_menu.js` (menu over the ticket board, showgirl/icon visuals). The only touch points elsewhere: `tapGuest` asks `compTapGuest(g)` first, `hitTargets` calls `compMenuTargets`, pointerdown calls `compMenuTapAway`, and `renderGame` calls `renderCompFx` / `renderCompMenu`.
