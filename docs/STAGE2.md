# Monte Carlo Valet: Stage 2 plan

> **Status (v2.0): built.** Everything below is implemented except cloud save and real payments (Stage 3). The paid features are wired to a store switch that is off, so all content is currently free. Code layout: `docs/ARCHITECTURE.md`.

Stage 1 is a single, replayable shift. Stage 2 turns it into a **career**: every shift (fired or not) moves you forward, there are multiple **hotels** (levels), and it all works **offline**. Paid features are layered on top without making the game pay-to-win.

## 1. Continuity: the career

| Piece | How it works |
| --- | --- |
| **Career XP** | Every dollar earned in a shift = 1 XP, even if you get fired. Nightly goals add bonus XP. XP never touches the shift's score, so high scores stay fair. |
| **Ranks** | Rookie (0) → Valet (1k) → Senior Valet (3k) → Head Valet (7.5k) → Valet Captain (15k) → Legend of the Riviera (30k). Rank-up ceremony after the summary: the manager pins a badge on you. |
| **Unlocks** | Each rank unlocks something *new to do*, not raw power: new power-ups (Reserved Sign, Spare Key Board, Bribe the Doorman, Fake Smile, Double Shift Coffee), extra loadout slot, uniforms, and new hotels. |
| **Loadout** | Before each shift pick 2-3 starting power-ups from what you've unlocked. |
| **Nightly goals** | 3 optional goals per shift (e.g. "Serve 5 whales", "Meet the helicopter VIP", "Never use T4", "Finish without hiring help"), 200-500 XP each. |
| **Crew roster (new)** | The valets you hire become named regulars who stay with you between shifts. They gain experience and get a little faster, and their hourly wage goes up as they improve. |
| **Save** | One versioned save in the browser (`localStorage`): XP, rank, unlocks, loadout, crew, high score per hotel, best stats. Includes reset with confirmation. |

## 2. Levels: hotels

Each hotel is a **config entry** (lot shape, curb, temp slots, tier mix, special event), not new code, so adding hotels is cheap.

| Hotel | Unlock | What's different |
| --- | --- | --- |
| **Monte Carlo** (current) | Start | Balanced lot, helipad VIP, the Gala. |
| **Las Vegas Casino** | Valet | Huge lot, long aisles - walking time matters; 24/7 rush, more whales. |
| **Dubai Tower** | Head Valet | Small, deep lot; supercars everywhere; helicopters several times a night. |
| **Swiss Chalet** | Valet Captain | Lanes open on one side only (no second entry); snow slows driving. |

Each hotel keeps its own high score and a 3-star rating (survive / clock out / beat target).

## 3. Offline

- Turn the site into a **PWA** (installable web app): add a manifest + service worker so it installs on phone/desktop and plays with no connection.
- Everything above saves locally, so offline progression works out of the box.
- **Cloud save** (play on phone, continue on PC) needs a small backend + login, which is a later step (Stage 3).

## 4. Paid features (optional, no pay-to-win)

| Option | Notes |
| --- | --- |
| **Hotel packs** | Base game free with Monte Carlo + Vegas; Dubai/Swiss as a one-time unlock. |
| **Supporter edition** | One-time purchase: all hotels, gold uniform, credits name. |
| **Cosmetics** | Uniforms, name tags, podium/hotel skins. |
| **Store wrappers** | Same code shipped to iOS/Android via Capacitor, or itch.io / Steam for desktop. |

Purchases need either the app stores' billing (mobile) or a payment provider like Stripe plus a tiny server to verify unlocks (web). That small server is also what cloud save would use.

## Suggested build order

1. Career save + XP + ranks + rank-up screen
2. Loadout + nightly goals
3. PWA offline install
4. Second hotel (Vegas) - proves the hotel-as-config system
5. Crew roster
6. Remaining hotels, then paid unlocks
