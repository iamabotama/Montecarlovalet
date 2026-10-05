# Monte Carlo Valet — v1 Game Spec

Oct 5, 2026 · Kaptain

## Overview

Monte Carlo Valet is an 8-bit, single-screen management game: you run the valet stand at a luxury hotel, park arriving cars in a tight lot, and fetch them when guests want them back. Score is total money earned (pay + tips) before you get fired.

**Core loop.** A car pulls into the half-circle drive → you decide what to do with it (park it, wave it off to general parking, greet it, pawn it off) → you choose a stall → your valet drives it there, shuffling blockers if needed → later the guest walks out and requests the car → you dig it out and bring it to the curb → tip.

**The tension.** Every second your valet spends digging a car out of a 3-deep stall is a second a Ferrari owner is standing at the curb getting louder. Where you park now decides how much pain you buy later.

**Design pillars**

- Parking is a spatial puzzle (think Rush Hour / Tetris): stall choice is the main skill.
- Customers are a tiered economy: rich guests pay big and punish hard; cheap guests pay little and forgive.
- The death spiral is intentional: once things go bad, they go bad faster.
- Comedy through readable 8-bit body language: speech bubbles escalating to Q*bert-style grawlix (`@#$%&!`).

**Reference games** for the developer: Diner Dash (task queue, impatient customers), Rush Hour / Parking Jam (blocked-car puzzle), Overcooked (rising chaos), Q*bert (cursing bubble).

## Platform and tech constraints

Deliver one self-contained `index.html`: vanilla JS, HTML5 Canvas, no build step, no external assets or network calls.

- **Resolution.** Internal canvas 320×180, scaled by the largest integer that fits the window, `image-rendering: pixelated`. No sub-pixel drawing; snap sprite positions to whole pixels.
- **Palette.** One fixed 16–32 color palette (NES- or PICO-8-like), defined as a constant. All sprites use it.
- **Art.** Sprites drawn in code from small pixel-string maps (13–16×7 car sprites, 5×9 people, as in the reference art), tinted per model. Car models differ by silhouette + color, not detail.
- **Font.** A built-in 3×5 or 5×7 bitmap font defined in code; no web fonts.
- **Input.** Tablet touch is the primary interface; mouse works the same way. Landscape only. Pointer events, `touch-action: none`, no pinch zoom or scroll. Every action is tap-target then tap-destination; nothing requires drag, hover, right-click or a keyboard. Hit boxes are at least 16×16 internal px (about 50 device px at tablet scale), larger than the sprite; the nearest target wins on an ambiguous tap. Keyboard shortcuts (1–5 power-ups, P pause) are extras for desktop. Audio unlocks on the first tap (iOS Safari). Fullscreen button on the title screen.
- **Audio.** Web Audio API square/triangle/noise chiptune SFX generated in code; one short looping music track; mute toggle.
- **Loop.** Fixed-timestep simulation (60 ticks/s) decoupled from render; all timers in game-seconds so a speed multiplier and pause work.
- **Config.** Every tuning number lives in one `CONFIG` object at the top of the file (see Tuning config defaults).
- **Persistence.** High score, best-run stats and career progress in `localStorage`, wrapped in try/catch.
- **Targets.** iPad Safari and Android Chrome first; desktop Chrome/Firefox/Safari second. Phone is nice-to-have.

## Reference art

Four PNGs ship with this spec. They are art direction, not assets: the game draws its sprites in code, but should match these images' palette (PICO-8), 3×5 bitmap font, sprite sizes and 320×180 layout.

| File | Shows |
| --- | --- |
| `art/00_title_screen.png` | Title screen: hotel at night, neon title, Press Start, high score |
| `art/01_gameplay_mockup.png` | Full game screen mid-shift: HUD, curb, bubbles, street queue, horizontal lot, temp slots, stall highlight with depth and time, valet progress bar, newbie pawn-off, job queue |
| `art/02_vehicle_roster.png` | All 17 parody models by tier, top-down 13–24 × 7 px sprites, with tip ranges |
| `art/03_patience_bubbles.png` | The six patience stages, from calm to whale meltdown |

Sprite sizes used: cars 13–16 × 7 px (limo 24 × 7), people 5 × 9 px, stalls 16 × 15 px.

## Control model

