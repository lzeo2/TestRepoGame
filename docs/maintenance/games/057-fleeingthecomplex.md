<!-- maintenance-game: Games/FleeingTheComplex -->
# Fleeing the Complex maintenance

## Identity and status

Registered id **57**, category `story`; entry `Games/FleeingTheComplex/index.html`. Source baseline `8c8a055`, entry `e81287b7913c698e62d7efa94b2e22c38a50186b`, tree `ef4bc7a981a6ba0d213e576c53da1666fa8042f1`. Twelve files total 60,666,680 bytes. Current loading/play was not tested by this docs-only audit.

## Implementation map

The complete entry is a black, marginless page with `#ruffle`. It loads `ruffle/ruffle.js`, initializes `window.RufflePlayer`, and on window `load` calls `newest()`, `createPlayer()`, appends `#player`, sets player width/height to 100%, and loads **`5.swf`**. The numeric filename is intentional identity: do not substitute a sibling Henry Stickmin movie.

The emulator is `@ruffle-rs/ruffle` nightly `0.1.0-nightly.2023.08.31` according to `ruffle/package.json`. Its loader feature-tests WebAssembly and chooses one of the `core.ruffle.1caf8a7231ccf85abb1d.js` / `core.ruffle.78cc902cbabd4bc44008.js` chunks with `a29c1b01570ffecf6fae.wasm` / `d6c752be1c7e690bf226.wasm`. Public-path resolution keeps this family under `ruffle/`.

Source review coverage: entire entry/inline styling, README, package metadata, MIT notice and JSZip/pako notice; loader excerpts for chunk/WASM fetch, `load`, `reload`, `confirmReloadSave` and `populateSaves` vicinity. The 365,571-byte loader and core bridges were sampled, not fully human-reviewed. SWF, WASM, full ActionScript and binary assets were not inspected. There is no authored JavaScript rules engine here.

## Gameplay and controls

Catalog describes branching prison-escape choices. Choice outcomes, endings, failures, score/progress and replay are SWF-owned. The wrapper specifies no arrow keys, WASD or touch buttons, and has no score DOM or restart. Ruffle input capability is not proof of the movie's control scheme. Verify choice clicks, a failure retry and at least one ending before writing detailed play instructions. Audio may need the emulator's user gesture; wrapper has no autoplay override or independent mute control.

## State and persistence

No wrapper save key, timer or external account exists. Selected Ruffle code manages base64 SOL exports, replacement/deletion, localStorage and reload via `loadedConfig`. Its save-manager matching uses SWF hostname/path. Exact movie SharedObject names and ending persistence were not established. Moving `5.swf` or changing origin can affect identity; export saves before such a change. Do not use origin-wide storage clearing as a game reset.

## Dependencies and provenance

All direct bootstrap dependencies are tracked locally. Emulator README links `https://github.com/ruffle-rs/ruffle`; package declares `(MIT OR Apache-2.0)` and both license files are bundled. JSZip/pako licensing is recorded separately in `ruffle.js.LICENSE.txt`. These notices license the emulator/components, not `5.swf`. No verified game publisher permission, upstream game URL or revision pin was found in this folder; rights remain unknown. A matching franchise name in the catalog is not permission evidence.

## Audit findings

- **HIGH, rights hold:** `5.swf`, no companion game license/source record. Obtain game-specific permission and a source pin without overwriting emulator notices.
- **MEDIUM, player geometry:** `index.html`, `#ruffle` has `width`/`height` HTML attributes on a div but no CSS size. The player percentage height lacks a definite viewport-height ancestor. Impact may be undersized/default-height rendering; minimal fix is explicit container/ancestor sizing after viewport screenshots, not SWF changes.
- **MEDIUM, failure feedback:** `player.load("5.swf")` is not awaited/caught. Add a visible failed-load/retry state using this one bootstrap boundary.
- **Evidence gap, not an observed leak:** wrapper leaves Ruffle network policy implicit. Review movie requests with third-party access blocked before claiming offline closure; no new network activity was run here.

## Safe iteration

Only an authorized later task may change wrapper sizing/loading feedback. Keep movie, all paired chunks/WASM and notices together. Preserve SWF path/save identity and original choice menu. Do not force a generic win/lose screen over branching outcomes or update just one emulator artifact.

## Verification

Actually run: Git inventory/reference inspection, parser checks for entry inline script and `ruffle/ruffle.js`; sampled optimized core JS also parsed. Native runs **0**, screenshots **0**. Reproduce: `git show HEAD:Games/FleeingTheComplex/ruffle/ruffle.js | node --check`.

Recommended Main-approved HTTP lease: inspect initial player bounds, open a choice, retry a failed choice, reach an ending, reload and test saves/audio/touch. Block third-party requests and distinguish blocked SWF calls from bootstrap errors. Main alone runs the full catalog gate.

## Future outlook

Rights and a real choice/retry test first; viewport sizing and loading recovery next. Month work should verify ending persistence and keyboard accessibility of the wrapper without inventing movie controls. Emulator upgrade or shared-runtime consolidation waits for compatibility/save comparison and explicit approval.
