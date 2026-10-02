# Gomoku: maintenance manual

<!-- maintenance-game: Games/Gomoku -->

## Identity and status

Registered ID 213, category `strategy`, featured `false`. Entry: `Games/Gomoku/index.html` ([open source](../../../Games/Gomoku/index.html)). Source baseline `8c8a055`; 5 tracked files, 96,982 logical bytes. This is an existing game, not a new addition. Runtime is read-only in delegation 67. Local source/dependency evidence is not an offline browser pass. No native gameplay, screenshot or hardware measurement was performed here.

## Implementation map

SourceReview coverage: inspected entry, `script.js` input/AI/persistence sections, `style.css` and credits/license in bounded views. Search evaluation is partial, not proof of claimed AI strength. No vendor/binary engine is present. DOMContentLoaded builds 225 `.cell` divs under `#board` and attaches click handlers. `makeMove/checkWin` mutate and evaluate a 15x15 board; `drawStones` rebuilds stones. `makeAIMove` checks win/block/double threats then `getUltimateHellAIMove/minimax` searches.

Move generation limits nearby candidates to fifteen. Search has normal/fullpower limits 12/14 depth and 2.5/3.5 seconds, but runs synchronously inside a timeout, not a worker. `#restartBtn/#playAgainBtn/#undoBtn`, `#aiMode/#pvpMode`, model buttons and `#viewBoardBtn` form the control surface. Rank and move/depth displays are generated locally; no online model or service is involved.

## Gameplay and controls

Black starts; five or more contiguous stones in one of four axes wins. Switch between local human/AI and two-player. Only ultimatehell difficulty is visibly offered; normal/fullpower chooses search budget. Undo restores the last saved board and player, not necessarily a full human-plus-AI turn. Restart resets current board/move count but retains session win counters and rank points. Sound elements have no sources, so audio is effectively silent. No board keyboard navigation exists.

## State and persistence

`gameState` owns board/currentPlayer/gameOver/moves/mode/model/stats/eloRating. Each move stores full `prevBoard`. Rank key is `gomokuEloRating`, read via unchecked parseInt and written unguarded. Normal human AI win adds 100, fullpower 300, AI loss 50; UI claims about 200–300 and predicted percentages are not reliable measurement. AI uses two untracked delayed callbacks. Restart/undo/mode switch never cancels them; search operates on mutable live board.

## Dependencies and provenance

Local `CREDITS.md` records upstream https://github.com/kevin2014123/gomoku-ai, revision `0da7b551af7354cdaffab9f156ecbfd3d9c01fa6`. Shipped `LICENSE` inspected: GPL-3.0. These are repository evidence, not a fresh network/source-pin verification. Preserve notices and inspect code, asset and component terms separately; a game license does not automatically clear every bundled recording/font/image. Dependencies and asset consumers are identified above; no newly added remote loads or dependency installs in this audit.

## Audit findings

- HIGH, `script.js::makeMove/makeAIMove`: human clicks are accepted during AI turn, and delayed AI callbacks do not check current player/mode/session before applying a move. Rapid clicks can play the AI stone or stale AI can move after restart/undo/PVP switch. Recommended repro: click two cells quickly, or restart within 100ms. Minimal fix: distinguish human/AI entry, guard turn, retain/cancel timer or use session generation, and recheck after search.
- HIGH conditional startup, `script.js::initGame/saveEloRating`: denied storage can throw; corrupt rank becomes NaN. Guard read/write and validate nonnegative finite values at hydration.
- MEDIUM, `style.css` mobile cells are 20px while `initBoard` marker positions use fixed 30px spacing; board targets/markers diverge. Use shared CSS geometry and keyboard cursor.
- MEDIUM, `index.html` probability claims and `winChance` fixed zero are unsupported. Replace with factual depth/budget feedback; defer subjective copy/design judgment to Main.

## Safe iteration

Patch move/session ownership first, then rank boundary, retaining the existing local AI. A timeout is not background computation: measure UI blocking before worker extraction. Preserve GPL-3.0 notice and no-source audio stubs until an explicit evidence-backed cleanup. Do not restore removed donation/CDN/audio requests or hand-edit a new AI identity.

## Verification

Recommended native sequence: five-in-row PVP, win/undo/restart, normal/fullpower AI, rapid double move, restart and switch mode during pending AI, denied/corrupt rank. Profile actual event-loop stalls and verify keyboard/touch cells at 360px. Draw on a full no-win board is not implemented and needs a separate fixture.

Actually run: Git blob inventory and `node --check` via standard input for 1 external/inline script units, 1/1 PASS. No execution implied. Reproduce parsing without checkout; focused extraction commands are in [batch verification](../audits/games-67.md#verification):

```sh
git show 8c8a055:"Games/Gomoku/script.js" | node --check
```

A future authorized focused browser run may extract only this directory with `git archive` into a disposable directory, serve that root over HTTP, block third-party requests and terminate the server. Check disk first; do not alter sparse selection or leave dependencies. Main owns the unchanged serial full-catalog smoke gate, separately from these recommended interactions.

## Future outlook

Week 1: input ownership/cancelable AI and rank validation. Week 2: reachable board keyboard controls, 44px interaction strategy, factual status and shared marker geometry. Later: draw outcome and bounded worker search after measured N100 stalls. Decorative gradients/claims require Main review, not a new engine.
