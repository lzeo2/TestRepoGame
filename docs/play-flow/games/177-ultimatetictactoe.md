# Play flow audit: Ultimate Tic-Tac-Toe (id 177)

## Identity / baseline

- Registered `games.json` id 177, url `Games/UltimateTicTacToe/index.html` (verified; 116 entries).
- Baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`; batch `6.json` (4 files, 28,164 bytes).
- Maintenance document basename: `docs/maintenance/games/177-ultimatetictactoe.md`.
- Provenance (in-source): `github.com/ZLouisMiguel/ult`, MIT, commit `589416481de5aa70829b1c7221791649932ad5f1`; online multiplayer (remote.js/WebSocket/lobby) removed for offline policy; engine+computer+ui+script concatenated.

## Source inspected

- `index.html` blob `c0032eca1908f1502aa6971f77a68e4585ccf181` read completely (84 lines): `#landing` (h1, `p.intro`, `.rules-container` with 3 `.rule` paragraphs, `.next-controls` buttons `#playBtn[data-mode=computer]` + `[data-mode=local]`, `.controls-doc` list), `#app` (`#scoreboard` `#score-x/#score-o/#score-draw`, `#ultimate-board[tabindex=0]`, `.game-controls` `#btn-back`/`#turn-indicator #current-player`/`#btn-restart`), `#gameEndModal[role=dialog]` (`#modal-title`, `#modal-subtitle`, `#modal-menu-btn`, `#modal-restart-btn`), `#toast[aria-live=polite]`.
- `script.js` blob `0164992820f61b08e18561696789f4e627ab924b` read completely (528 lines): `createInitialState`, `getWinner`, `getWinningLine`, `validateMove`, `applyMove`, `scoreLocalBoard/scoreState/orderMoves/getLegalMoves/minimax/getComputerMove` (`MAX_DEPTH = 5`), `initBoard`, `renderState`, `showToast`, `showEndModal/hideEndModal/endModalVisible`, `handleMove`, `scheduleComputerMove` (600 ms), `startGame/resetGame/goToMenu`, keyboard cursor (`kbToCell/syncKbCursor`, arrows/Enter/Space), Esc-close handler, `startGame("computer")` auto-start on load.
- `style.css` blob `bc8c457ef5162b93182f4ce5399ab5fbb94ddd60` inspected selectively (lines 21-100, 256-263): `.hidden` override, `#landing`, `#app { display:flex }`, `#toast` fade rules.

## Flow

- Boot: no gate; script auto-runs `startGame("computer")` - board live immediately, X (human) first.
- Start/setup: `#landing` mode buttons (`computer`/`local`), `.controls-doc` explains controls; `startGame` resets `scores`, calls `resetGame()` (fresh state, `initBoard`, render, kb cursor 0,0), focuses `#ultimate-board`.
- Input: click/tap `.cell`; arrow keys move the 9x9 cursor (`.kb-cursor`), Enter/Space places; AI turn blocked via `handleMove` guard + `setThinking(true)` (`boardContainer.style.pointerEvents = "none"`).
- Core loop: `handleMove` -> `validateMove` (active board rule; invalid -> `#toast`) -> `applyMove` (local win -> `mainBoard[boardIdx]`, draw -> "D", `activeBoardIndex = cellIdx` or -1) -> render -> if AI's turn `scheduleComputerMove` (minimax depth 5, 600 ms delay).
- Score/progression: `#scoreboard` match score `{X, O, Draw}` updated on `!state.gameActive`.
- Win/lose: `showEndModal` - "Player X/O wins!" + `describeWin(winningLine)` subtitle, or "It's a draw!"; buttons `#modal-restart-btn` (Play Again, keeps scores) and `#modal-menu-btn` (Menu, resets scores, deals fresh round in place).
- Restart/exit: `#btn-restart` (round only), `#btn-back` (menu = fresh round + score reset). No dead ends; Esc closes the modal (board then shows a finished game; further clicks toast "The game is already over" until restart).

## UI bloat classification: MILD-HIGH

- `#landing` is a genuine start/rules screen, but **it is never hidden**: `showGame()` only removes `.hidden` from `#app`, and neither `startGame` nor `resetGame`/`goToMenu` hides `#landing` (grep: no code references `#landing` besides CSS display rules). Because `startGame("computer")` runs on load, the intro, three `.rule` paragraphs and `.controls-doc` list stay stacked above the board permanently - persistent duplicate instructions while playing.
- Genuine HUD (keep): `#scoreboard`, `#turn-indicator`, `#btn-back`, `#btn-restart`, `.cell` board.
- Popups: exactly one modal - `#gameEndModal`, triggered once per game end (not recurring); `#toast` is transient 1.8 s feedback. No ad/info nags.

## Animation / simulation

- No render loop: pure event-driven DOM (`renderState` writes `.textContent`/classes). AI is a bounded minimax search (`minimax` recursion with alpha/beta, `MAX_DEPTH 5`) run synchronously inside a 600 ms `setTimeout`; the `.thinking` class on `#turn-indicator` is the only "thinking" feedback. No decorative animation beyond `#toast` fade (respects nothing - add `prefers-reduced-motion` check if kept).

## Findings

1. MEDIUM - Landing screen never dismissed (see above): player sees full rules/controls/landing both before and during play. Root: `showGame()`/`startGame` in `script.js`, `#landing` in `index.html`. Fix: add `#landing` `.hidden` in `startGame` (and keep `#btn-back` as Menu that could optionally return to it), or collapse landing to one-time acknowledged help.
2. LOW - After Esc closes the end modal, the finished board remains interactive-looking (clicks toast "The game is already over"). Acceptable; smallest improvement is focusing `#btn-restart` when the modal hides.
3. LOW - `scheduleComputerMove` 600 ms timer vs `cancelComputerMove`: `resetGame`/`goToMenu` cancel correctly; no leak found. No fix needed.
4. Copy check: no em-dashes found in game-facing copy; rules text is house-compatible.

## Recommended playable view

Hide `#landing` after a mode is chosen (or wrap it as one-time acknowledged help with reopen from `#btn-back`). Keep `#scoreboard`, board, `#turn-indicator`, both `.game-controls` buttons, `#gameEndModal` (end-of-game, not a nag) and `#toast`. Keep keyboard cursor + focus styles.

## Validation

CODE-REVIEW ONLY. Smallest needed check: bounded local load, play vs computer to a win, verify modal, Esc, Play Again, Menu, score reset, and that landing hides; 360px screenshot.
