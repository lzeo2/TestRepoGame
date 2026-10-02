<!-- maintenance-game: Games/GeometryDashLite -->
# Geometry Dash Lite maintenance

## Identity and status

Registered id **66**, category `action`, entry `Games/GeometryDashLite/index.html`. Baseline `8c8a055`: entry `e4a142970a4d0124bac2658c6b3669374d621d4e`, tree `6142e881670eef8a6cd804fe58bdfe0aaa004f73`. Thirty-three files total 54,991,081 bytes. Existing Unity build; source documentation is not a native play or copyright certification.

## Implementation map

Entry loads theme CSS, `Build/UnityLoader.js` and local jQuery 3.4.1. `UnityLoader.instantiate("gameContainer", "Build/GeometryDashLite.json", {onProgress:UnityProgress})` creates the game. Manifest says `DefaultCompany`, product **`GeometryDashLife`**, version `0.1`, Unity `2019.4.24f1`, WebGL 2/1 and local compressed data/WASM/framework URLs. Do not infer an official publisher build from the portal title.

`UnityProgress` exits without a Module, shows `.progress`, stores `.full` as `gameInstance.progress`, applies `scaleX(progress)` and hides `#loader` after a single 2000 ms timeout at progress 1. Loader artwork is `image/loading.png` and process-bar PNGs. `StreamingAssets/audios/` contains named music and effects; runtime use/terms were not decoded from Unity. Shell dimensions are `100vw`/`100vh`.

Source review coverage: complete entry, theme CSS and manifest; selected Unity loader download/decompression/IndexedDB paths. Minified jQuery and 160,031-byte loader were not fully human-reviewed; Unity payloads and 21 audio files were not inspected for gameplay/source rights. Legacy `ToggleInfo`, `ShowInfo`, `HideInfo` functions were read; their `.main-panel`/`button.hide-main-panel` targets are absent from current HTML.

## Gameplay and controls

Catalog describes a rhythm platformer. No jump key, touch tap, pause, score/progress, fail or restart handler is defined in the wrapper. Actual game input/menu/levels are compiled and unknown in this review. Named songs are asset evidence, not proof of specific playable levels or licenses. Do not infer Space/arrow/touch controls from a familiar franchise.

A separate entry script scans all buttons for text `OK` and clicks them at DOMContentLoaded and one second later. These are compatibility/dialog automation, not a user-driven start path; compatibility warnings must be reviewed rather than hidden.

## State and persistence

The wrapper keeps `gameInstance.progress` and `removeTimeout`, but no gameplay save key. UnityLoader's `/idbfs-test` probe/cache does not prove persistent scores. The loader timeout only hides the overlay, not the game. No shell error state or replay exists. Origin/protocol changes may affect any engine save; establish actual storage before migration.

## Dependencies and provenance

Current shared `../../storage/js/cloak.js` is a tracked no-op, `../../images/ico.ico` is tracked, and all manifest resources exist in Git. A canonical URL points to `https://gamecomets.com/game/geometry-dash-lite/`; theme filenames reference another archive domain. These are inherited locator/metadata references, not verified source ownership or license. No game/audio permission or source revision pin was found in this tree. A local jQuery copy does not grant permission over Unity content or music.

## Audit findings

- **MEDIUM, unintended dialog action:** `index.html`, DOMContentLoaded script checks `innerHTML == "OK"` and invokes `.click()` on every matching button. It can dismiss meaningful compatibility notices without consent; minimal fix is remove broad auto-clicking and allow native user acknowledgement.
- **LOW, dead shell code:** `ToggleInfo` dereferences `children('i')[0]` although no matching button exists; Show/HideInfo and theme panel CSS are orphaned in the entry. No current caller means not a confirmed crash. Remove only after tracked caller audit, keeping the Unity bootstrap unchanged.
- **MEDIUM, failure feedback:** `UnityProgress` has no error/retry path. Add a shell loader error state through supported callbacks, not a second title screen.
- **LOW, house-style mismatch:** entry background/loader use gradients. A later shell-only solid-color change is appropriate; do not recolor game art or songs.
- **HIGH, rights hold:** Unity/music terms and actual creator/source are unverified, especially with `DefaultCompany`/`GeometryDashLife` metadata.

## Safe iteration

Patch loader/dialog and orphan shell behavior only under approval. Preserve build manifest/payload pairing and original menu. Do not rewrite music paths or delete audio based on wrapper references; Unity may construct them internally. Keep immutable blob IDs and check engine save identity before changing URLs.

## Verification

Actually run: Git resource checks, manifest parsing, stdin `node --check` for UnityLoader and all three executable entry scripts; passed. Native runs **0**, screenshots **0**. Reproduce: `git show HEAD:Games/GeometryDashLite/Build/UnityLoader.js | node --check`.

Recommended Main-approved HTTP lease: compatibility warning without automation, title to playable level, actual jump input, death/retry/completion, music toggle, audio unlock and reload saves. Capture streaming audio requests with remote access blocked; inspect viewport fit and hardware frame timing. Main's loading gate cannot prove beat/input synchronization.

## Future outlook

Resolve game/music rights and official-build identity first. Next remove broad dialog automation and add useful loading errors. Month work should verify level retry, input timing and audio continuity before any shell refurbishment. No new songs, remade engine or unsupported mobile promise.