The player commands; the valet avatar executes. You never steer a car. This keeps the game about decisions and lot planning, not driving skill.

- **One valet avatar** (the player). Executes one job at a time, visibly walking and driving cars along aisle paths.
- **Job queue.** Commands are queued (max 4, shown as icons in the HUD). Tap a queued job's X to cancel it or tap the job itself to promote it to the front; the job in progress can be cancelled only before a car is moved.
- **Park a car.** Tap the car at the curb → valid stalls highlight with their depth number and estimated time → tap a stall. Invalid stalls (full, or would need more temp slots than are free) are greyed out.
- **Fetch a car.** Tap a waiting guest's ticket (or the car in the lot) → valet plans the dig-out automatically and executes it: move each blocker to a free temp slot (or another stall the player picks, see below), drive the target to the curb, then return blockers to the stall.
- **Shuffle mode (optional per fetch).** Holding Shift / long-press on a fetch lets the player choose where each blocker goes instead of auto-returning it. Advanced players use this to re-sort the lot.
- **Curb actions.** Tap a car at the curb to open a small radial menu: Park, Wave Off, Greet (limo), Pawn Off (if available).
- **Job duration** is computed from path length + per-car-moved cost (see lot timing), so the player can learn to predict it. Show a progress bar over the valet.

The guest stands next to the curb during drop-off and pickup; the car occupies a curb slot until the valet takes it.

## The hotel and lot map

One fixed screen: hotel facade across the top, half-circle drive in front of the door, street below it, and the lot under the street. Lot lanes run left to right and open onto an aisle at both ends (west and east), so a car's depth is the number of cars between it and the nearer open end (0–3). See `art/01_gameplay_mockup.png`.

```
 ##############  HOTEL MONTE CARLO  ##############
                    [ DOOR ]   (guests exit here)
          (  K1   K2   K3   K4  )      <- curb slots on the half circle
STREET >>(                        )>> STREET   (queue forms at left)
       W                            E
 [T1]  A | 0 1 2 3 3 2 1 0 | A  [T3]
 [T2]  B | 0 1 2 3 3 2 1 0 | B  [T4]
       C | 0 1 2 3 3 2 1 0 | C
       D | 0 1 2 3 3 2 1 0 | D        GENERAL PARKING >
       E | 0 1 2 3 3 2 1 0 | E
       F | 0 1 2 3 3 2 1 0 | F
       ^ west aisle          ^ east aisle
   (numbers = max possible depth of each stall)
```

**Geometry (v1 defaults, all in CONFIG)**

- **Curb:** 4 slots (K1–K4) shared by arrivals, pickups and limos. If all 4 are full, arriving cars queue on the street (max 3 visible); queued guests lose patience.
- **Lot:** 6 lanes (A–F) × 8 stalls = 48 stalls, laid out horizontally. Each lane is single-file, open at its west and east ends. Both aisles connect to the street. A car can only leave through an end whose path is clear.
- **Why horizontal:** six vertical 8-deep columns don't fit a 16:9 screen under the hotel and drive. Rows of 16 px stalls fit with room for the side panel.
- **Temp slots:** 4 total — T1 and T2 off the west aisle, T3 and T4 off the east aisle. Blockers moved during a dig-out go here. A car left in a temp slot over 60 s adds a small heat tick ("blocking the fire lane").
- **Stall depth** = number of occupied stalls between a car and the nearer open end. Show the live depth number when highlighting stalls.
- **Parking into a lane** slides the car from the chosen end to the deepest free position (like stacking), so a player picks lane + side, not an exact stall. A lane's end must be empty to enter from that side.

**Timing model** (game-seconds; show the estimate when a stall is highlighted)

- Drive time = `0.6 s + 0.12 s × tiles` along the aisle path.
- Walk time (valet on foot) = `0.25 s × tiles`.
- **Park** = drive curb→lane end + slide into position + walk back to curb.
- **Fetch** = walk to the lane end + for each blocker (drive to a free temp slot + walk back) + drive target to curb. Blockers stay in temp slots and an automatic **Restow** job is queued at the front of the queue after the handoff, so the guest is served first.
- If no path or not enough free temp slots exist, the fetch is refused with a clear message ("No room to dig out — free a temp slot").

**Tile grid and reference timings.** One tile = 8 internal px, so the screen is a 40×22 grid. Paths run along aisle centerlines. Expected job times with the defaults above (the developer should log actual times and compare):

