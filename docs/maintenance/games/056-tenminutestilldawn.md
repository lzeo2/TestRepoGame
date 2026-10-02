<!-- maintenance-game: Games/TenMinutesTillDawn -->
# 10 Minutes Till Dawn maintenance

## Identity and status

Registered id **56**, category `action`; entry `Games/TenMinutesTillDawn/index.html`. Baseline `8c8a055`, entry `df718c04d022ecf0c2fbfc3caae3347b900b08ef`, tree `d641288d2a73cf03d6df9e8a60d22ddeb78ace52`. Seven files total 50,485,494 bytes. Documentation-only review; current browser gameplay and offline operation were not run.

## Implementation map

The entry loads `Build/UnityLoader.js` and calls `UnityLoader.instantiate("gameContainer", "Build/10MinutesTillDawnWebGL.json")` from the head. The JSON identifies Flanne, `MinutesTillDawn` version `0.1`, Unity `2019.4.21f1`, non-development, non-threaded WebGL 2/1 output. Relative `dataUrl`, `wasmCodeUrl` and `wasmFrameworkUrl` resolve under `Build/` to the three matching `.unityweb` files.

`onResize()` reads `gameInstance.Module.canvas` and `gameInstance.container`, fits a 1200:675 rectangle to window dimensions and centers it by top/left offsets. Body `onload` and a window resize listener invoke it. `data-pixelated="true"` selects crisp canvas rendering. Loader excerpts cover `downloadJob`, decompression, `processWasmFrameworkJob` and `setupIndexedDBJob`.

Source review coverage: complete entry/CSS and build JSON; selected minified loader bootstrap/download/storage paths. The 159,436-byte loader was not read in entirety, and compressed WASM/framework/data gameplay was not inspected. There are no readable survival-loop functions in the wrapper.

## Gameplay and controls

Catalog describes a ten-minute survival run, upgrade choices and horde encounters. Wrapper code has no movement/fire/reload bindings, touch pad, score text or restart action. Input, title menu, countdown, deaths and replay belong to Unity. Controls therefore remain unknown at source boundary. Historical `docs/audit_batches/playtest_r1.md` reports menu progression but explicitly leaves the survival loop untested; that cannot support a full-run claim.

## State and persistence

Authored state is `gameInstance` and `scaleToFit`. The latter becomes `true` by intentionally failing `JSON.parse("")`; no configuration actually controls it. There is no localStorage key or game timer in the entry. Loader IndexedDB tests (`/idbfs-test`) and Unity cache are not proof of progress persistence. Save/reset semantics require engine/native investigation. Window resize listener remains for page lifetime; no separate wrapper game loop is created.

## Dependencies and provenance

Everything directly referenced by the entry/build manifest is tracked locally: loader, manifest, three build blobs and `icon.png`. JSON company metadata identifies Flanne but is not a license or source pin. No license, credits document or authoritative source URL is present in this seven-file game tree. Redistribution rights and embedded audio/art terms remain unknown. Do not treat a downloadable build as open-source permission.

## Audit findings

- **MEDIUM, lifecycle risk:** `index.html`, `onResize`, direct `gameInstance.Module.canvas` access. Body load/resize can occur before Unity creates a canvas, especially with delayed or failed build requests. Impact is a possible TypeError and lost sizing. Minimal root fix: guard canvas/container readiness in the shared resize function and invoke it from supported ready/progress callbacks; do not duplicate guards at each listener. Static risk, not a newly observed crash.
- **LOW, dead configuration:** `JSON.parse("")` try/catch and empty `background: ;`. Both are wrapper cruft, also noted in `docs/audit_batches/batch_2.md`. Replace with `scaleToFit=true` and one valid background declaration when runtime edits are approved.
- **MEDIUM, mobile documentation:** no viewport meta or source-verified controls. Add viewport and factual input guidance after native review; do not fabricate touch support.
- **HIGH, rights hold:** build metadata lacks permission/source evidence. Resolve before publication decisions.

## Safe iteration

Use `onResize` and authored shell CSS as bounded patch points, leaving build blobs and loader intact. Preserve 16:9 fit and pixelated option until desktop/mobile screenshots justify change. Handle real loader failure visibly instead of covering Unity's menu with a new launch screen. Keep original manifest/blob pairing for rollback; no speculative decompression edits.

## Verification

Actually run: Git inventory/dependency checks, JSON parsing, stdin `node --check` on UnityLoader and executable entry script; passed. Native runs **0**, screenshots **0**.

Reproduce parser check: `git show HEAD:Games/TenMinutesTillDawn/Build/UnityLoader.js | node --check`. Recommended Main-approved HTTP lease: throttle or fail the manifest/WASM download, resize before readiness, enter survival, verify aim/fire/movement from actual instructions, gain an upgrade, lose/restart and complete the ten-minute objective. Record offline requests and reload/save behavior independently. Full catalog loading is Main's separate gate.

## Future outlook

First resolve rights and guard resize readiness. Next remove configuration cruft and document verified input. Month work should test a full survival run and replay on hardware, profile memory and pause/resume under backgrounding. Touch conversion and gameplay rebalance wait for source availability and explicit authorization.
