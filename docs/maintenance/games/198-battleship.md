<!-- maintenance-game: Games/Battleship -->
# Battleship maintenance

## Identity and status

Registered ID 198, category `strategy`, not featured. Entry `Games/Battleship/index.html`; six files total 60,068 bytes at `8c8a055`. Ingested local DOM/JavaScript game randomly deploys both fleets on ten-square boards. No current native match or network test was performed.

## Implementation map

Source review coverage: all HTML, `logic.js`, `main.js`, `style.css`, `CREDITS.md`, GPL `LICENSE`; no minified/vendor engine omitted. Entry loads `logic.js` before `main.js`. `BattleshipLogic.initGame()` resets matrices/tracker/AI stack and invokes `placeShipsRandomly()`. `SHIPS_CONFIG` specifies ten ships totaling twenty cells. `canPlaceShip()` disallows adjacency including diagonals. `hit()` validates cells, marks hit/miss and uses `checkSunkAndDisableNeighbors()` to reveal water around sunk ships.

`predict()` uses target stack followed by a placement heatmap; `processPlacement()` weights possible placements around unresolved hits. `updateComputerPredictionAfterHit()` extends likely axes. Shell `startGame()` starts immediately; `renderBoard()` rebuilds `.cell` nodes with `data-r`/`data-c`, ship/hit/miss/aim classes. One delegated click handler on `#computer-board` survives rebuilding. `handlePlayerClick()` and `computerTurn()` alternate turns. `#player-board`, `#message-log`, `#start-btn` are other anchors.

## Gameplay and controls

Fire by clicking/tapping an enemy cell or using global arrows to move `aim` then Enter/Space. Hits/sinks retain the shooter's turn, misses transfer control. All enemy ships sunk yields Victory; all player ships sunk yields Defeat. Player ships are visible, opponent ships hidden until shot; sunk-neighbor water cannot be shot again. Restart Game immediately randomizes a match. No manual ship placement, sound, timer limit or separate start menu exists. Aim initializes at row/column zero, but restart does not reset it. Keyboard handling is document-wide, not scoped to a focused grid.

## State and persistence

Logic owns player/computer matrices, ship coordinate/hit trackers and `computerHitStack`. Shell owns `isPlayerTurn`, `gameActive`, `aim`. No storage/save keys. Miss schedules AI after 800 ms; continued AI hits schedule another turn after 1000 ms. These callbacks are not tracked or session-token guarded. `computerTurn()` checks only `gameActive`, so a restarted match can still receive an old AI shot. There is no continuous animation-frame loop. `renderBoards()` may draw an aim before turn state changes, since turn flag updates follow rendering.

## Dependencies and provenance

`CREDITS.md` records `https://github.com/cloudy-sfu/Battleship`, revision `95941c5f9bb31125a7438f8e7c125f3ab1dccc86`, ingestion 2025-09-24. GPL-3.0 license text is shipped. Preserve this game's GPL obligations and source availability; no MIT relabeling. Account handle is verified source attribution, not an invented human name. Source has no runtime fonts/assets/network loads. This audit does not independently certify upstream copyright chain.

## Audit findings

- **HIGH**, `main.js`, `setTimeout(computerTurn,...)` and `startGame()`: old AI callbacks survive restart and operate on the new boards, possibly while player turn is true. Recommended repro: miss, immediately Restart Game, wait 800 ms; new board should remain unshot. Root fix: clear pending callbacks or guard by session token and active AI turn, covering both scheduling sites.
- **MEDIUM**, `logic.js`, `placeShipsRandomly()`: after 1000 failed placements a ship is silently omitted. Fixed rules claim ten ships even if construction did not finish. Status: bounded-random risk, frequency unmeasured. Root fix: verify complete fleet and restart the whole placement with a bounded failure result, not silently accept fewer ships.
- **MEDIUM**, `main.js`, document keydown Enter/Space: handler fires at aim even when Restart button is focused, preventing its native activation. Root fix: ignore native input/button targets or scope gameplay keys to the grid; shared shot logic stays unchanged.
- **MEDIUM**, `main.js`, `renderBoard()`/`#message-log`: cells have no grid roles, coordinate/status labels or focusability; status is not a live region. Visual aim alone does not provide assistive access. Root fix: roving grid focus and text status announcements, with measured phone target size.

## Safe iteration

Fix lifecycle at the shared turn scheduler, preserving click delegation and extra shots on hits. Keep no-touch fleet geometry and GPL notice. Do not characterize AI's use of known sunk sizes as security exploitation: it is local game logic. Avoid a new placement UI until complete fleet construction is proven. Runtime changes are outside this lease.

## Verification

Actually run: both scripts syntax checked through Git blobs; catalog/source/document assertions; [batch audit](../audits/games-66.md). Native checks: zero. Recheck `git show HEAD:Games/Battleship/main.js | node --check` and the same for `logic.js`. Recommended tests: complete/no-touch fleets, invalid repeated shot, hit chain, sunk-neighbor reveal, both outcomes, restart during each AI delay, focused Restart Enter and screen-reader coordinates. Historical eight-square/manual-placement report is a superseded implementation.

## Future outlook

Week one isolates AI sessions and verifies complete fleet generation. Week two prioritizes scoped keyboard input, aim refresh and accessible grid/status shell. Preserve GPL source delivery before later AI refinement or persistent matches. Defer multiplayer and custom deployment tools until current turn lifecycle has deterministic coverage.
