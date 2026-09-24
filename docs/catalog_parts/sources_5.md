# Catalog part 5: provenance

## Puzzle 15 (Games/Puzzle15/)

- **Repo:** https://github.com/arnisritins/15-Puzzle
- **License:** MIT, Copyright (c) 2015 Arnis Ritins
- **Commit:** 47c82f10865b698fbecc55006a23703cdde83249
- **Files taken:** `index.html`, `15-puzzle.js`, `15-puzzle.css` (merged into one
  `index.html`).
- **Modifications:** `confirm()` win dialog replaced with an in-page result overlay;
  start screen with documented controls, move counter, clock and crash-guarded
  localStorage best score; arrow/WASD keyboard input; fixed the upstream
  `cell.clasName` typo; input locked while the shuffle walk runs; responsive
  percent-based cell positions (no overflow at 360px); flat colors, 44px+ touch
  targets, restart path, no external resources.

## Peg Solitaire (Games/PegSolitaire/)

- **Repo:** https://github.com/sunjay/peg-solitaire
- **License:** MIT, Copyright (c) 2015 Sunjay Varma
- **Commit:** 50c447a770e9dd2fa08fd2949f2b67a10ac5d9df
- **Files taken:** `board.js` (rules engine, verbatim), `main.js` + `index.html` +
  `styles.css` (rewritten as plain DOM view/controller in one file). `helpers.js`
  not needed after the rewrite.
- **Modifications:** removed the jQuery/Handlebars/Bootstrap CDN links and the
  "Fork me" ribbon (upstream was not offline-capable); rendering rewritten to plain
  DOM; added win (one peg left) and lose (no jumps left) states, which upstream had
  none of; start screen with controls, move/peg counters, 10-step undo, arrow-key
  cursor with Enter to select/jump; flat colors, 44px+ touch targets, no external
  resources.

## Checkers (Games/Checkers/)

- **Repo:** https://github.com/stroibot/Checkers
- **License:** MIT, Copyright (c) 2018 stroibot
- **Commit:** 1d0ba0ca0394fdee49a5ba08d7224b30c6cfa524
- **Files taken:** `scripts/Logger.js`, `scripts/Message.js`, `scripts/Tile.js`,
  `scripts/Checker.js`, `scripts/Board.js`, `scripts/DrawManager.js`,
  `scripts/GameManager.js`, `scripts/AI.js`, `scripts/ButtonController.js`,
  `scripts/index.js` (ten scripts merged into one `index.html`), plus
  `styles/main.css` adapted.
- **Modifications:** removed the emoji-css CDN link, background image and gradient,
  the `Board.Print` debug method and the unused Rules menu; 10x10 board reduced to
  standard 8x8 (12 pieces per side) so every tile keeps a 44px+ touch target at
  360px; king crown emoji-css icon replaced by a flat CSS ring; added start screen
  with documented controls, live piece counts, game-over input lock (upstream could
  reopen its result modal) and a restart button; arrow-key cursor with Enter to
  select/drop; flat colors, no external resources.

## Reversi (Games/Reversi/)

- **Repo:** https://github.com/alex-berson/reversi
- **License:** MIT, Copyright (c) 2022-2024 Alexander Berson
- **Commit:** c9c1cdc87e03d131463737bbc6e401a9df65f4ac
- **Files taken:** `js/ai.js` (MCTS player, verbatim), `js/ui.js`, `js/reversi.js`
  (rules + turns), `css/style.css` adapted. `service-worker.js` and the manifest
  deliberately not taken; no icon/web fonts vendored (system font stack only).
- **Modifications:** three scripts merged into one `index.html`; added start screen
  with documented controls, HUD with live disc counts, pass notices, end-result
  overlay with Play again and a restart button; arrow-key cursor with Enter to
  place; `setBoardSize` made idempotent and resize-safe (board capped at 480px,
  44px cells at a 360px viewport); removed the body-wide touchstart zoom blocker
  and the staggered count animation; rematch keeps you on black instead of swapping
  sides; flat colors, no external resources. Attribution footer kept on the page.

## Battleship (Games/Battleship/)

**Built in-house, no OSS mirror found.** GitHub search ("battleship javascript game
MIT") reviewed before building; permissive candidates all rejected:

- `perugi/battleship` (MIT): source is webpack modules (`src/*.js` + tests), only a
  built `dist/` bundle with image assets and source maps is runnable; no build chain
  allowed in this repo. Rejected.
- `johnsonsirv/battleships` (MIT) and `bellom/battleship` (MIT): same story, babel +
  webpack source with no standalone runnable page; `bellom` also ships a 588KB JPEG
  background. Rejected.
- `davymaish/battleship-game` (MIT): plain files, but depends on a second external
  script (`assets/simple_timer.js`) and image assets (board.jpg, miss.png, heart.png),
  links out to the author's github.io, has no opponent grid, no AI return fire, no
  fleet placement, no restart path and a fixed 60-second always-lose end scene.
  Ingesting it would have meant rewriting essentially everything. Rejected.
- Remaining hits were React/Node multiplayer apps (build chains, servers) or engines
  without a UI.

Fallback approved: the shipped game is an original single-file implementation
(8x8 boards, tap-to-place fleet with rotate/undo/randomize, single-shot turns,
hunt/target AI, hit/miss/sunk feedback, win/lose overlays, restart, touch + keyboard,
flat colors, no external resources). Header comment records
"built in-house, no OSS mirror found".