| Job | Rough path | Expected time |
| --- | --- | --- |
| Park, lane A from the west end | curb → west aisle → lane A, walk back | ~7 s |
| Park, lane F from the east end | curb → east aisle → lane F, walk back | ~10 s |
| Fetch, depth 0 | walk to lane end, drive to curb | ~8 s |
| Fetch, depth 1 | + 1 blocker to temp | ~10 s |
| Fetch, depth 2 | + 2 blockers to temp | ~12 s |
| Fetch, depth 3 | + 3 blockers to temp | ~14 s |

**Dig-out algorithm (auto mode)**

1. Pick the side of the lane with fewer blockers between the end and the target (tie: west).
2. Count blockers N. If fewer than N temp slots are free, refuse the fetch with "No room to dig out — free a temp slot".
3. Move blockers one at a time, nearest the end first, each to the nearest free temp slot.
4. Drive the target to the curb and hand off.
5. Queue a Restow job at the front of the queue: return blockers in reverse order to their original stalls. Those stalls are reserved while Restow is pending, so nothing else can be parked in them.

Shuffle mode replaces step 3's destination with the player's pick (any stall reachable from an open end, or a temp slot) and skips step 5 for blockers that were re-parked elsewhere.

**Lot full.** When no lane has a free end stall, Park is disabled for everyone and the HUD flashes LOT FULL. The only curb options are Wave Off, Greet and Pawn Off. Whales can't be waved off, so a full lot with whales arriving is a losing position — intentional, and the player should be able to see it coming from the stall counts.

This is where the strategy lives: whales near open ends, cheap cars buried in the middle, and using both sides of each lane as two separate stacks.

## Vehicles and customer tiers

Five guest tiers plus limos. The car tells you the tier at a glance: beaters are boxy and dull, whales are low, wide and loud-colored. Use parody names, not real brands (fits the humor and avoids trademark trouble).

| Tier | Parody models | Arrival tip | Pickup tip | Drop-off patience | Pickup patience | When patience runs out | Wave off allowed? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Beater | Rustbucket Hatch, Hondo Civvy, Soccer-Mom Van | none | $1–3 | 25 s | 45 s | Leaves angry, +2 heat | Yes, free (25% chance +1 heat) |
| Standard | Toyoda Camree, Ford Fussion, Subaroo | none | $5–10 | 25 s | 50 s | Leaves angry, +4 heat | Yes, +3 heat |
| Premium | Audee A8, Bimmer 7, Merc S, Lexxus | none | $15–30 | 20 s | 40 s | Leaves angry, +8 heat | Yes, +12 heat |
| Whale | Ferruccio, Lamborgotti, Porsch 911, McLarren | $40–100 | $50–150 | 12 s | 20 s | Never leaves; heat ticks and escalates (see Heat) | No |
| Ultra whale | Rolls-Roiz Phantasm, Bentlee, Bugatto | $100–250 | $100–300 | 10 s | 12 s | Never leaves; faster escalation | No |
| Limo | Stretch Limo (black or white) | $40–80 on greet | none | 15 s to greet | n/a | +6 heat, limo leaves | No |

**Tier rules**

- **Three money outcomes per car: pay, tips, or comped.** Every parked car earns a flat valet fee (pay) at pickup, plus a tip. If the guest's pickup wait exceeds their pickup patience, the service is comped: no pay, no tip, a "COMPED!" bubble. Non-whales leave angry at that point anyway; whales stay, comped, and keep escalating heat until served.
- **Pay by tier:** beater $2, standard $4, premium $8, whale $15, ultra $25, limo $10 on greet.
- **Arrival tips (whales only)** are paid when the valet takes the car, scaled by how fast: full at 0 s wait, 0 at full patience. Only arrival tips build reputation, which is what repairs heat (see Heat).
- **Pickup tips** are money only. For whales they decay 10% per 10 s waited; for everyone else they decay to 50% at patience end.
- **Limos** don't park. They take a curb slot until greeted; Greet is a 2 s job at the curb (valet opens the door). The limo then drives off. A limo blocking a curb slot is the real cost of ignoring it.
- **Model variety:** each tier has 3–4 models (silhouette + color variants). No mechanical differences between models within a tier in v1.

## Customer lifecycle

