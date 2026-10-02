# SubwaySurfers maintenance

<!-- maintenance-game: Games/SubwaySurfers -->

## Identity and status

Registered id 50, category `action`, entry `Games/SubwaySurfers/index.html`. Baseline `8c8a055`: 21 tracked files, 144,515,435 bytes. Docs-only review; local bootstrap does not certify offline gameplay or rights.

## Implementation map

Source review coverage: Read full registered HTML, `js/poki-noop.js`, both SanFrancisco manifests and small nested index/master-loader files; inspected registered UnityLoader instantiate/download boundaries. Compiled builds, 4399 SDK and nested vendor Poki core are not fully reviewed. Registered path loads local no-op then `Build/UnityLoader.js`. A lazy `my4399UnityModule` getter returns `window.UnityModule` when framework initialization needs it. Instantiate stores `window.unityGame`; progress fills `#loader .full`, while `Module.onRuntimeInitialized:hideLoader` removes overlay only when engine initialization completes. Nested `subwaysurfers/index.html` is a separate historical loader path, not the catalog entry.

## Gameplay and controls

Visible wrapper copy says swipe/drag or arrows to steer/jump/roll; these are source instructions, not newly verified compiled bindings. Catalog describes endless running/dodging, failure and inert online services. Wrapper has no restart button; engine restart/outcome/menu remain native-test boundaries. Local Poki breaks return false rather than pretending a watched reward. Do not invent multiplayer or leaderboards.

## State and persistence

Global `gameInstance/unityGame`, `pokiReady`, `pokiBridge` own the bridge. `initPokiBridge` sends `ready` if initialized; a microtask delivers it if bridge registration occurred earlier. Empty catches can hide a failed SendMessage. No authored save key; Unity persistence/quest lifecycle unknown. XHR/fetch guards redirect known host substrings; XHR forwards only method/url, fetch recognizes strings and Request.url. Reload preserves whatever engine storage already exists.

## Dependencies and provenance

Header records Kiloo/SYBO, mirror `https://github.com/a456pur/seraph`, abbreviated revision `ae2fcc6`; manifest is SanFrancisco 1.94.0, Unity 2019.4.18f1, memory 369,098,752 bytes. Local claim checked, upstream pin/license not remotely verified; no game-wide license found. Nested original Poki/4399 files remain tracked and are not equivalent to the registered no-op path. Their dynamic reachability/alternate-route exposure remains audit work.

## Audit findings

- MEDIUM, inline XHR hook: drops original open arguments on every call. Preserve argument list when replacing only URL.
- MEDIUM, `js/poki-noop.js: initPokiBridge()` empty catch: a failed ready message has no recoverable feedback. Root fix exposes a bounded error callback without reactivating SDK network behavior.
- MEDIUM, `index.html: #loader` spinner/viewport: continuous motion lacks reduced-motion override and zoom is disabled. Fix shell preferences after native control/layout verification.
- HIGH evidence hold, nested `subwaysurfers/master-loader.js` and vendor SDK chain: duplicate historical entry is directly accessible even if not registered. Do not delete it without consumer tracing; audit its network behavior separately.

No runtime fix or new native repro performed. Legal evidence holds are distinct from confirmed transport/bootstrap behavior.

## Safe iteration

Keep lazy constructor alias and ready handshake; these solve actual loader ordering. Patch wrapper transport/error CSS only. Do not enable backend services or restore 4399/Poki scripts as a boot workaround. Never materialize both huge builds just for documentation.

## Verification

Actually run: registered UnityLoader and authored helper/progress JS through stdin `node --check`, all exit 0. For Burrito Bison the retained Kongregate API also parsed. Zero native browser runs/screenshots. Source-only checks can be repeated with `git show HEAD:Games/SubwaySurfers/Build/UnityLoader.js | node --check`; no sparse selection changes needed. Historical `playtest_1.md` needed working WebGL flags before any conclusion; it did not prove death/restart. Recommended native: initial ready/menu, start, each lane/jump/roll action, collision/retry, reload persistence, offline service clicks, failed manifest and mobile reduced-motion frames. Test registered and alternate entry separately. Main owns any narrow asset lease and the unchanged serial full-catalog loading gate.

## Future outlook

First resolve rights and actual request/input evidence. Next implement the specifically identified authored wrapper lifecycle/accessibility fix with one small regression. Later profile real-device memory/load time and preserve saves before approved refurbishment. Defer new assets, online SDKs, engine rebuilds and speculative features.
