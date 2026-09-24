# Catalog part 9: provenance

Batch 9: three games **ingested** from permissively-licensed open-source
repositories (3x MIT; LICENSE file shipped in each game folder), two games
**built in-house** because no genuine permissively-licensed candidate met the
offline rules. No third-party art, audio files or fonts are bundled; every
visual is flat CSS/SVG drawn by the shipped code, all audio is synthesized
locally with Web Audio, all word lists are embedded arrays (never fetched).

## Cryptogram (Games/Cryptogram/) - built in-house

- **Reason:** no genuine permissive single-page cryptogram game exists on
  GitHub. Rejected from search: `r2dev2/cryptoduel` (AGPL-3.0, multiplayer
  client, copyleft + wrong shape), `dudek0807/CryptogramClone` (MIT but a
  React frontend + Prisma/Express backend with auth, wrong shape for an
  offline single file), `nicolewhite/cryptogram.py` and other MIT hits
  (Python CLI tools / solvers, not browser games), plus several repos with no
  license at all.
- **Implementation:** 8 public-domain quotes (proverbs and authors who died
  before 1929), self-generated substitution cipher with no identity mappings,
  click/keyboard letter assignment, hint reveals at -15 points, Check gives a
  strike (3 strikes = lose), give-up reveals for 0 points, win by clearing all
  8 puzzles, restart path.

## Word Scramble (Games/WordScramble/) - ingested

- **Repo:** https://github.com/GZ30eee/Word-Scramble-Game
- **License:** MIT (LICENSE shipped), Copyright (c) 2024 Word Scramble Game
- **Commit:** 712322df701b5c7fb3d78b426ec5c245c1de6923
- **Taken:** the full 202-entry word list with hints and difficulty tags
  (`js/words.js`), the Fisher-Yates scramble loop, the per-difficulty timer
  (`common` 20s to `legendary` 35s), the hint line, and the scoring model
  (base 10 + time bonus + streak bonus + difficulty bonus) from `js/script.js`.
- **Rejected from search:** `rahul-kabra/unscramble` (MIT, React app, needs a
  build step), `SriVishalS/Word-Scramble.` (MIT, thin wrapper), several
  repos without a license.
- **Modifications:** inlined into a single `index.html`; Google Fonts import,
  remote images and the GitHub link dropped; emoji removed; `innerHTML`
  replaced with `textContent`; fixed 10-round structure with a 100-point win
  target and lose screen added (original was endless); Reshuffle now
  re-scrambles the same word instead of silently skipping to a new one (which
  would break round counting); start screen documents controls; buttons at
  44px; flat colors.

## Darts 501 (Games/Darts501/) - ingested

- **Repo:** https://github.com/you-sk/game-darts
- **License:** MIT (LICENSE shipped), Copyright (c) 2025 Yusuke
- **Commit:** 514fb3a6568aaf912be2c2aef677ea2609eedd91
- **Taken:** the `DartsGame` engine (SVG board segment generation with the
  standard 201..5 ordering, power/accuracy throw scatter, dart markers,
  floating score popups, throw trail animation, turn history, bust revert to
  turn-start score, victory flow) and the `SoundManager` (Web Audio synthesis,
  fully offline).
- **Rejected from search:** `jorgemorgado/The-Darts-Game` (GPL-3.0, would
  require carrying the full license text and is a 2015 mobile hybrid app),
  most other hits had no license or were scorer spreadsheets.
- **Modifications:** inlined into a single file; Japanese UI translated to
  English; gradients removed (flat colors); emoji removed; **rules corrected
  to real 501**: double-out is always on (original defaulted it off), the
  bullseye now counts as a finishing double (original treated it as a bust),
  and a bust now ends the turn immediately (original kept throwing after a
  bust); combo/camera-zoom/fireworks effects dropped; a 20-turn limit was
  added as the lose condition (win = checkout on a double); start screen
  documents controls; keyboard aiming (arrows + space) added.

## Bowling (Games/Bowling/) - built in-house

- **Reason:** no genuine permissively-licensed playable 10-frame bowling game
  found. Rejected from search: `jae-huh/superflybowling` (MIT but not
  genuine: a button that adds `Math.floor(random()*11)`, 6 balls total, no
  pins, no frames, and a scoreboard with a `totalscore` typo bug),
  `boromo/bowling` (MIT but a Backbone/Bootstrap Jasmine spec harness),
  `tphummel/node-bowling`, `romenrg/kata-bowling-game` and the other MIT hits
  (scoring-kata libraries, not games), multiple repos with no license.
- **Implementation:** top-down lane with aim marker, arrow-key/click aiming,
  pin deck with direct-contact + falling-pin cascade resolution, gutter
  shots, full standard scoring (strikes, spares, pending bonuses, 10th-frame
  three-ball rule) with a running scorecard, win at 100+, restart path.

## Mahjong Lite (Games/MahjongLite/) - ingested

- **Repo:** https://github.com/ScriptRaccoon/mahjong-solitaire
- **License:** MIT (LICENSE shipped), Copyright (c) 2024 ScriptRaccoon
- **Commit:** 89dc27b58ab6501994d43fe11dc216245ff820fa
- **Taken:** the 144-tile turtle layout (`coordinates.js`), the free-tile rule
  `isOpen` with its half-cell side-neighbor logic, the move search / hint /
  restart engine (`main.js`, `createTiles.js`, `utils.js`), and the
  flower/season "any matches any" rule from `images.js`.
- **Rejected from search:** `danbeck/green-mahjong` (no license),
  `guhoffmann/simple-mahjong-solitaire` and `hadevin/mahjong` (GPL-3.0),
  `rafaelodon/mahjong-solitaire-classic` (no license).
- **Modifications:** jQuery CDN script replaced with vanilla JS; the bundled
  PNG tile artwork (traced to `jimevins/smooth-tileset`, not relicensable
  here) and the background photo dropped and replaced with **original flat
  CSS-drawn tile faces** (pip grids, bar grids, digits, wind/dragon letters,
  flower/season captions), no third-party or trademark tile art; gradient
  fills flattened; external Wikipedia/GitHub links and favicon pack removed;
  added start screen, elapsed timer, score (10 per pair, hint -5, time bonus
  on win), win state, "no moves left" lose state, keyboard cursor
  (arrows + Enter), and scale-to-fit board so 360px phones never overflow.

## Gate

All five games were temporarily appended to `games.json`, then verified with
`xvfb-run -a python3 scripts/smoke_test_games.py --games
"Cryptogram,Word Scramble,Darts 501,Bowling,Mahjong Lite"`:
5/5 pass with `console_errors=0 failed_reqs=0`. `games.json` was restored
byte-for-byte (`git diff games.json` empty). A separate interaction pass
(start, play, restart at 360px width) reported zero page errors and no
horizontal overflow for all five.
