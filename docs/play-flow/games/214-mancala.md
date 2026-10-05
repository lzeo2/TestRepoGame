# Mancala play-flow audit (batch 4)

Identity: registered id 214, entry `Games/Mancala/index.html`, entry blob `02d151c1ff3a2612a8f518b40f8e991db474f391`, tree `216f18a50ce0d4b9de8dd0351681aa5f420a096f`, 3 files, 58,739 bytes. Baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`. Manual `docs/maintenance/games/214-mancala.md` read for orientation; source re-checked directly.

Validation status: **CODE-REVIEW ONLY**. No browser play, no audio review this run.

## Source inspected

- `Games/Mancala/index.html` (blob above, all code inline): full-file function/ID inventory via grep. Verified functions: `initState`, `layoutBoard`, `applyMoveWithMeta`, `minimax`, `evaluate`, `legalMoves`, `performMove`, `animateSow`, `renderSeeds`, `aiMove`, `aiShouldMove`, `onPitClick`, `undo`, `redo`, `restart`, `swapSides`, `showHint`, `updateStatus`, `saveHistory`, `log`, `beep`, `ensureAudio`, `nextPlayer`, `oppositePit`, `ownerOf`, `pitsOf`, `storeIndex`, `isStore`, `step`, `clone`. Verified IDs: `#board`, `#mode`, `#aiSide`, `#depth`, `#depthLabel`, `#hintBtn`, `#restart`, `#undo`, `#redo`, `#swap`, `#scoreA`, `#scoreB`, `#turn`, `#log`.
- `aiMove` body read verbatim (lines 395-404): guards `if(state.over) return; if(!aiShouldMove()) return;` run **before** `setTimeout(..., 320)`; the callback itself only reads `depthEl.value`, calls `minimax` and `performMove(move,true)` with **no** re-check of turn, generation, or session.
- `CREDITS.md` (blob `f5d72d92ad121faa5d40ad35eabfed0942fb1726`) and `LICENSE` (blob `f288702d2fa16d3cdf0035b15a9fcbc552cd88e7`) inventoried (GPL-3.0 text per orientation).

Held: `minimax`/`evaluate` search internals, `animateSow` timeout bodies and WebAudio code were not re-read line by line this run.

## Flow

- Boot: `initState` builds the 14-slot Kalah board (pits 0-5/store 6 for A, 7-12/store 13 for B), `layoutBoard` renders seed divs into `#board`.
- Start/setup: auto-starts with 4 seeds per pit; `#mode` selects human/human, human/AI, AI/AI; `#aiSide` picks AI side; `#depth` 1-8.
- Input: pointer click on a legal own pit (`onPitClick`); keys H hint, U undo (orientation, not re-verified this run). Pits are plain divs, no keyboard pit navigation.
- Core loop: no RAF. AI turn scheduled by `setTimeout` 320ms inside `aiMove`; sow animation uses per-path 80ms timeouts (orientation).
- Score/progression: `#scoreA/#scoreB` from stores, `#turn`, `#log` move history; capture on last seed in empty own pit, extra turn on own store, end sweep when a side empties (rule code `applyMoveWithMeta`, body held).
- Win/lose: `state.over`/`state.winner` shown via `updateStatus` (exact copy held); draw on equal stores.
- Restart: `#restart`; `#undo`/`#redo` snapshot stacks capped at 200; `#swap` reverses sides (orientation for cap/semantics).

## UI bloat classification: MILD

Persistent HUD: `#scoreA/#scoreB/#turn/#log` (genuine). Controls `#mode/#aiSide/#depth/#hintBtn/#restart/#undo/#redo/#swap` are genuine game menu, keep. `#log` grows unbounded across restarts (orientation): mild clutter, trim rather than hide. No ads or promo popups.

## Popup/modal inventory

None authored. No modal dialogs, no recurring nag.

## Animation/simulation

Simulation is the rule engine, not physics: `applyMoveWithMeta` mutates the cloned state; presentation via `renderSeeds` (randomized DOM seed positions) and `animateSow` timeouts. Note: state reaches the final board before the animation finishes (orientation), so this is cosmetic sequencing, not a model loop.

## Findings

- HIGH: `aiMove` scheduled callback has no session/turn guard. Restart, mode change, undo or a human move within 320ms lets a stale `minimax` result apply to the new state; own-side clicks during AI turns are only pre-checked, not re-checked. Root: `aiMove`/`performMove` lifecycle. Fix: one turn-owner flag plus a generation token re-verified inside the callback.
- MEDIUM: `layoutBoard` pits are click-only divs with no labels/tab stops; H/U alone are not keyboard play. Fix: native buttons or a roving cursor with seed-count labels.
- MEDIUM: `swapSides` mutates board/player without a history snapshot, so undo/redo can restore pre-swap states (orientation, not re-verified). Fix: make swap an undoable transaction and clear redo.
- LOW: `animateSow` renders final state repeatedly instead of incremental counts (orientation). Do not claim seed-by-seed animation.
- No fix needed: snapshot undo/redo and the shared rule function are the right structure; keep GPL notice intact.

## Recommended playable view

Keep board, score/turn/log HUD, mode/depth controls, hint/undo/redo/swap/restart buttons. Move rule text into a one-time acknowledged help with optional reopen; bound the move log instead of showing it all. No popups exist to remove.

## Smallest browser check still needed

Choose human/AI, make a move, and restart or switch to human mode inside 320ms and watch for a stale AI move; then verify extra turn, capture, side-empty sweep and that undo/redo never desyncs seed totals (48 total).
