<!-- maintenance-game: Games/MahjongLite -->
# Mahjong Lite maintenance

## Identity and status

Registered ID 193, `puzzle`, not featured; entry `Games/MahjongLite/index.html`. Two files total 20,312 bytes at `8c8a055`. It is tile solitaire with an ingested coordinate/free-tile engine and local CSS faces. Source has no remote dependency; current native gameplay is untested.

## Implementation map

Source review coverage: full HTML, CSS, coordinates, tile face generation, matching/hint/input/timer logic and `LICENSE`. No compiled engine is omitted. `COORDINATES` concatenates `level0` through `level4`, including a single cap tile; the visible “four layers” copy does not match its five z values. `leftNeighbors()`/`rightNeighbors()` handle offset turtle edges. `isOpen()` requires a remaining coordinate, no covering higher tile and at least one free side.

`buildTypes()` creates 144 identities, including interchangeable flowers/seasons. `createBoard()` shuffles these onto coordinates, maps nodes in `elsAt`, and calls `faceFor()` for local markup. `countMoves()`/`suggestMove()` enumerate legal pairs. `onTileClick()` and `activateCursor()` converge on `removePair()`. `fitBoard()` scales the 948 by 698 board into `#stage`/`#viewport`. HUD anchors are `#score`, `#time`, `#tilesLeft`, `#moves`; result is `#endOverlay`.

## Gameplay and controls

Auto-start builds a random turtle board. Match equal free tile types by tap/click or keyboard. Arrow keys advance/backtrack through the list of free tiles, not spatial directional navigation; Enter/Space selects the cursor tile. A second equal free tile removes a pair. Each pair gives ten points. Hint costs up to five points, blinks one member and eventually selects it; copy says “pair highlighted” but code highlights only one face. Clear all tiles to win plus `max(0,600-seconds)` bonus. No legal pair after removal loses; initial zero-move deal is not immediately ended. Restart buttons generate a new randomized board, not the same deal. No audio.

## State and persistence

`current` is remaining coordinates; `typeAt` maps identities; `elsAt` maps current DOM tiles; `selected` and `cursorIdx` track input. `score`, `running`, `seconds`, `timerId`, `hintTimers` own lifecycle. No persistence keys. `startGame()` stops the interval and clears hint timers; `endGame()` also cleans both. Pair removal waits 190 ms but its callback has no handle/token. `current` and node maps are mutable globals, so that old callback can act on a replacement board. Seconds count interval ticks, without hidden-tab deadline correction.

## Dependencies and provenance

Entry records `https://github.com/ScriptRaccoon/mahjong-solitaire`, revision `89dc27b58ab6501994d43fe11dc216245ff820fa`; MIT `LICENSE` names ScriptRaccoon. Notice records removal of jQuery CDN and PNG tiles, replacement by in-page faces. `faceFor()` uses innerHTML, but content is built exclusively from fixed tile identities and literal markup; no user-input sink was established. This is not an XSS finding from the API name alone.

## Audit findings

- **HIGH**, `index.html`, `removePair()` and `startGame()`: 190 ms delayed removal looks up current `elsAt[a/b]` after reset. Recommended repro: select a valid pair then Restart immediately. New tiles at old coordinates vanish and new score/current state are changed. Root fix: session-token/cancelled removal plus synchronous logical removal before animation where practical.
- **HIGH**, `index.html`, `removePair()` input lifecycle: matched tiles stay in `current` and `running` during delay, so rapid repeat selections can enqueue the same pair twice and award duplicate points. Root fix: mark/remove logical pair immediately or lock input while the shared pair transaction completes; cover pointer and keyboard callers.
- **MEDIUM**, `index.html`, `fitBoard()`/`.tile`: 56 px faces scale to roughly 20 px at phone widths, below 44 px. Root fix requires measured mobile zoom/scroll/select design rather than claiming scaling proves touch usability.
- **LOW**, `index.html`, how-to/`doHint()`: five coordinate layers and one hinted tile disagree with visible copy. Correct factual instructions without changing layout identity.

## Safe iteration

Keep offset neighbor rules and flower/season matching groups. Fix lifecycle in shared `removePair()`, not in each input handler. Random deals may be unsolvable; do not promise guaranteed completion without a solver/verified construction. Runtime remains read-only in this task; preserve source notice and original-art claim boundaries.

## Verification

Actually run: inline-script syntax and catalog/doc/source assertions; [batch audit](../audits/games-66.md). Native checks: zero. Recommended tests: free/blocked tiles, cap removal, repeated pair activation, reset inside 190 ms, hint cancellation, no-moves start/end, keyboard cursor and mobile target measurements. Historical screenshot/selection evidence covers selecting free tiles, not solving or concurrency.

## Future outlook

Week one should serialize pair transactions and isolate restart callbacks. Week two prioritizes mobile selection, accurate hint feedback, result focus and reduced motion. Defer guaranteed-solvable generation, undo and saved games until geometry/rule coverage is established and a rights-compatible solver is justified.
