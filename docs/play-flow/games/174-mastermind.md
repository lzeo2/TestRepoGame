# Mastermind play-flow audit (batch 4)

Identity: registered id 174, entry `Games/Mastermind/index.html`, entry blob `6cbda3fea6e10f797be319894bd94166a8b1d4ee`, tree `efa7e979e7523ab2612e6869ac3ff03fe9eee191`, 5 files, 65,154 bytes. Baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`. Manual `docs/maintenance/games/174-mastermind.md` read for orientation; source re-checked directly.

Validation status: **CODE-REVIEW ONLY**. No browser play this run; historical P1b receipts are not this run's test.

## Source inspected

- `Games/Mastermind/index.html` (blob above): ID inventory via grep. Verified: `#startScreen`, `#gameScreen`, `#gameHost`, `#status`, `#hudScore`, `#hudRounds`, `#playBtn`, `#menuBtn`, `#giveUpBtn`, `#newRoundBtn`.
- `Games/Mastermind/script.js` (blob `8e721ba44ea9d26a38b218a80036a67e1ad979c2`, 6,360 bytes): function inventory verified: `createGame`, `gridWidth`, `newRound`, `play`, `recordRound`, `setStatus`, `toMenu`, `updateCursor`, `updateHud`, `updateStatus`.
- `Games/Mastermind/engine.js` (blob `356fc4512ff0f588ce2d74d8d41bfdc291fdae9b`, 51,789 bytes, 1,119 lines): token grep verified `ClickAreas` at lines 156/193/609/844-866/939/1047/1084/1098 (row click/select/check dispatch). Full line-by-line re-read held; give-up flow detail below is orientation from the manual.
- `style.css` (blob `f7fa9cf70c66e3873b77e6bfc7ce7edddbc18a2f`) inventoried, not re-read.

Held: the full `engine.js` controller/view bodies (give-up terminal path, popup listener lifecycle) and `style.css` details.

## Flow

- Boot: `index.html` loads `engine.js` then wrapper; Play (`#playBtn`) calls `createGame` once and constructs `new Meisterhirn({rows:8, cols:4, colors:6, multiple:true}, viewOptions, false)` injected into `#gameHost`. The `false` disables the autosolver Worker (orientation).
- Start/setup: `#startScreen` -> Play -> new round; Menu hides the game; returning Play starts another round.
- Input: pointer via canvas `ClickAreas` (`rowclick/select/check/show/restart`); wrapper keyboard: arrows move `#kbCursor`, digits 1-6 place colors, Enter submits, Escape closes the popup (orientation for exact bindings; wrapper functions `updateCursor`/`updateHud` verified present).
- Core loop: no RAF. Event-driven canvas redraws on clicks/keypresses.
- Score/progression: `#hudScore` session wins/losses, `#hudRounds` completed rounds, `#status` messages; eight rows max; gold/white peg feedback drawn in canvas.
- Win/lose: engine sets won/lost flags; row 8 exhausted is a loss, correct row a win; Give up reveals solution (`#giveUpBtn`).
- Restart: canvas restart icon and `#newRoundBtn` -> `newRound` -> `mm.newGame`. No localStorage persistence.

## UI bloat classification: MILD

Persistent: `#status` line, `#hudScore/#hudRounds`, wrapper header/menu buttons (genuine HUD/menu). The color-select popup is a genuine game control. No ads, no promo cards, no decorative animation. `#kbCursor` is an absolute-positioned helper, essential for keyboard play.

## Popup/modal inventory

- Engine color-select popup (canvas-level `openSelect`/`closeSelect`, orientation): opens on row-hole click or digit entry, closes on selection/Escape; repeatable each turn by design.
- No ad/info/recurring nag popups.

## Animation/simulation

No simulation loop. Canvas redraw per interaction. `openSelect` installs a body-level close listener (orientation; cleanup gap noted in findings).

## Findings

- MEDIUM: `engine.js` Controller `show` (Give up) handler reportedly runs even after a correct final-row win, leaving both `won` and `lost` flags plus give-up copy (orientation from manual; not re-traced this run). Root: terminal handler. Fix: return if the round already ended; wrapper reads one authoritative outcome.
- MEDIUM: `gridWidth` runs only at creation; no resize listener, canvas-only feedback; rotation and nonvisual color identification untested (orientation). Fix: re-scale view on resize, expose labeled equivalents.
- LOW: `openSelect` body listener not removed on keyboard/new-round close (orientation). Fix at shared `closeSelect`.
- Non-finding re-confirmed structurally: `recordRound` exists and is idempotent per round (wrapper function verified).
- No fix needed: duplicate-safe `judge` and the `false` autosolver gate; keep.

## Recommended playable view

Keep canvas, `#status`, `#hudScore/#hudRounds`, `#kbCursor`, popup color picker, Give up/New round/Menu. Move rules text into a one-time acknowledged help with optional reopen. No recurring popups exist.

## Smallest browser check still needed

Submit a full correct row then click Give up and inspect flag/copy; rotate the window after game creation; press Escape from the popup via keyboard; complete an eighth-row loss and one win.
