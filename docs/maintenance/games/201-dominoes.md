# Dominoes: maintenance manual

<!-- maintenance-game: Games/Dominoes -->

## Identity and status

Registered ID 201, category `puzzle`, featured `false`. Entry: `Games/Dominoes/index.html` ([open source](../../../Games/Dominoes/index.html)). Source baseline `8c8a055`; 25 tracked files, 5,849,737 logical bytes. This is an existing game, not a new addition. Runtime is read-only in delegation 67. Local source/dependency evidence is not an offline browser pass. No native gameplay, screenshot or hardware measurement was performed here.

## Implementation map

SourceReview coverage: inspected `index.html`, `bravo.html`, `style1.css`, and the placement/win/input functions in `touch.js` through bounded source views. Image/audio payloads were inventoried, not visually or acoustically reviewed. Entry loads a local stylesheet, looping `#backgroundMusic`, then `touch.js`; a random tile is moved immediately to `#mesto1`, and `window.onload` shuffles the remaining drag boxes.

`drag`, `drop`, `addTouchEvents`, `selectTile`, and `placeInSlot` converge on DOM tile reparenting. The board has `#mesto1` through `#mesto8`, and tiles `#block1` through `#block8`. `openNewPageIfAllFilled` checks eight explicitly listed ID orders, then navigates to local `bravo.html`. This is a fixed arrangement puzzle, not a chain/boneyard game or computer opponent.

## Gameplay and controls

Drag a tile, or select one and activate a slot. JS adds tab stops and Enter/Space handlers to tiles and slots; touch drag has separate listeners. Correct ordering navigates to the success art page. The entry restart reloads; the success page links back to entry through an unlabeled image-backed button. Incorrect complete arrangements produce no feedback. The rule is recognized ID ordering, not a generalized matching-end solver.

## State and persistence

State is the current tile parent DOM plus `draggedElementId` and `mouseDragActive`. There is no board save, score, timer, or engine dependency. Both HTML pages read the generic `musicPlaying` localStorage key and call `audio.play` when it equals `true`; neither inspected page writes it. Audio autoplay and those read/play calls have no exception/rejection handling. Reload randomizes the starting tile and tray, not tile identities.

## Dependencies and provenance

Local `CREDITS.md` records upstream https://github.com/martakoprivica/Dominoes_web_game, revision `53fd52326768513c24a0d52b1be3019af11abfb1`. Shipped `LICENSE` inspected: MIT. These are repository evidence, not a fresh network/source-pin verification. Preserve notices and inspect code, asset and component terms separately; a game license does not automatically clear every bundled recording/font/image. Dependencies and asset consumers are identified above; no newly added remote loads or dependency installs in this audit. Historical catalog-parts reports describe an earlier self-made implementation under this title and must not override the current local credits/source.

## Audit findings

- MEDIUM, `touch.js::placeInSlot/drop/touchend`: all append without enforcing one tile per slot. Several tiles can stack; the win checker reads only `children[0]`. Recommended repro: place two tiles in one slot, then try correcting the board. Minimal root fix: one shared placement function that rejects or swaps an occupied slot, used by every input route.
- MEDIUM, `bravo.html::.dugmic`: success restart has no accessible name. Add visible text or an accessible label to the existing control; avoid nested button/link semantics.
- MEDIUM, `style1.css` media queries: shrinking the root to 0.33rem also shrinks text and target sizes. Native 360px layout and 44px targets need verification.
- MEDIUM, both HTML `DOMContentLoaded` audio blocks: denied storage or rejected playback is unhandled; guard the shared audio unlock path.

## Safe iteration

Keep the eight supplied art tiles and known success permutations. Unify placement before changing touch behavior so keyboard, mouse and touch share occupancy rules. Do not delete the 4.8 MB music file because it looks large: both pages consume it. Historical `sources_7.md` describes a different self-made block-domino game and is not current implementation evidence.

## Verification

Recommended native sequence: exercise drag, tap-select and keyboard independently; attempt occupied-slot placement; form one exact `specificOrders` permutation; return from success and restart. Test blocked autoplay/storage and small-screen readability. Do not interpret a loading pass as proof that all eight permutations are solvable by every input method.

Actually run: Git blob inventory and `node --check` via standard input for 3 external/inline script units, 3/3 PASS. No execution implied. Reproduce parsing without checkout; focused extraction commands are in [batch verification](../audits/games-67.md#verification):

```sh
git show 8c8a055:"Games/Dominoes/touch.js" | node --check
```

A future authorized focused browser run may extract only this directory with `git archive` into a disposable directory, serve that root over HTTP, block third-party requests and terminate the server. Check disk first; do not alter sparse selection or leave dependencies. Main owns the unchanged serial full-catalog smoke gate, separately from these recommended interactions.

## Future outlook

Week 1: placement invariant and accessible success restart. Week 2: stop shrinking all text with board dimensions; scale art independently. Later: concise wrong-order feedback and optional music control with gesture unlock. Asset rights and an actual playthrough precede any audio replacement.
