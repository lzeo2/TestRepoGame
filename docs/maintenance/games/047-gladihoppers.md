# Gladihoppers maintenance

<!-- maintenance-game: Games/Gladihoppers -->

## Identity and status

Registered id 47, category `action`, entry `Games/Gladihoppers/index.html`. Baseline `8c8a055`: 10 tracked files, 48,049,914 bytes. Docs-only review; local bootstrap does not certify offline gameplay or rights.

## Implementation map

Source review coverage: Read full `index.html`, `js/gladihoppers.js`, `appmanifest.json`, `Build/Gladihoppers.json`; inspected loader `instantiate/downloadJob` excerpts, not the full vendor loader or compiled WASM/data/framework. The local loader is `patch/js/UnityLoader.2019.2.js`; manifest reports Unity 2019.3.13f1. `startGame()` immediately instantiates `#gameContainer`; `showError()` handles only a missing loader. `#shell/#frame` provide 16:9 layout; `#hud` contains `#fullscreenBtn/#restartBtn`; `#error` receives text safely. `initPokiBridge(name)` sends `ready`, then commercial/rewarded completion messages through `unityGame.SendMessage`. Keep this handshake: a no-op object alone is not enough to open an engine menu.

## Gameplay and controls

Catalog describes career, upgrades and two-player local fights with menu-selectable WASD/arrows/gamepad. That menu mapping was not decoded from compiled code here. Wrapper Fullscreen uses Unity SetFullscreen or native fallback; Restart reloads the page, not a destructive save reset. PvP/IAP claims in source comments are unavailable offline features, not working multiplayer proof. Fight outcomes, touch controls and career persistence need actual engine play.

## State and persistence

`window.unityGame` and `pokiBridge` own the wrapper bridge. SDK promise methods resolve immediately; rewarded completion stringifies the resolved value. No authored game save key. Unity persistent storage/cache internals were not decoded, so reloading must not be described as clearing a career. Restart unloads the entire context. The authored error handler covers absent UnityLoader, not a failed manifest/data download.

## Dependencies and provenance

Header records Dreamon Studios, build v3.0.1, mirror `https://github.com/1000unblockedgames/Gladihoppers`, abbreviated revision `a14cd76`. These are checked local attribution claims, not remotely verified upstream pins or redistribution rights. No bundled game-wide license was found. SDK is local no-op code; compiled telemetry requests remain a runtime-closure question.

## Audit findings

- MEDIUM, `js/gladihoppers.js: startGame()` / `#error`: asynchronous engine download failures have no authored recoverable state; missing-loader handling is not a complete boot error path. Root fix: wire loader error callback to `showError`, retaining reload.
- MEDIUM, `index.html` viewport: zoom disabled; validate fit and touch controls before changing it.
- HIGH evidence hold, `Build/Gladihoppers.json` compiled service boundary: historical `playtest_1.md` recorded telemetry attempts. Current blocked-network request trace is required, not a claim that the no-op Poki object blocks all Unity transport.

No runtime fix or new native repro performed. Legal evidence holds are distinct from confirmed transport/bootstrap behavior.

## Safe iteration

Patch authored bootstrap callbacks/help and shell CSS only. Preserve ready/completion messages, loaded build and reload semantics; never substitute a decorative launch screen. Rights must be resolved before new distribution claims.

## Verification

Actually run: registered UnityLoader and authored helper/progress JS through stdin `node --check`, all exit 0. For Burrito Bison the retained Kongregate API also parsed. Zero native browser runs/screenshots. Source-only checks can be repeated with `git show HEAD:Games/Gladihoppers/patch/js/UnityLoader.2019.2.js | node --check`; no sparse selection changes needed. Historical `playtest_1.md` describes an old `#playBtn` overlay that is absent now; its successful restart was a reload. Recommended native: immediate menu entry, bridge readiness, solo fight/failure/rematch, local two-player configuration, saved career reload, fullscreen denial, manifest failure and offline requests. Capture desktop/mobile frames before subjective redesign. Main owns any narrow asset lease and the unchanged serial full-catalog loading gate.

## Future outlook

First resolve rights and actual request/input evidence. Next implement the specifically identified authored wrapper lifecycle/accessibility fix with one small regression. Later profile real-device memory/load time and preserve saves before approved refurbishment. Defer new assets, online SDKs, engine rebuilds and speculative features.
