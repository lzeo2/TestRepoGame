# Chrome Dino maintenance

<!-- maintenance-game: Games/ChromeDino -->

## Identity and status

Registered id 10, category `classic`, entry `Games/ChromeDino/dino.html`. Three files, 137,099 bytes at `8c8a055`. This single-file adaptation uses embedded image/audio resources; current cross-browser and licensing status are not certified.

## Implementation map

Source review coverage: entry lines 1-960 covering Runner bootstrap, update/input/reset/collision plus final CSS/DOM/bootstrap portion; README and license header inspected. Remaining obstacle/Trex/horizon implementation and most embedded payloads were not fully reviewed. `Runner` is a singleton published on `window`; it resolves `.interstitial-wrapper`, creates canvas/container, loads `1x-*` or `2x-*` image elements and instantiates `Horizon`, `Trex`, `DistanceMeter`. `Runner.prototype.update()` advances time/distance, checks `checkForCollision()` and schedules through `raq()`. `GameOverPanel` paints result/restart sprites. `Runner.updateCanvasScaling()` accounts for device/backing pixel ratios. Final bootstrap constructs Runner only if the user-agent contains `chrome`.

## Gameplay and controls

Space/Up activate and jump; key release ends a jump. `Runner.keycodes.DUCK` maps Down, but inspected input only sets speed-drop while jumping: do not promise a standing duck animation. Enter restarts on release after crash, as do jump keys after 750 ms and mouse-up on the canvas. Touch starts jumps and can restart from the crashed container on mobile-classified user agents. The runner gains distance until collision; no finite win condition. Audio buffers load on first activation, from `#audio-resources` press/hit/reached resources. Visible instructions say Press space to start.

## State and persistence

Instance fields include `distanceRan`, `highestScore`, speed, running time, `started`, `activated`, `crashed`, `paused`, `raqId`, resize timer and play count. `stop()` cancels rAF; `restart()` guards against an existing rAF and resets horizon/Trex/distance while preserving session high score. `startGame()` binds visibility/blur/focus; `onVisibilityChange()` pauses/resumes. No browser-storage key was found in reviewed Runner logic; high score is memory-only in this path. Resize debounces with an interval cleared by `adjustDimensions()`.

## Dependencies and provenance

Native Canvas/WebAudio; local embedded sprites/audio. Header credits Chromium Authors and adaptation by Elizalde Alexios, stating BSD-style licensing. However tracked `LICENSE` starts GNU GPL Version 2, June 1991. That mismatch directly contradicts historical `batch_0.md` calling this simply BSD licensed. README documents adaptation/test environments, without a pinned upstream revision. Do not choose one license by familiarity; original Chromium component notice and adaptation scope need evidence. Existing external URLs are user-initiated links/metadata, not loaded scripts in the reviewed entry.

## Audit findings

- HIGH evidence hold, `dino.html` Chromium BSD header versus `LICENSE`: contradictory licensing evidence. Root action: obtain exact upstream/adaptation terms and required notices; no license edit authorized here.
- MEDIUM, final `navigator.userAgent...indexOf('chrome')` guard: compatible browsers are blocked by brand rather than capability. Recommended repro: Firefox opens only the unsupported message. Minimal approved fix would feature-test required APIs, preserving game behavior.
- LOW, `<title>Google Classroom</title>`: misleading title hinders tab/history identification. Patch title only if approved.
- MEDIUM, `startListening()` mobile detection: touch support is user-agent-driven despite `IS_TOUCH_ENABLED` existing. Test hybrid devices before binding pointer/touch via capability.

## Safe iteration

Preserve embedded resources and original notices. Wrapper title, browser gate and concise controls are bounded patch points; do not rewrite Trex physics or blanket recolor art. Keep restart/rAF guard. License reconciliation is an owner decision, not a code cleanup.

## Verification

Actually performed source/notice review, no native browser/screenshots and no claimed inline-script syntax pass. Historical `playtest_0.md` recorded Space start/crash/restart in Chromium only. Inspect using `git show HEAD:Games/ChromeDino/dino.html` into bounded temporary text. Recommended Main native tests: keyboard jump/release, crash Enter/restart, mobile tap, denied audio, resize, tab pause and non-Chromium browser. Full catalog gate remains independent.

## Future outlook

First reconcile licensing and honest browser/title labeling. Next prove touch/audio/visibility lifecycle and accessible instructions. Later profile DPR rendering. Defer permanent save tracking unless requested; the current session-only score is sufficient once documented.
