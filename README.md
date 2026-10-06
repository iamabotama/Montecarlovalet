# Monte Carlo Valet

8-bit valet-stand management game. Vanilla JS + Canvas, no build step, no external assets.
Open `index.html` (double-click works offline) or play the GitHub Pages build.

## Code map
The code is split into small modules by responsibility (`js/core`, `data`, `art`, `audio`, `world`, `career`, `sim`, `tutorial`, `render`, `ui`, `screens`, `app`). Load order lives in `js/modules.js`. **See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)** for the layer rules and a "where does a new thing go" table. All tuning is in `js/data/config.js`; each hotel is one file in `js/data/hotels/`.

## Debug
Add `?debug=1` to the URL (or set `CONFIG.debug = true`), then press backtick. Time scale, heat, spawns, gala, fill lot, grant power-ups, hit boxes, patience %. Job planned vs actual times log to the console; `MCV.JOBLOG` holds them.

## Deploy
Push to `main` here. `.github/workflows/deploy.yml` syntax-checks every module and the module list, then copies `index.html`, `sw.js`, `manifest.webmanifest`, `icons/` + `js/` (plus `CNAME` = `www.montecarlovalet.com`) into **iamabotama/Montecarlovalet.com**, which serves GitHub Pages. Needs the `DEPLOY_TOKEN` repo secret (a token with push access to that repo). Never edit the `.com` repo by hand; it is overwritten on every deploy.

## Status
Stage 1 (playable core) done. Stage 2 (career, hotels, offline) done in v2.0 - see below. Next: cloud save + real payments (Stage 3).

## v1.1 changes
- **Tutorial** (`js/tutorial.js`): 19 scripted steps - hotel drops in, the valet appears, first guest, parking choices, limo greet, ticket pickup via the board, digging out a blocked car, then score / heat / power-ups. Plays automatically on a first START; replay any time from the title (TUTORIAL). Edit `TUT_STEPS` to change the script.
- **Learning curve** (`CONFIG.ramp`): the first 2 minutes are arrivals only, then pickups unlock one at a time, whales at 4 min, limos and ultras at 6 min. Patience starts at 3x and tapers to normal by 8 min.
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
