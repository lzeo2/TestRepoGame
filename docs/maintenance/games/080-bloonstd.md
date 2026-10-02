<!-- maintenance-game: Games/BloonsTD -->
# Bloons TD maintenance

## Identity and status

Registered id **80**, category `strategy`, entry `Games/BloonsTD/index.html`. Baseline `8c8a055`: entry `1e424c632ae139ba04f5e9132966f6dff1258229`, tree `ef5f48fac8640b16d783f1ce860fc574b69a440b`. Nine game files total 5,918,198 bytes. This catalog entry is a four-game hub, not one common engine. No current native run or licensing clearance occurred here.

## Implementation map

Root entry is a flex-column `.game-list` of four real anchor links: `btd/index.html`, `btd2/index.html`, `btd3/index.html`, `btd4/index.html`. It has no script, canvas or auto-launch. Each child entry creates full-height `#ruffle`, includes **`../../../storage/ruffle/ruffle.js`**, creates `#player` on window load, and calls `player.load` with its corresponding `btd.swf` through `btd4.swf`.

Each load options object sets `autoplay:"on"`, `splashScreen:false`, `unmuteOverlay:"hidden"`, black background. Shared emulator's sampled loader chooses `core.ruffle.15317142e75ce021ac04.js` / `core.ruffle.5e30dc5777a75720eae2.js` and `a71cef02d58dcec6f55f.wasm` / `6ce4f603a1fe7cc88438.wasm`. These are outside the nine-file game inventory and must be included in dependency reasoning.

Source review coverage: complete hub, all four child wrappers and inline CSS/options; selected shared Ruffle chunk/WASM, networking-default and SOL save-manager anchors. The 461,498-byte runtime/core bridges, binary movies/WASM and game assets were not fully human-reviewed. No tower placement or wave logic is authored in the wrappers.

## Gameplay and controls

Catalog describes popping bloons with towers. Placement, waves, economy, lives, completion/failure and restart belong separately to four SWFs. Wrapper code does not prove keyboard shortcuts or touch gameplay; do not publish guessed hotkeys from familiar titles. The hub's links are native keyboard-usable navigation, while in-game controls remain unknown at this boundary. Hidden unmute overlay plus autoplay can obscure the required audio gesture; verify each child rather than assuming all four share behavior.

## State and persistence

Hub has no state/persistence. Each child owns one Ruffle player per page load, no wrapper save key or interval. Shared save manager handles base64 SOL storage, host/path matching, export/replace/delete and reload. Exact per-movie SharedObject names and progression persistence are unknown; preserve child/movie URLs when migrating. Origin-wide clear would affect other games and is not a safe reset. Portal closing/return-to-hub lifecycle needs actual tests.

## Dependencies and provenance

All four SWFs, child entries and shared Ruffle dependencies exist in Git. Shared runtime contains no package/license file in its five-file directory; source/version pin and retained emulator notices require separate evidence. General Ruffle project URL `https://github.com/ruffle-rs/ruffle` identifies the emulator, not a verified source pin for these bytes. No authoritative game source/license or redistribution grant was found for the SWFs; title familiarity is not clearance.

Shared runtime default options include `allowNetworking:All` and `openUrlMode:Allow`. Child wrappers supply no stricter networking options. Historical `docs/audit_batches/playtest_r4.md` observed BTD1's external MochiAds loader dependency blocking progression and BTD4 partial menu progression with external calls. These are historical holds, not rerun results; hub loading alone never proves all four playable.

## Audit findings

- **HIGH, held offline/playability risk:** `btd/index.html`, `player.load({url:"btd.swf",…})`; historical remote-loader failure plus shared permissive network defaults. First reproduce the BTD1 dependency. Root remediation requires a legitimate complete local game source or compatible restrictive/local runtime policy, not enabling remote MochiAds or substituting unrelated content.
- **HIGH, provenance/notices hold:** all four movies and shared runtime have no verified full rights/pin evidence in reviewed tree. Obtain independent movie permission and emulator notices.
- **MEDIUM, audio accessibility:** every child `unmuteOverlay:"hidden"`/autoplay options. Test muted first interaction and expose a clear local audio affordance if needed.
- **MEDIUM, loading recovery:** child `player.load` promises are not handled. Add one per-wrapper failure/retry boundary; do not mistake a successful hub link for game readiness.
- **LOW, hub semantics:** root `<html>` has no `lang`; add language and visible focus styling in a later bounded shell patch.

## Safe iteration

Maintain four child identities and original menus. Do not delete BTD1 or relabel it working based on BTD4. Shared-runtime changes belong to Main's shared owner and require all-consumer review; this worker may only document the dependency. Save exports and exact paired blobs are prerequisites for migration/rollback.

## Verification

Actually run: Git resource checks; shared Ruffle stdin syntax check passed. All four child wrappers were read; root has no executable script. Native runs **0**, screenshots **0**. Reproduce: `git show HEAD:storage/ruffle/ruffle.js | node --check`.

Recommended Main-approved HTTP lease: navigate all four hub links, separately boot/place tower/start wave/change lives or money, fail/restart and reload saves. Record all blocked requests and especially BTD1 loader behavior. Test audio/touch and return navigation. Main's catalog smoke entry may cover only the hub unless its unchanged runner explicitly traverses children; disclose actual coverage.

## Future outlook

Rights and all-four playability first. Next expose honest per-child load/audio feedback. Month work should record child-specific save/input regressions and shared-runtime upgrade compatibility. No registration split, remote loader restoration or replacement game is authorized.
