# Gomoku (id 213) - play-flow audit

CODE-REVIEW ONLY. No browser run in this pass.

## Identity
- Catalog id 213, registered, directory `Games/Gomoku/` (5 files incl. CREDITS.md/LICENSE).
- Entry: `index.html`, blob d304e7f4321e38a6d0c22f8da1fac76b1ec9d40c, tree 6f27384713b164a7fb72a10853cdbaf249516341, 96,982 B.
- Source baseline: `5be686e1ab350c8ddce7a827c413612e421c3a5c`. Page title "五子棋挑战 · 万层地狱" (Gomoku challenge); CREDITS/LICENSE present.

## Source inspected
- `index.html` (9,846 B) read in full: header with title/subtitle + instructions paragraph; `#soundToggle`; `#turnIndicator`, `#undoCounterDisplay`, `#board`; side `panel` with `#aiMode/#pvpMode`, `#aiDifficultyPanel` (easy/medium/hard hidden, `ultimatehell` active) + `#ultimatehellWarning` + difficulty info list, `#modelSelection` (`normal`/`fullpower` + info list), `#status`, player scores `#playerScore/#aiScore`, `#undoBtn/#restartBtn`, stats `#moveCount/#depthCount/#winChance`; `rank-container` (`#currentRank*`, `#rankList`); `rules-container` (段位规则说明); `version-history` (`#versionList`); `#winMessage` overlay (`#winnerDisplay`, `#eggMessage`, `#playAgainBtn`, `#viewBoardBtn`); `<audio id="placeSound/winSound/clickSound">`; `script.js`.
- `script.js` blob 5482763084ff780e4599fdc5b0cf97eee3174847, 28,479 B: full function index taken (line numbers), key bodies NOT all read: inspected call sites/head lines. Functions: `initGame` (107), `initRankSystem` (121), `saveEloRating` (144, `localStorage['gomokuEloRating']`), `addWinPoints/addLossPoints`, `initBoard` (170, creates cells with `click -> makeMove(r,c)`), `checkWin` (207), `makeMove` (218), `findWinningMove`/`willCreateDoubleThreat` (247/256), `makeAIMove` (297, `setTimeout`), `minimax` (458, alpha-beta), `getUltimateHellAIMove` (421), `updateStatus` (495), `showWinner` (513), `restartGame` (534), `undoMove` (544), `setModel/setMode`, listeners at 579-586 (`restartBtn`, `playAgainBtn`, `viewBoardBtn`, `undoBtn`, mode/model buttons, `soundToggle`). AI search internals (minimax body, evaluation): HELD.

## Flow
- Boot: `DOMContentLoaded` -> init (board, rank system, version list, saved Elo).
- Start: game begins immediately with mode buttons; default AI mode + `ultimatehell` difficulty.
- Input: click/tap board cells -> `makeMove(r,c)`; buttons for undo/restart/mode/difficulty/model; sound toggle.
- Core loop: `makeMove` -> `checkWin` -> turn switch; AI path `makeAIMove` -> `setTimeout` -> search (`minimax`/`getUltimateHellAIMove`, depth/model per selection).
- Score/progression: per-game `#playerScore/#aiScore`, `#moveCount/#depthCount/#winChance`, Elo/rank via `gomokuEloRating` localStorage, rank list/progress.
- Win/lose: `showWinner(player)` -> `#winMessage` shown with `#winnerDisplay`, `#eggMessage`.
- Restart: `restartGame()` via `#restartBtn` or `#playAgainBtn`; `#viewBoardBtn` just closes the overlay.

## UI bloat classification: HIGH
- Persistent non-HUD panels on every visit: `.rules-container` (段位规则说明 rules text), `.version-history` (版本更新记录), `difficulty-info` lists (满血版特点, 难度说明) and `#ultimatehellWarning`, plus header instructions paragraph - descriptive/meta copy shown alongside the board at all times. These are not the game menu/HUD; they duplicate help/patch-note roles.
- Genuine game UI: `#board`, turn indicator, undo counter, mode/difficulty/model buttons, scores, stats, rank widget, `#winMessage`.

## Popup modal inventory
- `#winMessage` overlay: shown once per game end; `#playAgainBtn` restarts, `#viewBoardBtn` dismisses to inspect board; not recurring. No ad/info popups found in source.

## Animation/simulation
- Model updates: `drawStones()` redraws stones from state; `makeAIMove` schedules AI response via `setTimeout`; win/lose toggles `.show` class on `#winMessage`. No evidence of decorative RAF in inspected ranges; render loop beyond `drawStones`: HELD.

## Findings
1. (High) Persistent meta panels (rules, version history, difficulty/marketing copy, hell warning) bloat the play surface; consolidate into one-time acknowledged help with optional reopen, keep HUD/scores/rank widget. No change in this docs-only pass.
2. (Medium) Default state advertises "玩家胜率低于0.1%" style claims in authored copy; verify against `minimax` behaviour at runtime before trusting - HOLD AI strength claims.
3. (Info) `console.log` risk unknown (not audited line-by-line); held.

## Recommended playable view
- Keep `#board`, turn/status, scores, undo/restart, mode/difficulty/model selectors, rank widget, `#winMessage`; move rules/version-history/difficulty text into one-time help.

## Validation status
CODE-REVIEW ONLY. Smallest needed check: browser-load, play a PvP round to five-in-a-row, undo, restart, run one AI turn at default difficulty, verify rank/Elo persistence.
