# Catalog part 6: provenance

All five games in this batch were **ingested** from permissively-licensed
open-source repositories (all MIT, LICENSE file shipped inside each game
folder). None were built from scratch. No third-party art, audio or fonts are
bundled; every visual is flat CSS/canvas drawn by the shipped code.

## Mastermind (Games/Mastermind/)

- **Repo:** https://github.com/timjb/meisterhirn
- **License:** MIT (LICENSE shipped)
- **Commit:** 5e001308868f9ec4771e91ad8ff8e9ae6a1c6675
- **Files taken:** `lib/meisterhirn.js` (vendored as `engine.js`, MIT header
  preserved), plus `LICENSE`. The Model (secret-code generation, duplicate-safe
  `judge()` feedback), Controller and canvas View ship essentially unchanged.
- **Rejected from the same repo:** `assets/wood.jpg` (texture of unclear
  provenance), `assets/lobster.otf` (Lobster font, SIL OFL, not needed), the
  `http://s3.amazonaws.com` GitHub ribbon image and the appcache manifest, all
  dropped for the offline / no-external-assets policy.
- **Modifications:** `icons.bubble` radial-gradient glow replaced with a flat
  fill plus a solid darker ring (flat-color house rule); all remaining view
  colors, fonts and win/lose/give-up messages supplied through the engine's own
  options object (flat palette, house copy); new wrapper: start screen with
  documented controls, keyboard play (arrow cursor drawn as a DOM overlay,
  keys 1-6 place colors via the engine's own `select` event, Enter submits,
  Esc closes the color popup), give-up / new-round / menu buttons, running
  round score, responsive grid width, autosolver Web Worker disabled
  (`new Meisterhirn(..., false)`).

## Nim (Games/Nim/)

- **Repo:** https://github.com/morimay421/nim
- **License:** MIT (LICENSE shipped)
- **Commit:** b7f83925b3077c253099eedabf00c389fa9e3e89
- **Files taken:** the whole game (single `index.html` core: pile state,
  take-1/2/3 flow, modulo-4 AI, reset path), rewritten in place.
- **Modifications:** emoji stones replaced with flat CSS circles and emoji
  copy with plain text; radial-gradient background flattened; added start
  screen with documented controls, optional misere mode toggle with the
  correct misere AI strategy (leave count = 1 mod 4), running round score,
  keyboard input (1/2/3 take, N new round, Esc), round-end overlay with
  restart and menu paths, and timeout cleanup on menu/round changes.

## Dots and Boxes (Games/DotsAndBoxes/)

- **Repo:** https://github.com/ayahae79/Dots-and-Boxes
- **License:** MIT (LICENSE shipped)
- **Commit:** 5cadc8235bf2a108af47837c5fd89ba32f1eac2a
- **Files taken:** `script.js` core (9x9 dot/line/box grid construction,
  four-side completion check, turn switching, 10-point scoring, winner panel
  flow) and `style.css` layout metrics; `LICENSE`.
- **Rejected from the same repo:** Google Fonts / Material Symbols links
  (offline policy), `homeScreen.png` / `gameScreen.png` screenshots, the
  rotating-gradient 3D panels and bounce-glow animation.
- **Modifications:** home page and game page merged into one screen; start
  screen with documented controls; computer opponent (greedy AI: completes
  three-sided boxes, otherwise avoids gifting a third side, else safe move);
  keyboard cursor (arrow keys over the grid, Enter/Space claims); flat restyle
  (no gradients); end overlay with win/lose/draw text, play-again and menu
  paths; `data`-class ownership instead of inline background colors.

## Ultimate Tic-Tac-Toe (Games/UltimateTicTacToe/)

- **Repo:** https://github.com/ZLouisMiguel/ult
- **License:** MIT (LICENSE shipped)
- **Commit:** 589416481de5aa70829b1c7221791649932ad5f1
- **Files taken:** `src/js/engine.js` (nested board state, forced-cell
  `validateMove`, `applyMove` with send rule and global win/draw detection),
  `src/js/computer.js` (depth-5 alpha-beta minimax with board-aware move
  ordering), `src/js/ui.js` (board rendering, end dialog, toast),
  `src/js/script.js` (mode handling, AI scheduling, reset flow); CSS and
  `LICENSE`.
- **Rejected from the same repo:** `src/js/remote.js` + `server/` WebSocket
  multiplayer (needs a running server, offline policy), the lobby UI,
  `assets/rule1-3.png` (1.5 MB of rule screenshots, replaced by text rules).
- **Modifications:** upstream shipped broken at HEAD (`bindOnlineEvents` was
  called but never imported, so landing buttons did nothing); menu buttons
  rebound directly to local/computer modes; the four JS modules concatenated
  into one `script.js`; keyboard cursor (9x9 super-grid with arrow keys,
  Enter/Space to play, Esc closes the end dialog); match scoreboard; em-dash
  and typo copy fixed; responsive cell sizing so 360px screens do not
  overflow; lobby/online dead code removed.

## Klondike Solitaire (Games/KlondikeSolitaire/)

- **Repo:** https://github.com/AJimber/KMN_Solitaire
- **License:** MIT (LICENSE shipped)
- **Commit:** c25d7a989898fa5e1db3aff41950b2106d9fba97
- **Files taken:** `game.js` (deck/shuffle, deal of 7 tableau piles,
  stock/waste recycle, foundation and tableau move validation, drag and
  click-to-move, auto-foundation, undo history, timer and move counter, win
  dialog), `styles.css` layout metrics; `LICENSE`.
- **Rejected from the same repo:** `assets/card-back.svg` (replaced by a flat
  card back), the leave-warning checkbox + `beforeunload` prompt, the
  Tab-blocking keydown handler, and Spanish copy (translated).
- **Modifications:** start screen with documented controls; keyboard play
  (Tab to cards, Enter moves, Shift+Enter to foundation, S draw, U undo,
  N new game) with focus restore across renders; no-moves-left lose state
  with a real `hasAnyLegalMove()` deadlock check (stock empty, waste top
  immovable, no tableau or foundation move); flat restyle (gradients removed);
  buttons made tabbable; menu path stops the timer.
