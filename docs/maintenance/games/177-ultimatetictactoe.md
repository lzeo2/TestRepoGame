<!-- maintenance-game: Games/UltimateTicTacToe -->
# Ultimate Tic-Tac-Toe maintenance

## Identity and status

Registered ID **177**, category `strategy`, entry `Games/UltimateTicTacToe/index.html`. Baseline `8c8a055`; four files, 28,164 bytes. The readable concatenated engine, depth-five AI and DOM UI run locally. Online modules were not included; two players means local shared-screen play.

## Implementation map

**Source review coverage:** complete HTML, CSS, all of `script.js`, MIT notice and historical evidence read. No unseen vendor/binary engine exists.

`createInitialState` defines nine nine-cell boards, global results, player X, unrestricted active-board index `-1` and active flag. `validateMove` checks completed/occupied/forced-board constraints. `applyMove` copies state, evaluates the local board, sets global status, sends the opponent to the matching board (or anywhere if closed), then resolves global outcome. `getWinner/getWinningLine` are shared helpers.

AI `getLegalMoves/orderMoves/scoreLocalBoard/scoreState/minimax/getComputerMove` searches with alpha-beta to `MAX_DEPTH = 5`. UI `initBoard/renderState` paints `#ultimate-board`; `handleMove` is the shared human/AI orchestration path. `scheduleComputerMove` delays 600ms; `setThinking` disables pointer input and keyboard checks the same flag. `showToast` reports invalid moves; `showEndModal` presents outcome.

## Gameplay and controls

The page automatically starts against the computer; the static rules/mode header remains above the board. X is human, O computer. Mode buttons choose computer or two local players and reset match score. A mark's local index sends the next player to that numbered mini-board. Capture three mini-boards in a global row to win; closed/drawn boards cannot be played again.

Click/tap cells or focus `#ultimate-board` and use arrows across the full 9 by 9 grid, Enter/Space to place. `kbToCell` converts super-grid coordinates to board/cell indices. Restart/Play again reset the round while keeping match score; Menu resets score and deals another round in place, not a separate screen. Escape closes the end dialog. No audio exists.

## State and persistence

`state/mode/computerTimer/scores`, cursor and thinking flag are closure-owned. `cancelComputerMove` clears pending AI on resets/menu, and `clearToast` clears both stages of toast timeout. No localStorage/save keys occur. State copying is for search, not persisted undo. Score tracks X/O/draw for the loaded match. `validateMove` assumes internal bounded indices; current DOM/keyboard/AI callers generate them.

## Dependencies and provenance

MIT `LICENSE` credits Louis Miguel. Header and [ingestion report](../../catalog_parts/sources_6.md) record `https://github.com/ZLouisMiguel/ult`, revision `589416481de5aa70829b1c7221791649932ad5f1`. Rules/search/UI/orchestrator were concatenated, broken online-menu binding removed, text rules and keyboard/score added. No server, sockets, room IDs or remote assets are active. Pins are committed evidence, not a fresh source comparison.

## Audit findings

- **HIGH, static rules:** `script.js`, `getWinner/applyMove`: drawn local boards are encoded `D`; generic winner logic accepts any equal nonempty triple. Three drawn boards in a row become global winner `D`, incorrectly ending a still-playable game and showing `Player D wins`. Root fix: only X/O triples count as global wins while preserving all-closed global draw detection; add a mixed open/drawn fixture.
- **MEDIUM, static performance:** `getComputerMove/minimax` is synchronous after the timeout. A 600ms delay is not an execution budget; late-game/free-choice branching may block input. Measure N100 long tasks before changing depth or moving search to bounded worker/slices.
- **MEDIUM, static accessibility:** `.cell` uses generic clickable divs without per-cell accessible state; mobile size is `7.8vw` (28.08px at 360px), below 44px. Root fix: accessible board semantics/announcements and an explicit compact-screen interaction plan, reviewed natively by Main.
- **Non-finding:** AI/reset timeout cancellation and shared move validation are present; do not add online fallback or duplicate rule checks in the wrapper.

## Safe iteration

Patch global winner recognition at the shared rule helper/call site, not modal wording. Preserve send rule and closed-board freedom, and test local draw behavior separately. Do not edit compiled assets (none needed here), revive removed WebSocket modules or silently change AI strength. Retain the MIT notice and source record.

## Verification

Actually run: Git/catalog identity and JS syntax checks, [batch 65](../audits/games-65.md); **0 native runs**. [Historical P2a](../../audit_batches/playtest_p2a.md) filled three cells/reset and did not complete a global result or test drawn-board rows.

Recommended native/source-fixture checks: send rule, forbidden board, closed destination grants freedom, local draw triple with open boards, true X/O global win, all-closed draw, AI/reset race, both modes and keyboard conversion. `git show HEAD:Games/UltimateTicTacToe/script.js` reads without checkout; Main owns native assets/full smoke.

## Future outlook

Week 1: drawn-board winner regression. Week 2: cell semantics, compact-screen controls and modal focus restoration. Later: actual search-budget profiling and optional difficulty only if requested. Defer online play, accounts and saved matches; do not add new dependencies for the existing state machine.
