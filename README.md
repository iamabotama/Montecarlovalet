# Monte Carlo Valet

8-bit valet-stand management game. Vanilla JS + Canvas, no build step, no external assets.
Open `index.html` (double-click works offline) or play the GitHub Pages build.

## Code map
The code is split into small modules by responsibility (`js/core`, `data`, `art`, `audio`, `world`, `career`, `sim`, `tutorial`, `render`, `ui`, `screens`, `app`). Load order lives in `js/modules.js`. **See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)** for the layer rules and a "where does a new thing go" table. All tuning is in `js/data/config.js`; each hotel is one file in `js/data/hotels/`.

## Debug
Add `?debug=1` to the URL (or set `CONFIG.debug = true`), then press backtick. Time scale, heat, spawns, jump to the event wave, fill lot, grant power-ups, hit boxes, patience %. Job planned vs actual times log to the console; `MCV.JOBLOG` holds them.

## Deploy
Push to `main` here. `.github/workflows/deploy.yml` syntax-checks every module and the module list, then copies `index.html`, `sw.js`, `manifest.webmanifest`, `icons/` + `js/` (plus `CNAME` = `www.montecarlovalet.com`) into **iamabotama/Montecarlovalet.com**, which serves GitHub Pages. Needs the `DEPLOY_TOKEN` repo secret (a token with push access to that repo). Never edit the `.com` repo by hand; it is overwritten on every deploy.

## Status
Stage 1 (playable core) done. Stage 2 (career, hotels, offline) done in v2.0 - see below. Next: cloud save + real payments (Stage 3).

