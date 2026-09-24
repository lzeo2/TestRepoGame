# Catalog part 7: provenance

Batch 7: four games **ingested** from permissively-licensed open-source
repositories (all MIT, LICENSE file shipped in each game folder), one game
**built** in-house because no candidate met the house rules. No third-party
art, audio or fonts are bundled; every visual is flat CSS drawn by the
shipped code. All cards/dice are drawn with CSS and Unicode text glyphs
(never fetched).

## FreeCell (Games/FreeCell/) - ingested

- **Repo:** https://github.com/taeber/freecell
- **License:** MIT (LICENSE shipped), Copyright (c) 2023-2026 Taeber Rapczak
- **Commit:** e1249a7ee78af3034ceab2927c5480615badfd01
- **Files taken:** `script.js` (card model, deal, cascade/foundation/free-cell
  move validation, undo history, win detection), `style.css` layout metrics,
  `LICENSE`.
- **Rejected from the same repo:** the PWA landing page and service worker,
  Web Share button, app-info dialog, game-ID URL persistence and Twemoji
  favicons (offline / house-rule violations).
- **Modifications:** start screen with documented controls added; keyboard
  play added (Tab/Enter on cards, U undo, A auto/pick, N new game); no-moves
  -left banner with a New game path added; rainbow gradient win text removed
  (flat restyle); card sizing made 360px-safe.

## Blackjack (Games/Blackjack/) - ingested

- **Repo:** https://github.com/Vimal9RAM-NAP/blackjack-web
- **License:** MIT (LICENSE shipped), Copyright (c) 2026 Vimal Ram
- **Commit:** 81e00b0e7021c41a9a7dbbea5369e8d00ef498bb
- **Files taken:** `script.js` (shoe, deal/hit/stand/double/split flow,
  dealer AI on soft/hard 17, chip and rank tracking), `style.css` table
  layout metrics, `LICENSE`.
- **Rejected from the same repo:** Google Fonts links (offline policy), the
  gradient table felt, ALL-CAPS copy and the emoji payout message.
- **Modifications:** gradients flattened; ALL-CAPS copy set in title case;
  emoji payout message replaced with plain text; natural blackjack settle
  added (dealer peek, player natural pays 3:2); session win state at 2,000
  chips with keep-playing / new-session overlay; broke state reloads the
  bankroll; keyboard shortcuts (H/S/D/Enter); controls documented on the
  start screen; button and chip hit targets raised to 44px; 360px-safe
  padding.

## Video Poker (Games/VideoPoker/) - ingested

- **Repo:** https://github.com/varunbudati/VideoPoker
- **License:** MIT (LICENSE shipped), Copyright (c) 2025 Varun
- **Commit:** 3f2e2ea791fb05afe1b5a82217d6cdccb1d80887
- **Files taken:** `script.js` (deck and shuffle, hold/draw rounds, hand
  evaluation across eight paytable variants, balance and bet state),
  `style.css` card-flip layout metrics, `LICENSE`.
- **Rejected from the same repo:** the Google Fonts link (offline policy),
  the checkerboard gradient background, the emoji theme-toggle icons, the
  ALL-CAPS button copy and the blocking `alert()` popups.
- **Modifications:** checkerboard gradient flattened; emoji theme-toggle
  icons replaced with text; ALL-CAPS copy set in title case; alert() popups
  replaced with in-page overlays (out-of-chips lose state with restart,
  doubled-stack session win with keep-playing / new-game); start screen with
  documented controls added; keyboard play added (1-5 hold, Enter/Space
  deal, Arrow Up/Down bet); 44px bet buttons; 360px-safe card row.

## Yahtzee (Games/Yahtzee/) - ingested

- **Repo:** https://github.com/taylorhansen/Yahtzee
- **License:** MIT (LICENSE shipped), Copyright (c) 2017 Taylor Hansen
- **Commit:** 26dec5d9750a536f1c4e9515bf7c69b6bd15683c
- **Files taken:** scorecard table markup and category scoring functions
  (upper/lower sections, small and large straight, chance, Yahtzee),
  `style.css` metrics, `LICENSE`.
- **Rejected from the same repo:** dead helper code and the ALL-CAPS copy.
- **Modifications:** start screen with documented controls added; keyboard
  play (Space roll, 1-5 hold, Tab/Enter on scorecard rows); invalid
  categories now score zero instead of doing nothing; upper-section bonus
  awarded without the score-after-reset bug; 13-round counter, rolls-left
  counter and a 200-point win target added with a game-over overlay and
  restart path; dice shown as blank until the first roll; flat responsive
  restyle.

## Dominoes (Games/Dominoes/) - built, not ingested

**Built in-house (not ingested).** Reason: no genuine permissively-licensed
browser implementation satisfied both the spec and house rules. Candidates
checked:

- `keithadler/dominoes27` (MIT): violates house rules en masse (735 emoji,
  193 em-dashes, 92 gradients, Google Fonts import).
- `sigma21/DominoesGame-JS` (MIT): console-only, no UI.
- `martakoprivica/Dominoes_web_game` (MIT): bundles 4.8 MB music and PNG
  screenshots of unclear provenance.
- `Lachy200408/DominoOnline` (MIT): needs a Node/WebSocket server, breaking
  the static-site / offline policy.

Fallback build approved: block dominoes vs. a simple AI in a single
`index.html` (flat colors, CSS-drawn tiles, no external assets or
fetches), with start screen, round/match win states, score to 100, draw
and pass flow, documented tap and keyboard controls, and New match
restart.
