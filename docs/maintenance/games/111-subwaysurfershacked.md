<!-- maintenance-game: Games/SubwaySurfersHacked -->
# Subway Surfers Hacked maintenance

## Identity and status

Registered id **111**, category `arcade`, entry [index.html](../../../Games/SubwaySurfersHacked/index.html). Baseline `8c8a055`: 21 files, **144,518,418 bytes**; entry blob `a267aec1330b6040bf407c3045b54bc3f543b079`. Existing Unity port/cheat wrapper. Local canonical launch and legacy nested launch have different security/dependency boundaries.

## Implementation map

Canonical entry installs XHR/fetch service guards, cheat polling, then loads `js/poki-noop.js`, `Build/UnityLoader.js` and `UnityLoader.instantiate("gameContainer", "Build/SanFrancisco/SanFrancisco.json", ...)`. A lazy `my4399UnityModule` getter resolves the framework's UnityModule. `UnityProgress` updates `#loader .progress .full`; `hideLoader` runs onRuntimeInitialized. JSON identifies Unity 2019.4.18f1, Kiloo Games, version 1.94.0, nonthreaded build, memory 369098752 and local data/code/framework unityweb files. Listed asm fallback files are absent from this inventory.

Source review coverage: full canonical/nested entry, Poki no-op, JSON and nested master-loader; selected UnityLoader framework/error anchors reviewed. 25,765,359-byte wasm code, 27,979,216-byte data, compressed framework and vendor SDK internals are not fully human-reviewed. Nested `subwaysurfers/` retains another data/code copy, old SDKs and additional extensionless blobs; constructed/legacy consumers must be traced before any deletion.

## Gameplay and controls

Loader copy says swipe/drag or arrow keys for steering/jumping/rolling; these bindings are engine-owned, not newly proven by HTML. Canonical wrapper has no native start/retry controls. Polling waits for gameInstance, overrides SendMessage coin/score/collect values to 999999, suppresses crash/hit/death/life/damage/obstacle message names and sends `ScoreManager.SetCoins` every two seconds for up to sixty seconds. Internal Unity collisions need not cross JavaScript SendMessage, and target existence is not verified. Thus a HACKED log/badge is not proof of effective invulnerability. Historical [playtest r7](../../audit_batches/playtest_r7.md) saw frames/inputs but did not reach restart.

## State and persistence

Unity owns run state/save internals; no exact save key was established. Globals gameInstance/unityGame expose bridge access. Discovery interval runs every 500 ms until instance exists; coin timer clears at sixty seconds but patched SendMessage remains. Local Poki bridge uses pokiReady/pokiBridge and sends `ready`; commercial/rewarded breaks resolve false. Backend features are inert: selected absolute URL patterns get local empty JSON or synthetic `{}`. The XHR override forwards only method/url, dropping optional async/auth arguments; guard coverage is not a universal sandbox.

## Dependencies and provenance

Canonical comment identifies `https://github.com/a456pur/seraph`, branch main, abbreviated revision ae2fcc6 and path games/subwaysurfers. This is supplied provenance, not independent upstream/network or rights verification. Build metadata verifies company/product labels only. No LICENSE is in this directory inventory. Kiloo/SYBO game/art redistribution rights remain unresolved. Do not infer permission from vendored mirror or inert ad stubs.

## Audit findings

- **CRITICAL**, `subwaysurfers/index.html`, Google tag manager script src: separately reachable legacy entry automatically loads a third-party analytics script and `4399.z.js`; `master-loader.js` loads local poki-sdk.js, unlike guarded canonical launch. Reproduce direct nested URL with request logging. Minimal root repair is an authorized offline redirect/wrapper or locally stubbed full dependency chain after consumer audit; no deletion performed here.
- **HIGH**, `Build/UnityLoader.js`, `parent.showUnitywebNoSupport()`: unsupported WebGL/error paths assume a parent method absent from standalone wrapper. Historical r7 confirms exception/stuck loader in no-WebGL environment. Supply authored fallback error UI or a narrow callback contract; do not suppress genuine load errors.
- **MEDIUM**, canonical cheat SendMessage hooks: broad regex targets and guessed ScoreManager methods lack engine evidence. Test actual engine effects before advertising complete god mode; preserve intentional cheats while narrowing to verified calls.
- **MEDIUM**, canonical XHR/fetch guard: host-substring deny-list misses protocol-relative/new hosts and changes API signatures. Parse resolved URL, preserve arguments and audit actual compiled callers before authorized repair.
- **MEDIUM**, loader CSS/viewport: perpetual spinner lacks reduced-motion fallback, zoom disabled, no reachable error retry.

## Safe iteration

Canonical wrapper is the safe patch point; keep local bridge handshake and lazy framework alias. Never blindly modify compressed framework/wasm or remove nested copies on a size-only argument. Document all constructed consumers first. No accounts, new backend, ad SDK restoration or rights relabeling.

## Verification

Actually run: Git inventory/JSON and source inspection; native **0**, screenshots **0**. Recommended bounded supervisor-owned checkout: canonical and nested request closure, WebGL unavailable fallback, ready handshake, loader completion, actual start/steer/failure/retry, and observable coin/cheat behavior. Inspect reload saves and denied storage without inventing keys. Measure real target-hardware memory/fps separately from historical software-renderer evidence. Main owns full smoke.

## Future outlook

First resolve nested remote loads, rights and error fallback. Next verify cheat targets and preserve loader progress/accessibility. Later audit duplicate build consumers for storage reduction, with evidence before deletion. Defer graphics/engine rebuilds and online features.
