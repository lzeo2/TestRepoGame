<!-- maintenance-game: Games/PapasPizzeria -->
# Papa's Pizzeria maintenance

## Identity and status

Registered id **53**, category `strategy`, entry `Games/PapasPizzeria/index.html`. Source reviewed at `8c8a055`; entry blob `265f1e226617cdf202d08b0dd514435a8bd3d3ea`, tree `2c14f32281a408e3cc72b327f3d3253fc39ae4cf`. Five tracked files total 9,523,385 bytes. Catalog offline-play language is a claim, not this audit's runtime result. This task changes documentation only; publication and rights remain owner decisions.

## Implementation map

The entry's `load` listener obtains `window.RufflePlayer.newest()`, creates a player, appends `#player` to `#ruffle`, and calls `player.load("papaspizzeria.swf")`. CSS sizes the container to `100vw` by `100vh`; there is no separate authored game engine. Local `ruffle.js` resolves its public path from `document.currentScript.src`, then loads `c5c02c4e65c1c4423a97.wasm`. Keep the JS/WASM pair together.

Source review coverage: the complete entry, inline CSS, ad-routing IIFE and bootstrap were read. Selected minified Ruffle anchors for `publicPath`, WASM fetch, `load`, storage and animation were inspected, not the whole emulator. Binary SWF/WASM gameplay, embedded asset terms and ActionScript were not human-reviewed. `json/null.json` is the local empty ad response.

## Gameplay and controls

The catalog describes taking orders, making, baking and serving pizzas across a shift. Those mechanics live in the SWF; the wrapper neither implements nor proves them. It defines no keyboard mapping, touch controls, score DOM, pause or restart button. Ruffle receives pointer input and has its own playback/audio UI, but that does not establish game-specific touch support. Determine actual controls and restart inside the loaded title before changing catalog instructions. Historical `docs/audit_batches/playtest_2.md` reports title-screen progression but no verified pizza gameplay; it is not a current pass.

## State and persistence

The wrapper has no save key or gameplay timer. Ruffle's JS bridge exposes localStorage and request/cancelAnimationFrame; save names and the SWF's SharedObject usage remain unknown. Origin and movie path changes can alter legacy save identity. Do not clear all origin storage to diagnose a single game. The wrapper does not catch the asynchronous `player.load` failure or provide a retry state.

## Dependencies and provenance

The entry comment credits Flipline Studios and identifies the mirror `https://github.com/a456pur/seraph`, branch `main`, path `games/papaspizzaria`. That is an acquisition assertion, not a pinned upstream revision or redistribution grant. No license/notice file is present in this five-file tree. Ruffle's general licensing must not be assigned to the SWF. The comment's fan/archival rationale is not permission evidence.

The request guard rewrites selected absolute HTTP(S) ad URLs to `json/null.json?…` for XHR and returns `{}` for fetch. Its host regex is a denylist, not a complete same-origin policy; script/image loads, protocol-relative URLs and unlisted hosts are not covered. Promo navigation is also distinct from background network activity.

## Audit findings

- **HIGH, rights hold:** `index.html`, `Attribution / provenance` comment. Mirror and ownership are named but permission is absent. Obtain publisher/game and emulator notices with source pins; do not invent MIT coverage or remove the game under this docs task.
- **HIGH, conditional offline gap:** `index.html`, `var external` and `XMLHttpRequest.prototype.open`. The claimed no-egress guarantee exceeds the hook's transport/URL coverage. Minimal root fix, if authorized: explicit Ruffle networking configuration plus same-origin URL validation at the loading boundary; verify all SWF requests first.
- **MEDIUM, loading recovery:** `index.html`, `player.load`. Failed SWF/WASM loads have no authored status/retry. Handle rejection visibly without replacing the original menu.
- **MEDIUM, accessibility:** viewport `user-scalable=no` blocks zoom; wrapper supplies no controls guidance. Remove zoom restriction and add source-verified instructions after play review.

## Safe iteration

Patch only the entry's guard/bootstrap and container shell in a later approved runtime task. Preserve the original SWF, Ruffle pairing and notices. Keep before/after source blob IDs and export legacy saves before moving URLs. Roll back explicit wrapper paths, not shared assets or unrelated catalog entries.

## Verification

Actually run: Git tree/resource inspection, stdin `node --check` on `ruffle.js`, and syntax parsing of both executable inline scripts, all passed. Native/browser runs **0**; screenshots **0**.

Reproduce without materializing Games: `git show HEAD:Games/PapasPizzeria/ruffle.js | node --check`. For a later Main-approved narrow browser lease, serve the repository root over HTTP, record every request with third-party access blocked, enter an order, complete a pizza, end a shift, reload and restart. Test touch and audio unlock separately. Historical title progression does not replace these checks or Main's full catalog gate.

## Future outlook

First resolve rights and the discrepancy between title progression and actual shift play. Then add loading recovery and accessible, verified controls. Within the month, test save continuity across reloads and narrow offline policies. Emulator upgrades require paired artifacts and gameplay comparison; new skins, assets and an engine rewrite are deferred.