Each guest is a state machine. Implement these states and transitions exactly; patience timers run in every state marked (waiting).

1. **Queued** (waiting) — on the street, curb full, running the drop-off patience timer. Moves to Arriving when a curb slot frees.
2. **Arriving** — car drives the half circle to a curb slot (~2 s).
3. **At curb, drop-off** (waiting) — guest stands by the car. Player options:
    - Park → job queued; patience stops when the valet reaches the car → whales pay arrival tip → **Parked**.
    - Wave Off → guest drives away to general parking → **Gone** (apply wave-off heat).
    - Greet (limo only) → tip → **Gone**.
    - Pawn Off (power-up) → a Newbie NPC valet takes it → **Gone**, no tip, no heat.
    - Patience ends → non-whales leave angry → **Gone**; whales stay and escalate.
4. **Parked** — guest is inside the hotel for a random stay of 45–150 s.
5. **Pickup requested** (waiting) — guest appears at the door with a ticket icon; car must be fetched.
6. **Car at curb** — handoff; pickup tip paid → **Gone**.
7. Pickup patience ends → non-whales take a cab and leave angry (heat, car disappears from the lot); whales stay and escalate.

Guest who leaves angry from Parked or Pickup requested removes their car from the lot (it's "towed home" — keeps the lot from silting up).

## Patience and speech bubbles

Impatience starts the instant a guest waits and is shown only through bubbles and body language, never a bar. Stages are fractions of that guest's patience.

| Stage | Patience used | Bubble | Body language |
| --- | --- | --- | --- |
| 0 Calm | 0–20% | none | idle |
| 1 Murmur | 20–45% | `...` / `hmm` / `ahem` | looks around |
| 2 Annoyed | 45–70% | `excuse me?` / `hello??` / `?` | foot tap |
| 3 Angry | 70–90% | `!` → `!!` → `?!` | arms crossed, face reddens |
| 4 Grawlix | 90–100% | `@#$%&!` (Q*bert style), random symbols swapping every 0.3 s | jumping, red, shaking |
| 5 Whale meltdown | past 100% (whales only) | grawlix grows, flashes, screen-edge red pulse | phone held up ("calling the manager") |

- Bubbles are 8-bit boxes with a pointer tail, drawn above the guest, max ~8 characters. Pick a random line per stage from a list in CONFIG.
- Whales use posh lines at stage 1–2 (`I say...`, `Do you know who I am?`).
- Each stage change plays a rising one-note blip; grawlix plays a short noise burst.
- When multiple bubbles overlap, stack them upward; the newest on top.

## Heat, tips and getting fired

Heat (the complaint score) runs 0–100; at 100 you're fired and the run ends. Money is the score; heat is the clock.

**Heat sources**

- One-off penalties: angry departures, wave-offs and ignored limos (values in the tier table); temp slot occupied over 60 s: +1 per 30 s.
- **Whale escalation:** once a whale's patience runs out (drop-off or pickup), heat ticks every second, starting at +0.5/s and growing +0.5/s every 10 s, uncapped, until served. Ultra whales start at +1.0/s and grow +1.0/s every 10 s.
- **Spiral multiplier:** every heat gain is multiplied by `1 + heat / 100`, so 60 heat makes everything hit 1.6× harder. Intentional.

**Heat repair**

- Only whale and ultra-whale **arrival** tips repair heat: `repair = arrival tip × 0.15` (a $100 tip removes 15 heat). Pickup tips never repair.
- Repair only counts if the whale was taken at stage 0–2 (before they got angry). Heat never decays on its own: reputation earned from whales is the only counterweight to complaints.

**Tips**

- Pay and tips add to the money total shown top-left. Tips float up from the guest as `+$45` in gold.
- Whale pickup tips decay 10% per 10 s waited (floor $0); other tiers decay linearly to 50% at their patience end.

**Manager warnings and firing**

- At 50, 75 and 90 heat the manager sprite pops out of the door with a one-line warning ("Last warning, kid.").
- At 100: freeze, manager walks out, "YOU'RE FIRED" splash, run summary. Firing is the comedic set piece, not a punishment screen: the manager gets a random one-liner ("The Bugatto owner is my brother-in-law.", "Security will walk you to the bus."), the valet's hat flies off, and the summary leads with the moment that did it.

**Power-up slots shrink as heat rises:** 5 slots at heat 0–39, 4 at 40–59, 3 at 60–74, 2 at 75–89, 1 at 90+. Dropping a slot discards the most recently earned power-up in it. When heat falls back under a threshold the slot reopens at once, but the discarded card is not restored.

## Power-ups

Power-ups are single-use cards held in slots (max 5, fewer as heat rises). Other valets are not simulated in real time; they exist only as power-up effects and as the rival steal rule below.

| Power-up | Use on | Effect |
| --- | --- | --- |
| Pawn Off on the Newbie | Any non-whale car at the curb | A newbie valet sprite takes the car away. Guest is gone: no tip, no heat. |
| Direct Away | Standard or premium car at the curb | Wave off with zero heat. |
| Ignore | Any waiting guest | Guest takes a phone call: patience frozen 20 s, bubble shows a phone. |
| Bags & Cart | Whale or ultra at the curb | Valet loads bags onto a cart (+2 s to the job); arrival tip ×2, so heat repair ×2. |
| Hustle | Valet | Valet moves at 2× speed for 15 s. |

**Rival steal rule.** When a whale arrives, a 6 s claim timer shows over it. If the player hasn't queued Park or Bags & Cart on it in time, a senior valet sprite runs out and takes it: lost tip and lost repair chance, but no heat. This is the "beat them to the good cars" race.

**Earning.** Each heat-repair event earns 1 Good Feedback star (shown with a thumbs-up pop). Every 2 stars grants a random power-up into a free slot (weights in CONFIG). No free slot = the star is banked until one opens.

**Start of run:** the power-ups chosen in the loadout (see Career progression).

## Career progression and unlocks

Every run feeds a persistent career, so even a short run moves the player forward. Unlocks add options, not raw power: high scores stay comparable and the early-game squeeze stays intact.

**Career XP.** Each dollar earned in a run (pay or tips) adds 1 career XP, fired or not. Nightly goals add bonus XP. XP never adds to the run's money score; the high score stays tips only.

| Rank | Career XP | Unlocks |
| --- | --- | --- |
| Rookie | 0 | Base 5 power-ups; 2 loadout picks |
| Valet | 1,000 | Reserved Sign; blue uniform |
| Senior Valet | 3,000 | Spare Key Board; 3rd loadout pick |
| Head Valet | 7,500 | Bribe the Doorman; black uniform |
| Valet Captain | 15,000 | Fake Smile; white-gloves uniform |
| Legend of the Riviera | 30,000 | Double Shift Coffee; gold name tag |

Rank-up shows a ceremony screen after the run summary: the manager pins a badge on the valet, then "PROMOTED: SENIOR VALET — UNLOCKED: SPARE KEY BOARD".

**Unlockable power-ups.** Once unlocked, each joins the random draw pool and can be picked in the loadout.

| Power-up | Use on | Effect |
| --- | --- | --- |
| Reserved Sign | An empty stall at depth 0 | Holds it for the next whale or ultra for 60 s; other tiers can't park there. |
| Spare Key Board | Valet | The next Restow job completes instantly. |
| Bribe the Doorman | A limo at the curb | Greets it remotely and instantly; the valet doesn't move. |
| Fake Smile | Any waiting guest | Knocks the guest back one patience stage. |
| Double Shift Coffee | Valet | Valet moves at 1.5× speed for 30 s. |

**Loadout.** Before each run, a loadout screen lets the player pick starting power-ups from everything unlocked (duplicates allowed): 2 picks at first, 3 from Senior Valet. Hard cap 3. Default for a new player: Pawn Off + Bags & Cart.

**Nightly goals.** Each run shows 3 optional goals on the loadout screen, drawn from a pool of about 12, each worth 200–500 bonus XP. Examples:

- Serve 5 whales.
- Never use temp slot T4.
- Survive the Gala.
- Wave off 10 beaters.
- Earn a $250+ single tip.
- Finish a 10-minute shift without a grawlix.

Completed goals pop a banner mid-run and are tallied on the summary screen.

**Cosmetics.** Uniform color and the name tag are purely visual; selectable on the loadout screen once unlocked.

**Persistence.** One `localStorage` key holding versioned JSON: `{ version, careerXP, rank, unlocked[], loadout[], cosmetic, highScore, bestStats, goalsCompletedCount, tutorialSeen }`. Wrap reads and writes in try/catch; a missing or corrupt save starts fresh. Settings has a "Reset career" button with confirmation.

**Planned for v1.1: new hotels.** Each is a new lot shape, unlocked by rank, with its own high score. Vegas casino: big lot, long aisles. Dubai tower: small, deep lot. Swiss chalet: lanes open on one side only. Design the map data so a hotel is a config entry, not new code.

## Difficulty and session structure

One endless shift that gets busier until you're fired. A clock in the HUD runs from 6:00 PM, one game-hour per 90 real seconds, purely for flavor and the end summary.

| Game hour | Arrival interval | Tier mix (beater / standard / premium / whale / ultra / limo) |
| --- | --- | --- |
| 6–7 PM | every 9–12 s | 30 / 35 / 20 / 10 / 0 / 5 |
| 7–9 PM | every 7–9 s | 20 / 30 / 25 / 15 / 5 / 5 |
| 9–11 PM | every 5–7 s | 15 / 25 / 25 / 20 / 8 / 7 |
| 11 PM+ | every 4–6 s, −0.2 s per hour, floor 2.5 s | 10 / 20 / 25 / 25 / 12 / 8 |

- Lot starts with 12 pre-parked cars (random tiers, mostly beaters and standards) so depth matters from minute one. Their owners request pickups on the normal schedule.
- **Event (v1, one only): The Gala.** Once per run around 10 PM, a banner announces a gala: for 60 s, arrivals come every 2–3 s and the mix is 50% whale/ultra/limo. Big repair opportunity, big risk.
- A target good run lasts 8–15 minutes.

**Clock out.** From 10 PM a CLOCK OUT button appears in the HUD. Ending the shift voluntarily banks the run's tips as its score, counts for the high score and awards career XP as normal. Before 10 PM the only way out is being fired. Without this, every run ends in failure and nobody ever "wins" a night.

## UI, screens and audio

**HUD** (top strip, 10 px tall, over the hotel facade)

- Left: money total (`$1,240`) and game clock.
- Center: heat bar labeled MANAGER, green → yellow → red, pulsing above 75.
- Right: power-up slots (locked slots shown with a padlock) and Good Feedback stars.
- Bottom strip: job queue icons (car + destination), tap to promote, X to cancel.

**Screens**

1. Title: hotel at night, neon "MONTE CARLO VALET" sign, Start / How to Play / Settings / Mute. Shows high score and career rank (see `art/00_title_screen.png`).
2. Tutorial: guided, interactive, offered once on first launch (Play tutorial / Skip); afterwards only from the title menu. Also a 3-panel How to Play for a quick refresher.
3. Loadout: pick starting power-ups, see tonight's 3 goals, choose uniform. Shows career XP bar to next rank.
4. Game.
5. Pause overlay (P / Esc).
6. Shift over: manager splash (fired) or a clocking-out animation, then summary — total tips, cars parked, whales served, biggest tip, worst grawlix moment (longest whale wait), time survived, goals completed, XP earned, high score. Retry button.
7. Promotion (only on rank-up): badge ceremony and unlock card.
8. Settings: mute, reset career.

**Feedback**

- Stall highlight shows depth (0–3) and estimated job seconds.
- Tips float up in gold; heat gains float up in red near the HUD bar.
- Screen shake (1 px) on whale meltdown and manager warnings.

**Audio** (generated chiptune): car arrival honk (higher pitch for exotics), engine putt while driving, coin jingle on tips, rising blips for bubble stages, noise burst for grawlix, manager whistle on warnings, sad descending jingle on firing, one upbeat lounge-jazz-in-8-bit loop that speeds up 5% per game-hour.

## Tuning config defaults

All numbers in this spec are starting values, not final balance. Put them in one object at the top of the file so they can be tuned without touching logic. Suggested shape:

```javascript
const CONFIG = {
  lot:   { orientation: 'horizontal', lanes: 6, stallsPerLane: 8, stallPx: [16, 15],
           tempSlots: { west: 2, east: 2 }, curbSlots: 4,
           streetQueueMax: 3, prefilledCars: 12, tempOverstaySec: 60 },
  speed: { driveBaseSec: 0.6, drivePerTileSec: 0.12, walkPerTileSec: 0.25,
           greetSec: 2, bagsExtraSec: 2, jobQueueMax: 4 },
  tiers: {
    beater:   { pickupTip: [1, 3],    dropPatience: 25, pickPatience: 45, angryHeat: 2,  waveOffHeat: 0, waveOffHeatChance: 0.25 },
    standard: { pickupTip: [5, 10],   dropPatience: 25, pickPatience: 50, angryHeat: 4,  waveOffHeat: 3 },
    premium:  { pickupTip: [15, 30],  dropPatience: 20, pickPatience: 40, angryHeat: 8,  waveOffHeat: 12 },
    whale:    { arrivalTip: [40, 100], pickupTip: [50, 150], dropPatience: 12, pickPatience: 20,
                escalateStart: 0.5, escalateStep: 0.5, escalateEverySec: 10 },
    ultra:    { arrivalTip: [100, 250], pickupTip: [100, 300], dropPatience: 10, pickPatience: 12,
                escalateStart: 1.0, escalateStep: 1.0, escalateEverySec: 10 },
    limo:     { greetTip: [40, 80], greetPatience: 15, ignoredHeat: 6 },
  },
  heat:  { max: 100, repairPerDollar: 0.15, repairMaxStage: 2, spiral: true,
           warnings: [50, 75, 90], slotThresholds: [40, 60, 75, 90] },
  pay:   { beater: 2, standard: 4, premium: 8, whale: 15, ultra: 25, limo: 10, compAfterPatience: true },
  tips:  { whalePickupDecayPer10s: 0.10, otherDecayFloor: 0.5 },
  power: { maxSlots: 5, starsPerPowerup: 2, rivalClaimSec: 6, ignoreSec: 20,
           hustleSec: 15, hustleMult: 2, reservedSec: 60, coffeeSec: 30, coffeeMult: 1.5,
           weights: { pawnOff: 3, directAway: 3, ignore: 2, bags: 2, hustle: 2,
                      reserved: 2, spareKeys: 2, bribe: 2, fakeSmile: 2, coffee: 2 },
           base: ['pawnOff', 'directAway', 'ignore', 'bags', 'hustle'] },
  career: {
    xpPerDollar: 1,
    ranks: [
      { name: 'Rookie',                xp: 0,     unlock: [],            loadoutPicks: 2 },
      { name: 'Valet',                 xp: 1000,  unlock: ['reserved', 'uniform:blue'] },
      { name: 'Senior Valet',          xp: 3000,  unlock: ['spareKeys'],  loadoutPicks: 3 },
      { name: 'Head Valet',            xp: 7500,  unlock: ['bribe', 'uniform:black'] },
      { name: 'Valet Captain',         xp: 15000, unlock: ['fakeSmile', 'uniform:gloves'] },
      { name: 'Legend of the Riviera', xp: 30000, unlock: ['coffee', 'nametag:gold'] },
    ],
    loadoutCap: 3, defaultLoadout: ['pawnOff', 'bags'],
    goalsPerNight: 3, goalXp: [200, 500],
    saveKey: 'mcvalet.save', saveVersion: 1,
  },
  stay:  { minSec: 45, maxSec: 150 },
  clock: { realSecPerGameHour: 90, startHour: 18 },
};
```

## Tutorial

A guided, interactive tutorial runs once, on the very first launch, before the first real shift. It opens with two buttons: Play tutorial / Skip. Either choice sets `tutorialSeen = true` in the save, and from then on the tutorial is only reachable from the title menu. It never triggers again on its own, not even after a reset of career progress unless the player also clears the save.

**Format.** A sandbox shift with the clock frozen, arrivals scripted, heat disabled, and no XP or score recorded. Each step highlights the one thing to tap (everything else dims), shows a one-line caption in the bitmap font, and waits for the player to do it. No step can be failed; a wrong tap just wiggles the highlight. A Skip button stays in the corner throughout.

**Steps (about 90 s total)**

1. Park a standard car: tap the car, tap a lane end, watch the valet go. Caption: "Tap a car, then a lane."
2. Park a second car into the same lane; the depth number shows. Caption: "Deeper means slower to get back."
3. A guest comes out with a ticket: fetch the buried car; the blocker goes to a temp slot and the Restow job appears. Caption: "Digging out costs time."
4. A beater arrives: wave it off. Caption: "Cheap cars aren't worth it."
5. A whale arrives with the claim timer: park it fast; the arrival tip floats up and the heat bar (shown briefly) drops. Caption: "Whales tip big and fix your reputation."
6. Let the whale wait on pickup until the grawlix bubble: fetch it. Caption: "Keep them waiting and the manager hears about it."
7. Use the one power-up in the slot (Pawn Off) on a beater. Caption: "Power-ups buy you time."
8. Done: "Make money. Don't get fired." → title screen.

Steps are data-driven (an array in code: scripted arrival, highlight target, caption, completion condition), so they can be reordered or trimmed without touching the game loop.

## Debug tools (required for tuning)

Every number in CONFIG is a guess until someone plays it, so v1 ships with a debug overlay (off by default, `CONFIG.debug = false`; the backtick key toggles it when on):

- Time scale slider 0.25×–4×.
- Set heat to any value.
- Spawn an arrival of a chosen tier; trigger the Gala; fill the lot.
- Grant any power-up; set career XP.
- Show hit boxes, path tiles, job timers and each guest's patience percentage.
- Log every job's planned vs actual duration to the console.

## Scope, acceptance and open questions

**In v1:** everything above — one map (Monte Carlo), one event (Gala), career ranks, 5 unlockable power-ups, loadout, nightly goals, cosmetics, local save.

**Out of v1:** additional hotels (planned v1.1), direct car driving, stat-boosting permanent upgrades, online leaderboard, real-time rival valets, damage/dents, weather, day shifts, story or dialogue.

**Acceptance criteria**

- [ ] Ships as one `index.html` that runs by double-click with no network access.
- [ ] Pixel-perfect integer scaling at any window size; no blurry sprites.
- [ ] Look matches the reference art: palette, 3×5 font, sprite sizes, horizontal lot layout.
- [ ] A car parked 3 deep takes visibly and measurably longer to fetch than one at depth 0, matching the timing model within 10%.
- [ ] Fetches with too few free temp slots are refused with a message, never softlock.
- [ ] All six bubble stages appear and are readable at 1× and 3× scale.
- [ ] A whale left waiting can, by itself, take heat from 0 to 100 (proves uncapped escalation).
- [ ] Whale arrival tips reduce heat; pickup tips never do.
- [ ] Power-up slots shrink at the listed heat thresholds.
- [ ] Rival steals a whale not claimed within 6 s.
- [ ] Career XP, rank, unlocks and loadout survive a page reload; a corrupt save starts fresh without crashing.
- [ ] Locked power-ups never appear in the draw pool or loadout; loadout never exceeds 3 picks.
- [ ] Rank-up triggers the promotion screen exactly once per rank.
- [ ] Nightly goals award XP only, never money score.
- [ ] Reset career clears all progress after confirmation.
- [ ] Changing a `CONFIG` value changes behavior with no other code edits.
- [ ] Pause fully freezes all timers; tab switching auto-pauses.
- [ ] Runs at 60 fps with 48 parked cars and 10 guests on screen on a mid-range laptop.
- [ ] Clock Out appears only from 10 PM and banks the score, high score and XP.
- [ ] Measured job times match the reference timing table within 20%.
- [ ] Lot-full state disables Park and shows LOT FULL; the game never deadlocks silently.
- [ ] Debug overlay works and is off by default.
- [ ] Tutorial offers Play/Skip exactly once on first launch; after that it appears only via the title menu.
- [ ] Tutorial records no score, XP, high score or goal progress.

**Open questions (defaults assumed above; confirm or change)**

- Limos: greet-only at the curb (assumed), or do some need parking too?
- Rival steal rule: is a timed whale steal the right reading of "beat them to the good cars"?
- Parody brand names (assumed) vs real makes.
- Should reputation also come from fast whale pickups, or strictly arrivals only (assumed)?
- Rank XP thresholds: tuned so Legend takes roughly 15–25 runs; confirm after playtesting.
- Whale drop-off patience (12 s) is shorter than a worst-case fetch (~14 s), so any whale arriving mid-dig will go red. Intended, but likely too harsh in the first two game-hours; consider scaling patience by hour (e.g. 18 s at 6 PM down to 12 s by 9 PM).
- Walk-back time dominates job cost (a 20-tile walk is 5 s vs 3 s driving). Decide whether that's the feel you want or whether the valet should jog.
