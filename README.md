# Monte Carlo Valet

8-bit valet-stand management game. Vanilla JS + Canvas, no build step, no external assets.
Open `index.html` (double-click works offline) or play the GitHub Pages build.

## Code map (load order = dependency order)

| File | What lives there |
| --- | --- |
| `js/config.js` | **All tuning numbers** (`CONFIG`): lot, map layout, speeds, tiers, heat, pay, power-ups, career, arrivals, gala, text lines |
| `js/art.js` | Palette, 3x5 bitmap font, car/people/icon pixel maps, model roster, power-up metadata |
| `js/audio.js` | Web Audio SFX + looping chiptune music |
| `js/world.js` | Map geometry, routing graph, save/load, run state, lot model (stacks, depth), job planner + valet runner |
| `js/sim.js` | Game rules: guests & patience, arrivals/gala, heat & repair, power-ups, rival steal, shift end |
| `js/ui.js` | Rendering, HUD, input/hit-testing, screens (title, how-to, settings, pause, summary), debug overlay, main loop |
| `docs/` | Original spec and reference art |

## Debug
Add `?debug=1` to the URL (or set `CONFIG.debug = true`), then press backtick. Time scale, heat, spawns, gala, fill lot, grant power-ups, hit boxes, patience %. Job planned vs actual times log to the console; `MCV.JOBLOG` holds them.

## Deploy
Push to `main` here. `.github/workflows/deploy.yml` syntax-checks the JS, then copies `index.html` + `js/` (plus `CNAME` = `www.montecarlovalet.com`) into **iamabotama/Montecarlovalet.com**, which serves GitHub Pages. Needs the `DEPLOY_TOKEN` repo secret (a token with push access to that repo). Never edit the `.com` repo by hand; it is overwritten on every deploy.

## Status
Stage 1 (playable core) done. Stage 2: career ranks/promotion screen, loadout, nightly goals, cosmetics, interactive tutorial, shuffle mode, Reserved Sign.

## v1.1 changes
- **Tutorial** (`js/tutorial.js`): 19 scripted steps - hotel drops in, the valet appears, first guest, parking choices, limo greet, ticket pickup via the board, digging out a blocked car, then score / heat / power-ups. Plays automatically on a first START; replay any time from the title (TUTORIAL). Edit `TUT_STEPS` to change the script.
- **Learning curve** (`CONFIG.ramp`): the first 2 minutes are arrivals only, then pickups unlock one at a time, whales at 4 min, limos and ultras at 6 min. Patience starts at 3x and tapers to normal by 8 min.
- **Podium + retrieve board**: leaving guests hand a ticket in at the podium; it appears on the board (ticket, car type, stall, depth, seconds waiting), most urgent first. Tap a ticket to fetch.
- **Hi-res cars** (`js/cars.js`): procedural sprites drawn at 3x the game grid (canvas is 960x540). Distinct bodies per class; exotics get canopies, intakes, wings, glow halos.
- **Tips**: whales $50-150 on arrival / $50-200 on pickup; whales and ultras served super fast have a 1-in-10 chance of a $500 jackpot (`CONFIG.tips.jackpot`).
