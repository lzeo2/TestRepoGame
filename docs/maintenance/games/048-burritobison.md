# BurritoBison maintenance

<!-- maintenance-game: Games/BurritoBison -->

## Identity and status

Registered id 48, category `action`, entry `Games/BurritoBison/index.html`. Baseline `8c8a055`: 11 tracked files, 33,596,058 bytes. Docs-only review; local bootstrap does not certify offline gameplay or rights.

## Implementation map

Source review coverage: Read full entry, `js/unity-mod.js`, `Build/Web.json`; reviewed bounded `UnityLoader.instantiate/downloadJob`, framework XHR routing and Kongregate `sendEvents` excerpts. The full vendor loader, retained SDK, asm.js engine/data/memory were not human-reviewed. Scripts load URL-fix helper, UnityLoader, Kongregate API, then `UnityLoader.instantiate("gameContainer", "Build/Web.json", {onProgress:UnityProgress})`. `#loader` contains local `Build/logo.png`, spinner and progress fill. Manifest selects asmCode/asmMemory/asmFramework/data assets and reserves 536,870,912 bytes.

## Gameplay and controls

Catalog describes launch-distance runs, smashing targets, collecting cash and buying upgrades. Exact launch gesture, active control, failure and reset rules live in compiled gameplay and were not verified here. Wrapper has no start/restart buttons. `UnityProgress()` shows the fill once Module exists and hides the loader at progress 1; that is download readiness, not proof input is accepted. Historical playtest rendered an idle scene but did not establish launch control.

## State and persistence

`gameInstance` owns engine state; `.progress` is cached on that object. No authored save key or explicit reset API. Unity engine owns upgrades and persistence, which are unknown. Loader context destruction on navigation handles session lifetime; no wrapper timer loop beyond spinner CSS. Reload is only a browser fallback, not a verified in-game reset.

## Dependencies and provenance

Header credits Juicy Beast Studio, mirror `https://github.com/a456pur/seraph`, branch main/path games/burritobison, no pinned revision. Attribution is not permission; no game-wide license found. Local Kongregate API is retained. `UnityUrlFix()` redirects listed Unity/Kongregate/Swrve/cloud hosts to `json/null.json`; framework XHR actually calls it. SDK `sendEvents()` itself opens protocol-relative Swrve directly and no helper call was found there, so full network closure is not proven.

## Audit findings

- HIGH, `Build/kongregate_api.js: sendEvents()` direct `e.open("POST", "//" + ... + ".api.swrve.com/1/batch")` bypasses framework-only `UnityUrlFix`. Whether SDK configuration activates it is pending native capture. Root fix if reachable: guard the shared transport/stub required API locally, not merely expand the framework regex.
- HIGH historical hold, `docs/audit_batches/playtest_1.md: Burrito Bison`: scene rendered but no input/progress demonstrated. Obtain actual tutorial/launch gesture before calling the game playable.
- MEDIUM, `index.html: #loader` spinner: no reduced-motion preference or authored async failure state. Add static status/error feedback, not another game menu.

No runtime fix or new native repro performed. Legal evidence holds are distinct from confirmed transport/bootstrap behavior.

## Safe iteration

Patch helper transport and wrapper loading/error states only after permission. Preserve Kongregate call surface and asm asset pairing; do not rip out the SDK without identifying engine consumers. Memory budget needs hardware evidence before changes.

## Verification

Actually run: registered UnityLoader and authored helper/progress JS through stdin `node --check`, all exit 0. For Burrito Bison the retained Kongregate API also parsed. Zero native browser runs/screenshots. Source-only checks can be repeated with `git show HEAD:Games/BurritoBison/Build/UnityLoader.js | node --check`; no sparse selection changes needed. Recommended native: locate real launch tutorial, launch, gain cash/distance, fail, retry, buy one upgrade, reload saved state and capture all requests under denial. Test fresh/failed assets and reduced motion. Historical idle animation is not a play pass. Main owns any narrow asset lease and the unchanged serial full-catalog loading gate.

## Future outlook

First resolve rights and actual request/input evidence. Next implement the specifically identified authored wrapper lifecycle/accessibility fix with one small regression. Later profile real-device memory/load time and preserve saves before approved refurbishment. Defer new assets, online SDKs, engine rebuilds and speculative features.
