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
