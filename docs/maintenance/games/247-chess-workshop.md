# Chess Workshop

<!-- maintenance-game: Games/Chess Workshop -->

## Identity and status

Chess Workshop is catalog entry 247. It is a separate single-player chess
game with local Stockfish play, generated tactics, on-demand reviews and a
visual bot builder. The existing Chess entry and Capital Drive keep their own
entries and assets.

## Implementation map

- `index.html`, `style.css` and `board.js` provide four responsive views, an
  interactive board, accessible labels, promotion selection and move notation.
- `app.js` owns view state, move application, goals, opponent turns and review
  navigation.
- `bots.js` validates profiles and evaluates event-count rules. `bot-builder.js`
  and `bot-builder.css` provide the visual editor and local bot library.
- `puzzles.js` generates original position variations and verifies every legal
  defence against a forced mate.
- `review.js` rebuilds PGN positions and evaluates each ply with Stockfish.
  Reviews report suggested lines and centipawn changes from White's perspective.
- `engine.js` owns a lazy single-threaded worker, sequential searches,
  cancellation and timeout handling. All runtime dependencies are local.

## Gameplay and controls

Drag a piece, or select its square and destination. The keyboard moves focus
with the arrow keys and selects with Space or Enter. Promotion opens a four-piece
chooser. Flip board changes orientation.

Play offers Stockfish, Fading Stockfish and Draw Trial. Fading Stockfish starts
at 2250 Elo and subtracts 50 after each of its moves until the 100 target floor.
Below the Stockfish rating range, weaker targets mix in random legal moves.
Draw Trial starts in a balanced pawn ending and counts actual stalemate,
repetition, insufficient material or fifty-move-rule draws as success.

Puzzles offers mate in one, mate in two or a mix. Hint highlights a legal mating
line. The procedural generator has no session quota and avoids recent repeats.
The mode focuses on forced-mate motifs across seven position templates.

Review accepts a pasted PGN or a game played in Chess Workshop. The board can
step through the game while Stockfish works. A per-position node budget bounds
the engine's work. There is no app-imposed review count or ply quota.

Bot Studio supports drag-and-drop and select-then-place. The rule input lists
bot moves, player moves, bot captures and bot checks. The output raises or drops
the Elo target by a chosen integer. A profile chooses its name, starting target,
rules, and whether the player should win or draw. Save, edit, delete, play, and
import/export are available in the studio.

## State and persistence

Local storage retains up to 24 custom profiles, the puzzle-solved count, and the
most recent reviewed or completed match as PGN. Profiles can be exported as
portable JSON. The current match, search and puzzle remain bounded by the page
session. Storage denial leaves play and the in-tab profile library available.

## Dependencies and provenance

The chess rules use Jeff Hlywa and contributors' chess.js 1.4.0 (BSD 2-Clause).
The engine is Stockfish 17.1 Lite plus the Stockfish.js browser port by Nathan
Rugg and Chess.com (GPLv3) and the Lite network by Linmiao Xu. The game credits
link directly to the matching source archive, including the NNUE file. See the
[vendor provenance and pinned hashes](../../../Games/Chess%20Workshop/vendor/README.md).
The UI uses the repo's Atkinson Hyperlegible fonts and Unicode chess glyphs.

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
node scripts/test_chess_workshop_engine.mjs
node scripts/test_chess_workshop_puzzles.mjs
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

## Future outlook

The current engine and profile format leave room for additional puzzle goals,
time controls and visual rule blocks. Profile portability presently uses
JSON files exchanged by players.
