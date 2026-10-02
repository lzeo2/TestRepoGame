<!-- maintenance-game: Games/DotsAndBoxes -->
# Dots and Boxes maintenance

## Identity and status

Registered ID **176**, category `strategy`, entry `Games/DotsAndBoxes/index.html`. Baseline `8c8a055`; four files, 20,605 bytes. A local DOM game offers computer or local two-player modes. Runtime scripts/styles load relatively; current native verification is separate from this source audit.

## Implementation map

**Source review coverage:** complete HTML, `script.js`, `style.css`, MIT notice and historical source report read. No opaque engine/assets were excluded.

The IIFE constructs a 9 by 9 element grid in `#board`: even/even dots, even/odd horizontal buttons, odd/even vertical buttons, odd/odd boxes. This represents five by five dots and 16 scoring boxes, not 81 playable cells. `lineEls/boxEls` index DOM elements by these coordinates. `ownerOf/boxOwner/sidesOwned` read classes as the model.

`onLineClick` enforces turn and pending-AI guards; `claim` marks a line, `checkCompletedBoxes` awards all newly closed boxes and retains the turn when any were completed. `continuePlay/aiMove` schedule computer moves. `adjacentBoxes` lets AI prefer box completion and avoid making a third side when possible. `startRound/createBoard` rebuild state and `showEndOverlay` reports final totals.

## Gameplay and controls

Play chooses versus computer or two local players. Mouse/touch claims an unowned edge. Each box earns 10 points and an extra turn; when all 16 are owned, higher score wins or equal scores draw. New round/N resets scores for the round; Menu returns to mode selection. Arrow cursor moves across all grid coordinates, including dots/boxes; Enter/Space is intended to claim only a line. The actual keyboard branch has a defect below, so documented keyboard availability is not a pass. No audio or networking exists.

## State and persistence

Closure owns `mode/currentPlayer/score1/score2/boxesDone/gameOver/aiTimer`, cursor coordinates and element arrays. DOM ownership classes (`owned1/owned2`, `owner1/owner2`) are authoritative. A 520ms computer timeout is cancelled at round/menu/end transitions; computer replies recheck state. There are no storage keys or persistent match scores. Reload resets everything.

## Dependencies and provenance

MIT `LICENSE` credits Ayah Jawad. Header and [source record](../../catalog_parts/sources_6.md) identify `https://github.com/ayahae79/Dots-and-Boxes`, revision `5cadc8235bf2a108af47837c5fd89ba32f1eac2a`. Grid/completion flow was adapted with an AI, mode shell, keyboard cursor and result dialog; remote fonts/icons and screenshots were not taken. No new upstream/network comparison was performed.

## Audit findings

- **HIGH, static keyboard input:** `script.js`, Enter/Space branch checks `el.className === 'hline' || ... === 'vline'`, but `moveKbCursor` adds `kb-cursor` to that same element. Even the initial line gets that extra class, so the intended keyboard move never passes. Root fix: use `classList.contains` or existing `isLine(kbRow,kbCol)`, routing through `onLineClick` unchanged.
- **MEDIUM, static native-button routing:** document keydown prevents Enter/Space even when New round/Menu or a line button has native focus. Root fix: let focused native buttons activate themselves and only handle the cursor path otherwise.
- **MEDIUM, static mobile geometry:** `style.css`, `.board/--cell/--gap`, at 360px the nine 30.24px columns plus eight 4.32px gaps and padding/border exceed the available 332px content width; line targets are also below 44px. Root fix: deliberate responsive edge layout/hit areas rather than hiding horizontal overflow. Main owns visual judgment/native measurement.
- **Historical limitation:** [P2a](../../audit_batches/playtest_p2a.md) recorded zero keyboard claims, then four claims from mouse fallback. Its aggregate pass did not certify keyboard play.

## Safe iteration

Fix line identity once in keyboard dispatch, not by removing visual cursor classes. Keep shared `claim/checkCompletedBoxes` semantics, including completing two boxes with one edge. Maintain timeout cancellation and local-only two-player mode. Keep notice files; no generated art or framework is needed. Runtime changes require an explicit follow-up lease.

## Verification

Actually run: Git/catalog identity and JS syntax checks in [batch 65](../audits/games-65.md); **0 native runs**. Historical P2a only supports pointer moves/reset.

Recommended native steps: initial Enter claim, cursor on dot then line, native-focused Menu/New round activation, two-box completion and retained turn, AI extra-turn chain, draw/result, restart during AI delay, 360px width/target measurement. Sparse-safe read: `git show HEAD:Games/DotsAndBoxes/script.js`; Main owns browser assets/full gate.

## Future outlook

Week 1: keyboard identity and focus routing with a tiny regression. Week 2: mobile grid/hit targets, board state announcements and result focus. Later: measured chain-aware AI if requested; current greedy strategy is not a rules defect. Defer online play and saved matches until the advertised controls work.
