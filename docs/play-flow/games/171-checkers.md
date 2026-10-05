# Checkers (id 171) - play-flow audit report

CODE-REVIEW ONLY. No browser run in this pass.

- Identity: id 171, registered in `games.json`, url `Games/Checkers/index.html`.
- Baseline: `5be686e1ab350c8ddce7a827c413612e421c3a5c`. Single tracked file, 43765 bytes.

## Source inspected

- `Games/Checkers/index.html` blob `5272be15ac56305ca3c731db4d40896cc6c49691` (entire file, 1365 lines, read completely; inline `<script>` runs from line 259 to end). All classes from the stroibot/Checkers (MIT) merge are present in this one file: `Logger`, `Message`, `Tile`, `Checker`, `Board`, `DrawManger`, `GameManager`, `AI`, plus build glue `OkButton`, `Play`, `updateHUD`, `tileElAt`, `markKbCursor`.
- Header comment documents ingestion (github.com/stroibot/Checkers, MIT, commit `1d0ba0ca...`) and the local 10x10 -> 8x8 change plus `PlaceCheckers` parity fix.

## Flow (from source)

- Boot: `window.onload` creates `gameManager = new GameManager()`, `Initialize()` -> `DrawManger.DrawBoard()` builds `.tileRow > .tile` and `.checker` elements. No start screen (explicitly removed per header comment; game auto-starts).
- Input: click on `.checker` -> `Select()` (forced-capture warning via `Message('You must attack when it possible!').Show()`), click `.tile` -> `GameManager.Select()` performs `InRange` move/jump, multi-jump keeps `.selected`, otherwise `setTimeout(() => gameManager.AI.TryToMove(), 1000)` then `ChangePlayerTurn()`. Keyboard glue: arrows move `kb` cursor (`.kb-cursor`), Enter/Space clicks checker/tile; blocked while `#outerMessageBox` exists.
- Core loop: no RAF/game loop; event-driven DOM with a 1000ms AI `setTimeout`.
- Score/progress: HUD `#countYou`/`#countThem` via `updateHUD()` counting `gameBoard.board`; `#status` line (Logger.Log) shows last move/result.
- Win/lose: `GameManager.CheckVictory()` -> `CheckIfAnyLeft(player)` -> `EndTheGame(player)` sets `gameOver = true` and shows `new Message(...).ShowWithHeader()` modal ("You win!" / "You lose!") plus `#status` text; `Stop()` toggles `AI.active`. Also a stalemate path: `GameManager.Select()` calls `EndTheGame(1)` when the human has no possible moves.
- Restart: `#restartBtn` -> `Play()` -> `window.location.reload()`.

## UI bloat: MILD

- Persistent: `header.page-head h1` + long rules paragraph, `#hud` (`#status`, counts, `#restartBtn`). All functional; header paragraph duplicates rules that belong in one-time help.
- Genuine game UI: `#board .tiles`, tooltips `.tooltiptext` (tile names, hover only), `#hud`.
- Modals (inventory): `#outerMessageBox/#messagebox` with `.okbutton` - three triggers: forced-capture warning `Message(...).Show()`, game result `ShowWithHeader()`. Not recurring, no ads/info popups. Dismiss via `OkButton` removes the node; keydown input is gated while it is open.

## Animation

- No continuous loop. State changes are class toggles (`.selected`, `.help`, `.beenhereallalong`) plus `transition: box-shadow 0.2s ease` on `.checker`. Model and renderer are both the DOM; nothing held/opaque.

## Findings

1. LOW - `Checker.Remove()` uses `checker.element.parentElement.removeChild(checker.element.parentElement.childNodes.item(1))`: the childNodes index assumes the tooltip span is index 1. Works with current DOM but fragile; fix by removing `checker.element` directly.
2. LOW - `AI.Move()` can recurse (`this.Move()` retry) and `do/while` re-picks randomly; unbounded in theory but each retry conditions on `InRange===1`. No fix needed now; cap iterations if touched.
3. MEDIUM - `ShowWithHeader()` appends `this.message` (already a DOM `<p>`) correctly, but `Message.Show()` sets `message.textContent = this.message` - callers of `Show()` must pass a string. Current callers do. Keep as-is; do not "blind hide all headers" - `#hud` restart must stay reachable above the modal (`z-index: 31` comment is intentional).
4. Info: `AI.Stop()` toggles `this.active`, so calling `Stop()` twice re-enables the AI. Currently called once from `EndTheGame`; note as latent bug, fix only if a second caller appears.

## Recommended playable view

Keep `#board`, `#hud` (status, counts, `#restartBtn`), modal only for forced-capture and result. Move the long `header.page-head` rules paragraph into a one-time acknowledged help overlay with optional reopen. No recurring nags present; nothing to remove beyond the always-visible rules paragraph.

## Validation

CODE-REVIEW ONLY. Smallest needed check: open `Games/Checkers/index.html` in a browser, make one move, take one forced jump, finish a game (win/lose modal), click `Restart`, and tab through keyboard cursor input.
