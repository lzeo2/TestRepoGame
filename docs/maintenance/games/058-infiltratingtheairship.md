<!-- maintenance-game: Games/InfiltratingTheAirship -->
# Infiltrating the Airship maintenance

## Identity and status

Registered id **58**, category `story`, entry `Games/InfiltratingTheAirship/index.html`. Baseline `8c8a055`: entry `25b63af4f21e7c340752e0f90fd79df3dff0f7ae`, tree `7f13c4a21265bf0cc4be806a70d8dd68c08a02cb`. Twelve files total 55,918,858 bytes. This page documents existing source, not a new port, permission clearance or native pass.

## Implementation map

`index.html` loads `ruffle/ruffle.js`. Its `load` listener calls `window.RufflePlayer.newest()`, constructs a player, appends it as `#player` under `#ruffle`, applies percentage dimensions and calls `player.load("infiltratingtheairship.swf")`. The explicit movie path distinguishes this build from Fleeing the Complex's `5.swf`; changing only titles would not port another game.

The bundled Ruffle loader computes `publicPath`, tests WASM extensions and selects optimized/vanilla core chunks. Both `core.ruffle.1caf8a7231ccf85abb1d.js` and `core.ruffle.78cc902cbabd4bc44008.js`, plus `a29c1b01570ffecf6fae.wasm` and `d6c752be1c7e690bf226.wasm`, are tracked in this folder. Chunk choice is emulator logic, not game logic.

Source review coverage: complete entry and CSS; this game's loader excerpts for WASM/chunks, async `load`/`reload` and SOL save-manager interfaces. Supporting README/package/license evidence was inspected from the corresponding Fleeing emulator family; Git blob comparisons confirmed this game's README, package, MIT/Apache notices and JSZip/pako notice are identical. This is not a full review of this game's vendor internals. The 365,571-byte loader, bridges, binary SWF and WASM were not fully human-reviewed. Author/game functions are unavailable as readable source here.

## Gameplay and controls

Catalog describes branching infiltration choices aboard an airship. Engine-specific keyboard controls, touch behavior, ending requirements and score counters are unknown at this wrapper boundary. There are no authored movement handlers, controls labels or reset button. Pointer/keyboard support inside Ruffle does not establish how the movie uses input. Test a menu choice, failure retry and ending rather than interpreting idle animation as progression. Ruffle's audio/play gate owns initial sound activation; wrapper does not override it.

## State and persistence

The entry creates one player per page load and no custom interval or game save key. Sampled emulator functions `confirmReloadSave`, `replaceSOL`, `reload`, `isB64SOL` and save-manager population interact with localStorage and base64 SharedObject files. Path/host matching determines which saved data belongs to a movie. Exact Airship save names and whether endings survive reload remain unknown. Preserve the movie URL and back up its identified saves before a runtime migration.

## Dependencies and provenance

Direct HTML dependencies are local and tracked. `ruffle/package.json` identifies nightly `0.1.0-nightly.2023.08.31`, repository `https://github.com/ruffle-rs/ruffle`, and MIT-or-Apache-2.0 emulator licensing. Both emulator license files and a JSZip/pako notice are present. These do not grant redistribution of `infiltratingtheairship.swf`. No authoritative game URL, publisher permission or game revision pin was verified in the directory. Keep game rights explicitly unknown.

## Audit findings

- **HIGH, provenance hold:** `infiltratingtheairship.swf` has no game-specific permission/source record. Resolve code/art/movie rights independently of Ruffle's license.
- **MEDIUM, layout risk:** `index.html`, `<div id="ruffle" width="100%" height="100%">`. Width/height attributes do not size a div, and player height is percentage-based without a definite height parent. Minimal fix is viewport/ancestor CSS, validated against actual movie dimensions.
- **MEDIUM, boot recovery:** `player.load` has no rejection handler. Surface the failed movie/dependency and a retry, without a new decorative launch menu.
- **Unverified boundary:** no explicit network policy is supplied to Ruffle. Unknown movie calls are a tracing requirement, not a confirmed XSS or network defect based on minified strings.

## Safe iteration

Prefer entry CSS and the one load boundary. Preserve original branching/retry UI and game title identity. Retain both emulator execution variants and notices; upgrades must be all-or-nothing with save compatibility evidence. Never migrate to a shared runtime just because the filenames match, without blob/runtime comparison and a browser replay.

## Verification

Actually run: Git tree/resource inspection and stdin parser checks for this loader and entry script, passed. Native/browser runs **0**, screenshots **0**. Reproduce: `git show HEAD:Games/InfiltratingTheAirship/ruffle/ruffle.js | node --check`.

Recommended Main-approved HTTP lease: verify player bounds, choice input, a fail/retry, an ending, audio unlock and reload persistence; repeat touch/keyboard navigation only where the movie supports it. Capture all requests with third-party access blocked. Main's full catalog smoke is separate and cannot prove all endings.

## Future outlook

First rights verification, then genuine branch/retry evidence. Next improve viewport fit and load-error recovery. Month work should compare saved ending state across reload and any proposed emulator update. No new story content, reconstructed engine or generated art is justified by this audit.
