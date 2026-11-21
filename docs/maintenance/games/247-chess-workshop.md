# Chess Workshop

<!-- maintenance-game: Games/Chess Workshop -->

## Identity and status

Chess Workshop is catalog entry 247. It is a separate single-player chess
game with local Stockfish play, generated tactics, on-demand reviews and a
visual bot builder. The existing Chess entry and Capital Drive keep their own
entries and assets.

## Implementation map

- `index.html`, `style.css` and `board.js` provide four responsive views. The
  board adapter uses Lichess Chessground for input and rendering, with legal
  destinations and promotion choices supplied by chess.js. The adapter derives
  coordinates from legal SAN per occupied square, avoiding construction of
  full verbose move snapshots simply to show choices. Keyboard square buttons
  remain available.
- `appearance.js` and `appearance.css` supply board themes, custom colours,
  piece sets, display controls and browser-local settings.
- `app.js` owns view state, move application, goals and review navigation.
  It appends new notation cells, fixes the allowance at the start of each bot
  turn, resumes interrupted
  turns with their remaining moves and caps Stockfish work at 96,000 nodes
  per uninterrupted multi-move turn.
- `turns.js` adapts the pinned chess.js null-move support for bonus turns and
  PGN. The skip keeps the real-move fifty-move clock, clears en passant and
  recomputes the position hash with the correct side to move.
- `bots.js` validates profiles and evaluates event-count rules. `bot-builder.js`
  and `bot-builder.css` provide the visual editor and local bot library.
- `puzzles.js` generates original position variations and verifies every legal
  defence against a forced mate. `puzzle-source.js` owns the reusable
  `puzzle-worker.js` and a bounded local fallback.
- `review.js` rebuilds PGN positions and evaluates each ply with Stockfish.
  Reviews report suggested lines and centipawn changes from White's perspective.
  A 320-position in-memory cache uses repetition-relevant histories.
- `engine.js` owns a lazy single-threaded worker and sequential searches.
  Cancellation issues a UCI stop and drains the response before reusing the
  worker. Reversible legal move history is passed to Stockfish for repetition.
  A bounded verified history prefix avoids replaying unchanged moves, and the
  worker receives strength options when those options change. All runtime
  dependencies are local.

## Gameplay and controls

Drag a piece, or select its square and destination. The keyboard moves focus
with the arrow keys and selects with Space or Enter. Promotion opens a four-piece
chooser. Flip board changes orientation. Appearance offers Workshop, Walnut,
Moss and Slate colours, fully custom square colours, Cburnett, Merida and
Unicode pieces, and toggles for coordinates, legal dots and move animations.

Play offers Stockfish, Fading Stockfish and Draw Trial. Fading Stockfish starts
at 2250 Elo and subtracts 50 after each of its moves until the 100 target floor.
Below the Stockfish rating range, weaker targets mix in random legal moves.
Draw Trial starts in a balanced pawn ending and counts actual stalemate,
repetition, insufficient material or fifty-move-rule draws as success.

Double and Triple Stockfish are allowed two or three consecutive moves per bot
turn, respectively. Momentum Stockfish starts at one and gains one move on later
turns for each capture, up to four. A check gives the next move to the player.
A completed game ends the turn. Every actual move still follows chess legality.
When the bot continues its turn, the move list records a Pass on the player's
side. The bot can also take a bonus opening turn when playing as White.

Puzzles offers mate in one, mate in two or a mix. Hint highlights a legal mating
line. The procedural generator has no session quota and avoids recent repeats.
The mode focuses on forced-mate motifs across seven position templates.

Review accepts a pasted PGN or a game played in Chess Workshop. The board can
step through the game while Stockfish works. A per-position node budget bounds
the engine's work. There is no app-imposed review count or ply quota.
Workshop Bonus Turns PGNs retain replayable skipped turns. Review labels actual
moves as position estimates under standard alternating play. It does not assign
move-quality grades to a position played under the bonus-turn rules.

Bot Studio supports drag-and-drop and select-then-place. The rule input lists
bot moves, player moves, bot captures and bot checks. The output raises or drops
the Elo target or move allowance by a chosen integer. A profile chooses its
name, starting Elo, starting moves per turn (one to four), rules, and whether
the player should win or draw. Move-count blocks affect the allowance at the
start of a turn. Elo blocks can change strength on each actual move. Save,
edit, delete, play, and import/export are available in the studio. Playing an unsaved draft keeps it
selectable for new matches in the current tab.

