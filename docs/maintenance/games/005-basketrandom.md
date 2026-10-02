# Basket Random maintenance

<!-- maintenance-game: Games/BasketRandom -->

## Identity and status

Registered id 5, category `sports`, entry `Games/BasketRandom/index.html`, not featured. Baseline `8c8a055`: 77 files, 3,385,055 bytes. Catalog tags this as two-player local play. Local script references establish a static Construct export, not a current clean native/offline pass.

## Implementation map

Source review coverage: all entry HTML, `style.css`, support checker, offline client, service-worker registration, dispatch/job workers and small analytics/client scripts read. Inspected bootstrap/runtime-init excerpts of `scripts/main.f.js` and object/plugin anchors in `data.json`. The large `scripts/c3runtime.js`, Box2D glue/WASM, compiled events and patch SDK bundles were not fully human-reviewed. HTML loads `box2d.wasm.js`, `scripts/supportcheck.js`, `scripts/offlineclient.js`, `scripts/main.f.js` and `scripts/register-sw.js` in order. `C3_IsSupported` gates runtime creation on WebGL/WebAssembly. Runtime creates `window.c3canvas`; entry contains only `#fb-root` and noscript `#notSupportedWrap`, not DOM gameplay buttons. Dispatch workers own queued image jobs; `ProcessImageData` flips/unpremultiplies sprite buffers. Basket loads the formatted `main.f.js`, not the adjacent `main.js` or `js/main.min.js`. Its data includes `playerLine` and basketball court/pot sprites. Opus decoder glue and WASM are tracked under `scripts/`.

## Gameplay and controls

The catalog describes random physics sports rounds and shared-keyboard two-player play. Its `howto` claims Arrows plus Space and a randomly swapped control; these claims were not verified by decoding all event data. Entry's keydown merely prevents browser scrolling for Space and arrows, which is not a gameplay mapping. Actual athlete keys, touch regions, target score, menu/start and match restart remain engine verification work. Historical `playtest_0.md` saw input-driven canvas changes but did not complete/restart a match. Local media supports audio; autoplay unlocking is handled by the Construct DOM audio bridge. Do not add a fake start overlay or invent fixed win rules.

## State and persistence

Construct owns round scores, physics and scene state; no game-specific save key appears in the inspected wrapper. `OfflineClientInfo` uses the shared BroadcastChannel name `offline`, queues messages and drains them through `SetMessageCallback`. This is cache messaging, not proof of saved matches. `register-sw.js` has `navigator.serviceWorker && 1==0`; registration is intentionally disabled and no `sw.js` is tracked. Runtime uses main-thread mode; named `workermain.js` is not evidence that a worker runtime is selected. Dispatch/job workers are still separate image-processing infrastructure. Save behavior and match reset internals remain unknown.

## Dependencies and provenance

Local Construct runtime, Box2D, images and WebM audio. Retained `js/analytics_ubg_v1_4.js` can dynamically load Google Tag Manager; `js/ubg235_client_v1_1.js` can load a remote client. Neither is a direct script tag in the registered entry. Dynamic reachability through compiled code is not cleared by that absence. No game license/source revision was established; do not apply MIT to a Construct export. `@source.txt` gives https://html5.gamedistribution.com/rvvASMiM/bf1268dccb5d43e7970bb3edaa54afc8/ as a distribution location, not permission.

## Audit findings

- MEDIUM, `index.html` viewport `user-scalable=no`: prevents zoom in a canvas-only interface. Root fix: allow zoom and test actual controls/layout, rather than blanket input suppression.
- MEDIUM, `scripts/main.f.js` runtime-init boundary and retained analytics/client scripts: offline dependency closure is unresolved for dynamic event calls. Recommended repro: record all requests during menu, both-player match, sound toggle and restart with external network denied. If reached, fix the central loader/event hook with a local compatible stub; do not delete all patch SDKs by pattern.
- MEDIUM, historical `playtest_0.md`: undefined `src` assignment and blocked `js/null.js` were recorded while gameplay continued. Current reproduction and exact compiled caller are pending; do not declare the error fixed or rewrite the engine based on the old log.

License/source absence is a release-evidence hold, separate from a demonstrated gameplay crash. No new native result here.

## Safe iteration

Keep runtime/data/sprites paired. Wrapper HTML/CSS and a verified SDK boundary are smallest patch points. Edit `main.f.js` only if a justified bootstrap defect is authorized; changing inactive `main.js` cannot repair the registered path. Trace constructed paths with Git before any future cleanup. Preserve original notices and match rules.

## Verification

Actually run: Git blob `scripts/main.f.js` through `node --check`, exit 0. Read-only Git inventory/reference review; zero native browser runs/screenshots. Repeat syntax without checkout: `git show HEAD:Games/BasketRandom/scripts/main.f.js | node --check`. Main must lease a narrow game tree for native WebGL, sound, both-player input, victory/rematch and mobile screenshots. Cold network denial and warm-cache navigation are different tests. Main's full-catalog gate remains separate.

## Future outlook

First resolve source/rights and dynamic requests. Next replace unreliable catalog control claims with native menu evidence and add accessible wrapper help only if needed. Then evaluate zoom, orientation and cache semantics. Defer new multiplayer services, physics redesign and extra content; this task adds none.