## v1.1 changes
- **Tutorial** (`js/tutorial.js`): 19 scripted steps - hotel drops in, the valet appears, first guest, parking choices, limo greet, ticket pickup via the board, digging out a blocked car, then score / heat / power-ups. Plays automatically on a first START; replay any time from the title (TUTORIAL). Edit `TUT_STEPS` to change the script.
- **Waves and breaks** (`CONFIG.shift`, `js/sim/waves.js`): the night (6 PM to midnight) is 4 arrival waves that get harder (Early Dinner, Dinner Rush, High Rollers, then the hotel's event), each followed by a break with no new cars while guests come out for theirs, then Last Call. Survive to midnight for the full-shift bonus, or clock out early during a break after wave 2.
- **Podium + retrieve board**: leaving guests hand a ticket in at the podium; it appears on the board (ticket, car type, stall, depth, seconds waiting), most urgent first. Tap a ticket to fetch.
- **Hi-res cars** (`js/cars.js`): procedural sprites drawn at 3x the game grid (canvas is 960x540). Distinct bodies per class; exotics get canopies, intakes, wings, glow halos.
- **Tips**: whales $50-150 on arrival / $50-200 on pickup; whales and ultras served super fast have a 1-in-10 chance of a $500 jackpot (`CONFIG.tips.jackpot`).

## v1.2: hire valets
- **HIRE VALET** panel (left, under T1/T2): $100 up front, then $100 every game hour (`CONFIG.helpers`). Up to 3 helpers. If you can't make payroll, the helper quits.
- **Tap a valet to make him active** (yellow arrow + number tag). Every job you set up after that (park, fetch, greet) goes into *his* queue; the bottom strip shows the active valet's queue. Selection sticks until you tap another valet.
- With a helper active, the panel becomes **SEND HOME**; his queued jobs move back to you and he leaves after his current job.
- Valets never work the same lot row at once (lane lock) - a blocked job shows orange "LANE BUSY" and starts when the row frees up.
- Wages are listed on the end-of-shift summary.

## v1.3: smaller lot + VIP helicopter
- Lot is now 3 stalls per side (6 per row, 36 total) - `CONFIG.lot.stallsPerLane`.
- **VIP helicopter** (`CONFIG.helo`): once per shift (5.5-7 min in), lands on the helipad right of the lot. Tap the pad to send the active valet. Be there within 10 s of touchdown: $1,000 tip + $50 pay. Miss it: +12 heat.
- Stage 2 plan: `docs/STAGE2.md`.

## v2.0: Stage 2 - career, hotels, offline
- **Code restructure**: the 6 big files became ~68 focused modules (see `docs/ARCHITECTURE.md`); Prettier formatting; CI checks the module list.
- **Career** (`js/career/`): every shift banks XP ($1 = 1 XP, fired or not) plus nightly-goal XP. Ranks Rookie -> Valet -> Senior Valet -> Head Valet -> Valet Captain -> Legend of the Riviera, each unlocking power-ups, a bigger loadout, uniforms and hotels. **Promotion screen** with badge when you rank up. Versioned save with migration (old v1 saves keep their XP and high score).
- **Hotels = levels** (`js/data/hotels/`): Monte Carlo (start), Las Vegas (Valet: big lot, fight night, tips x1.1), Dubai (Head Valet: small lot, 3 helicopters, tips x1.25), Swiss Chalet (Valet Captain: rows open on one end only, snow slows driving). Each has its own theme, high score and **3-star rating** (survive the rush / clock out / clock out with the hotel's target).
- **Shift prep**: pick tonight's power-up loadout and uniform, see the 3 nightly goals (also on the pause screen, with live progress).
- **Crew roster**: hired valets are named regulars who return next shift, get faster with experience and earn a bit more per hour.
- **RESERVED** power-up: holds an empty row-end stall for a whale; parked there it can never be blocked in.
- **Offline / installable** (PWA): `sw.js` + manifest; play with no connection, add to home screen.
- **Paid-feature hooks** (`js/career/store.js`, `js/data/products.js`): hotel pack + supporter edition defined; the store is switched off (`CONFIG.store.enabled = false`), so everything is free until a payment backend exists.
- Tests in `tests/` (Playwright): tutorial, gameplay, crew, helicopter, career, reserved, all hotels.

## v2.1: vehicle guide + no overlapping characters
- **VEHICLES** on the title menu (`js/screens/vehicle_guide.js`): three tabs (Everyday, High Rollers, VIP Arrivals) showing every car model with the in-game sprites, the limo and the helicopter. Every number (tips, pay, patience, jackpot, helicopter tip/pay/meet window/heat, landings per hotel, hotel tip bonuses) is read live from `CONFIG` and the hotel files, so the guide always matches the game.
- **No overlapping characters** (`js/render/crowd.js`): everyone on the sidewalk (guests, valets, VIP, NPCs) is laid out each frame so sprites keep at least 2px apart, held tickets count toward width, and nobody stands inside the podium. Presentation only - the simulation is untouched; tap targets follow the drawn positions. Covered by `tests/crowd_test.py`.

## v2.2: waves and breaks
- The endless late-night escalation and the 60-second gala spike are gone. A night is now a fixed sequence in `CONFIG.shift.phases`: **4 waves** (each faster, with richer cars and less patience), a **break** after each (no arrivals, guests leave faster so you can work the board), then **Last Call** (everyone inside comes out; return every car by midnight).
- **Shift complete** at midnight: +$150 bonus and the 2-3 star ratings. Clocking out early (a break after wave 2) keeps your money, earns 1 star.
- Hotel event (Gala, Fight Night, Royal Wedding...) is the 4th wave. Helicopters land at set points in the waves (`helo.times` per hotel).
- HUD pill (top left) shows WAVE n/4, BREAK or LAST CALL with time left. Banners now queue instead of drawing on top of each other.

## v2.3: 16-bit display + language tables
- Rendering on a 640x360 detail grid (2x the game grid): smoother people and scenery, same game layout.
- Text in Press Start 2P (SIL OFL), with the original 3x5 bitmap capitals as a fallback.
- Every player-facing word moved into `js/i18n/en.js`; `tools/check_i18n.js` runs in CI.

## v2.4: 13 languages
- English, Español, Français, Deutsch, Italiano, Português (BR), Polski, Türkçe, Українська, Русский, 中文, 日本語, 한국어.
- Follows the device language by default; **Language** is the last title-menu item ("Langue / Language" when not in English), with a Device-language option. The choice is saved.
- Chinese/Japanese/Korean use Fusion Pixel 10px (SIL OFL), cut down to the characters the game uses (60-90 KB each, `tools/build_fonts.py`).
- Text wraps and measures by pixel width (CJK has no spaces); the queue strip and tutorial Skip button size to their labels.
- `tools/translate.py` drafts only missing/changed lines; `tests/layout_test.py` proves every language fits its slots. How-to: `docs/TRANSLATING.md`.

## v2.8: steeper night, after party, debug menu
- **Night:** 6 shorter waves instead of 4, ramping faster: Early Dinner, Dinner Rush, Showtime, High Rollers, the hotel's big event, then a late-night **After Party** (mostly whales and ultras, tips x1.5, fun-event odds x3), then Last Call. Pickups start in wave 1; a few whales show up from wave 1. The clock now runs 6 PM to 2 AM. Tuning: `CONFIG.shift.phases` (built with `wavePhase()` / `breakPhase()`).
- **Overflow:** 2 temporary slots (one per side) instead of 4, every hotel.
- **Helicopters** are scheduled by wave (`helo.times: [[waveId, from, to]]`): Monte Carlo 2 a night (Dinner Rush, High Rollers), Dubai 3 (the last at the After Party). Las Vegas and the Swiss Chalet still have no helipad.
- **Drunk driver** odds 1 in 12 per whale/ultra pickup (x3 at the After Party).
- **Debug menu:** DEBUG button, top-left of the title screen (`CONFIG.debugMenu`, switch off before release). Pick a hotel, then a fun event or scenario (helicopter now, jump to a wave); it starts a shift there and fires it. Overlay and Odds toggles included. Test: `tests/debug_menu_test.py`.

## v2.7.1: event debug controls
- Open the game with `?debug=1`, start a shift, press the backtick key (`) to show the debug overlay.
- **DRUNK**: a tipsy whale walks out for pickup now (try the cab tap, or fetch his car). **CRASH**: straight to the crash scene.
- **END EV**: stop the current event, tidy up, reset the cooldown. **ODDS:LIVE / ODDS:ALL**: ALL makes every event fire every time it can, with no cooldown.
- The yellow line shows the running event and its stage, or the cooldown left. Each event file declares its own buttons, so new events show up there automatically.

## v2.7: fun events (drunk driver)
- New `js/events/` layer: an event director (one event at a time, cooldown), a small actions API, one file per event. Odds and switches: `data/events.js`. See ARCHITECTURE.md, "Adding a fun event".
- **Drunk driver** (1 in 30 whale/ultra pickups): he wobbles and hiccups while waiting. Tap him to call a cab (car kept overnight, manager pleased). Hand him his keys and he swerves into the pole at the east entrance: the right side of the lot closes (cars there are dug out the west way), everyone is more patient, and you must walk the driver inside and call the cops at the podium. Cops arrive with lights and siren, then a tow truck hauls the wreck away and the road reopens. Do both jobs for a $200 bonus; ignore either and the manager heats up.
- New sounds: siren, crash, hiccup. Navy police car and orange tow truck reuse the procedural car sprites (`CAR_LOOKS.service`).
- Test: `tests/drunk_test.py`.

## v2.5: premium parking
- Two gold premium stalls on pads beside the entrance drive (`world/premium.js`, drawn by `render/premium.js`): the quickest spots on the property, single stalls, no digging out.
- **Premium service:** a whale or ultra fetched from a premium stall before showing any complaint bubble tips **double** and pleases the manager (heat -10, `CONFIG.premium`). Tapping a pad explains it (or why it is locked).
- **P1** unlocks at rank Valet. **P2** is a premium perk, free for everyone while the store is off.
- Premium product (`data/products.js`): the Swiss Chalet, the 3rd and 4th valet (`CONFIG.helpers.freeMax`), premium stall P2. Gates live in `premiumFeature()`; nothing is gated today.
- Test: `tests/premium_test.py`.

## v2.6: premium service + valet buttons
- Premium service bonus (double tip, manager praise, heat -10) and pad tap hints / lock reasons (see v2.5 notes).
- Valet number buttons at the bottom of the crew panel (`ui/crew_panel.js`): 1 = you, 2-4 = helpers. Tap to select; **Tab** cycles (number keys stay power-up shortcuts). Yellow = selected, green = working, white = idle, dim = empty slot. Test: `tests/crew_tabs_test.py`.