## State and persistence

Local storage retains board appearance, up to 24 custom profiles, the
puzzle-solved count, and the most recent reviewed or completed match as PGN. Profiles can be exported as
portable JSON. The current match, search and puzzle remain bounded by the page
session. Storage denial leaves play and the in-tab profile library available.

## Dependencies and provenance

The chess rules use Jeff Hlywa and contributors' chess.js 1.4.0 (BSD 2-Clause).
The engine is Stockfish 17.1 Lite plus the Stockfish.js browser port by Nathan
Rugg and Chess.com (GPLv3) and the Lite network by Linmiao Xu. The game credits
link directly to the matching source archive, including the NNUE file. See the
[vendor provenance and pinned hashes](../../../Games/Chess%20Workshop/vendor/README.md).
The board uses [Lichess Chessground 9.2.1](../../../Games/Chess%20Workshop/vendor/chessground/README.md).
The optional [Lichess piece sets](../../../Games/Chess%20Workshop/vendor/lichess-pieces/README.md)
retain their artist credits and licences. The authored Chess Workshop
application is available under GPLv3 or later. Credits provide matching
Chessground source, the application source, and separate vendor notices.
The UI uses the repo's Atkinson Hyperlegible fonts.

## Audit findings

The first search downloads the bundled approximately 7 MiB WASM file from the
game's origin. All subsequent analysis uses the single local worker. Results
are bounded-depth estimates. Configured Elo values are strength targets and
have no external calibration in this game. The 100–1319 range uses an
approximation by mixing in random legal moves. Bot profiles are data-only and
are never executed as JavaScript.

## Safe iteration

Keep legality in chess.js, engine commands in the worker adapter, and rule
execution in the validated profile model. Preserve rule import validation,
cancellation on view changes and local-only runtime loading. Update pinned
source and SHA-256 evidence when replacing vendor files.

## Verification

```sh
node scripts/test_chess_workshop_bots.mjs
node scripts/test_chess_workshop_board.mjs --benchmark
node scripts/test_chess_workshop_turns.mjs
node scripts/test_chess_workshop_engine.mjs
node scripts/test_chess_workshop_puzzles.mjs
node scripts/test_chess_workshop_puzzle_source.mjs
node scripts/test_chess_workshop_review.mjs
timeout 120s python3 -B scripts/test_chess_workshop_browser.py
python3 -B scripts/check_maintenance_docs.py
python3 -B scripts/generate_sitemap.py --check
```

The engine suite runs the actual bundled WASM. Puzzle checks cover 288 seeded
positions and test the legal replies to mate-in-two openers. Review checks
include Black's evaluation sign, promotion, draws and invalid PGN setups.
Native Chromium checks cover piece and rule dragging, actual engine replies,
rating changes, PGN review and replay, draw challenge setup, local profile
persistence, touch tactics and rule placement, square sizing, and local-only
requests at desktop and 390px phone viewports.

The Lichess board update added regressions for native phone drag, draft-bot
restarts, promotion cancellation, keyboard manoeuvres, appearance persistence,
and stale puzzle requests. On the tested initial-board selection in Chromium,
board DOM mutation records dropped from 565 to 10. In one local Node/WASM
comparison, eight active
cancellations followed by searches used one engine boot instead of nine
(0.71 s versus 3.16 s). Repeating one 20-ply PGN in the same warmed session
used zero new searches instead of 21. In a 1,280-puzzle mate-in-two generation
sample, p95 fallback time dropped from 64.9 ms to 11.3 ms. Normal browser
generation runs on the worker. The extended puzzle suite covers 738 cases.

For the bonus-turn update, a local Node benchmark over 205 positions timed
median board move-list construction dropped from 481.96 ms to 42.48 ms
with identical legal choices. A separate simulated-worker benchmark reduced
history validation and command preparation for 144 searches from 522.35 ms
to 22.79 ms. The latter excludes Stockfish's search time. Native
browser tests cover real multi-move play, rule-driven allowances and variant
review. The turn fixture covers skip bookkeeping and terminal interruption.

## Future outlook

The current engine and profile format leave room for additional puzzle goals,
time controls and visual rule blocks. Profile portability presently uses
JSON files exchanged by players. Profiles saved before bonus turns load with
a one-move allowance.
