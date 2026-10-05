# Backgammon — play-flow audit (batch 1)

- Identity: catalog id 154, registered. `Games/Backgammon/`, entry
  `Games/Backgammon/index.html` (blob `894d50700ccf2bda9654a850a3b9059da5364a87`),
  source baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`. 6 files / 45,138 B.
  Provenance comment in entry: rules engine + AI from
  `github.com/binarymax/backgammon.js`, MIT (LICENSE blob `b4c47aee`),
  Max Irwin 2013; `engine.js` = vendored main.js/game.js with debug line
  removed, `brain.js` AI verbatim; board UI is new here.
- Validation status: **CODE-REVIEW ONLY**. No browser run by this worker.

## Source inspected

- `index.html` (blob above), read fully. Screens: `#startScreen` (h1, rules
  `.controls-doc` lists, `#playBtn`), `#gameScreen` (`.hud` chips:
  `#hudScore`, `#hudRecord`, `#newMatchBtn`, `#menuBtn`; `#board`,
  `#status` aria-live, `#note`, `#legend`), `#overlay` (`#resultTitle`,
  `#resultText`, `#resultPts`, `#nextMatchBtn`, `#overlayMenuBtn`).
- `script.js` (blob `99acd0b2e76547de0b50c0fd8b595c2af9c9c7f`, 374 lines),
  function inventory + bindings inspected (not every line):
  `$()` helper, `buildBoard()`, `makePoint(p)`, `clickPoint/clickBar/clickOff`,
  `computeTargets(src)`, `playerTurn()`, `movesLeft()`, `render()`,
  `doMove(src,tgt)`, `endMatch()`, `newMatch()`, `showGame(on)`, `toMenu()`;
  listeners: `playBtn`, `menuBtn`, `overlayMenuBtn`, `newMatchBtn`,
  `nextMatchBtn` (lines 359-369), point/bar/off click targets.
- Held: `engine.js` (blob `048afda7f81608a831d9d9da103be6b8836efa46`) and
  `brain.js` (blob `598e327f16c335cedb3f10b5fc3767258c32cd19`) — rules and AI
  bodies not read; `style.css`.

## Flow (from source)

- Boot: static `#startScreen` visible; `#gameScreen`/`#overlay` `hidden`.
- Start: `#playBtn` → `showGame(true)` builds board via `buildBoard()`.
- Input: pointer — tap checker → `clickPoint(p)` → `computeTargets` lights
  legal destinations; bar/off trays have dedicated click handlers.
  Keyboard — entry documents Tab/Shift+Tab focus + Enter/Space confirm; focus
  semantics live in generated button DOM (per-cell `<button>` from
  `makePoint`), wiring details not fully read.
- Core loop: `playerTurn()` rolls (auto per entry copy), `render()` redraws,
  human `doMove` → engine validation → `brain.js` computer reply (engine held).
- Score/progression: `#hudScore` chip, `#hudRecord` "Won L : Lost";
  entry copy states 5 pts per blot, 2 per checker borne off, 100 match win.
  Scoring arithmetic lives in `script.js`/`engine.js` ranges not read
  line-by-line — treat numbers as entry copy, partially verified.
- Win/lose: `endMatch()` fills `#overlay` (`#resultTitle`, `#resultText`,
  `#resultPts`), then `#nextMatchBtn` → `newMatch()` or `#overlayMenuBtn` →
  `toMenu()`.
- Restart/exit: `#newMatchBtn`, `#menuBtn`, overlay buttons — all verified
  bound in `script.js` lines 359-369.

## UI bloat: MILD

- `#startScreen` carries two `.panels` of rules + controls text (long, but it
  is the genuine pre-game menu with a Play button, not a recurring nag).
- In-game HUD chips are genuine. `#legend` explanatory strip is persistent in
  game — small, useful, could compress.
- No ads, no decorative modals.

## Popups / modals

- `#overlay` only: shown by `endMatch()` at match end; buttons dismiss it.
  One-time per match. No `alert`/`confirm` seen.

## Animation / simulation

- DOM re-render model (`render()` rewrites `#board` cells); no canvas/RAF.
  Dice/result text updated through `#status`/`#note`. No decorative animation
  observed in source.

## Findings

- LOW — start screen duplicates controls/rules prose also present in
  `#legend` during play; root `index.html` `#startScreen` `.panel`s. If
  touched, consolidate into one-time help; keep `#legend` short form.
- Held — `engine.js`/`brain.js` internals (rules edge cases, AI strength,
  exact scoring values) not inspected; smallest needed check: read both files
  (they are small) before certifying rules fidelity.

## Recommended playable view

Keep `#gameScreen` HUD, board, `#status`, `#overlay` result. Move the long
start-screen rules into one-time acknowledged help with reopen. No recurring
popups exist.
