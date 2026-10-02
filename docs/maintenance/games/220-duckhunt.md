<!-- maintenance-game: Games/DuckHunt -->
# Duck Hunt maintenance

## Identity and status

Registered id **220**, category `classic`, not featured; entry `Games/DuckHunt/index.html`. Baseline `8c8a055` has 11 files and 2,023,491 bytes. The local page loads a prebuilt webpack bundle. Registration is not evidence that its asynchronous dependency closure works: static inspection found missing chunks and empty stubs on renderer paths.

## Implementation map

Source review coverage: full HTML, CREDITS, MIT LICENSE, `132.js`, `369.js`, `audio.json`, `sprites.json`; bounded bundle extracts covering webpack public path/chunk loading, browser environment initialization, renderer selection, query parser, audio setup and the complete final game-controller class. The **599,042-byte** `duckhunt.js` bundle was syntax-checked but not human-reviewed in entirety. Its renderer/vendor modules and binary sprite/audio assets remain unreviewed; upstream editable `src/` is not shipped.

The head loads `duckhunt.js`; `DOMContentLoaded` creates `Aa` with `spritesheet:"sprites.json"` and calls `load()`. `load()` awaits renderer creation and sprite loading; `onLoad()` appends the renderer canvas, creates stage/HUD, binds events, starts levels and animation. Matching bundle anchors: `startLevel`, `startWave`, `endWave`, `goToNextWave`, `shouldWaveEnd`, `handleClick`, `updateScore`, `showReplay`, `animate`. Atlas frames include dog/duck/HUD/background textures. The embedded Howler audio config references local OGG/MP3; standalone `audio.json` is matching data, not a proven separate fetch.

## Gameplay and controls

Controller source shows mouse-down/touch-start shooting. P toggles pause, M mute, F fullscreen, C level creator. These keys are lowercase keypress checks. Shots decrement bullets and use `stage.shotsFired()` to increment score/hits. Waves finish after time, ammunition or duck activity conditions; more than 60 percent of the level's ducks must be shot to advance. Final outcomes create a canvas replay text box; clicking it reloads `window.location.pathname`. Exact level count/difficulty values were not reviewed, and no controls are inferred from the franchise name.

## State and persistence

Controller fields hold `levelIndex`, wave, bullets, score, maxScore, hit/miss counts, pause time and active sound IDs. Replay is a full page reload. `animate()` schedules RAF even when paused; it skips render/end checks while paused. No localStorage occurrence was found in the bundle, but this is a scan, not full persistence certification. `timePaused` accumulates globally while wave timing subtracts it from a new wave's elapsed time, a cross-wave timing risk. Query parameters select a custom level through `parseLevelQueryString()`.

## Dependencies and provenance

[CREDITS](../../../Games/DuckHunt/CREDITS.md) records `https://github.com/MattSurabian/DuckHunt-JS`, revision `5a28db7442ebc7dc8060342413df24c0319f4190`. Local [LICENSE](../../../Games/DuckHunt/LICENSE) names Matt Surabian and MIT terms. Upstream build byte comparisons were not rerun. This software notice does not independently prove rights to recognizable sprite/audio content. The bundle header references `duckhunt.js.LICENSE.txt`, absent from Git; bundled dependency notices need reconciliation rather than a blanket MIT claim.

## Audit findings

- **HIGH**, `duckhunt.js`, `i.u=t=>t+".js"`, browser environment `i.e(859)/i.e(384)` and renderer `i.e(369)/i.e(132)`: `859.js`/`384.js` are absent; `132.js`/`369.js` are comment-only and do not register webpack modules. Normal initialization can fail with ChunkLoadError. Recommended repro: load with request/pageerror capture. Root fix: obtain the legitimate matching pinned build's complete chunk closure, not success-shaped stubs or remote fallbacks. No ingestion authorized here.
- **MEDIUM**, `openLevelCreator`, `window.open("/creator.html", "_blank")`: root `creator.html` is untracked. C or creator-link navigation opens an unavailable feature. Disable the affordance or vendor a legitimately sourced editor only under separate approval; do not invent one.
- **MEDIUM**, `waveElapsedTime`/`startWave`: accumulated paused seconds carry into later waves. Repro recommendation: pause wave one, resume, advance and measure wave two duration. Reset/account pause time per wave.
- **MEDIUM**, `parseLevelQueryString`: parsed counts/speed/time accept negative and unbounded integers. Shared parser should enforce finite bounded values before allocation/game setup. This is resource/state validation, not an established XSS finding.

## Safe iteration

Do not hand-edit minified vendor modules. Reconcile chunk/license closure at the recorded source revision first; build reproducibility is a prerequisite to controller fixes. Preserve sprite/audio notices while rights remain held. Wrapper changes can add truthful loading/error feedback, but must not conceal failed renderer initialization.

## Verification

Actually run: bundle and both stubs passed Git-blob STDIN `node --check`; `git cat-file -e` confirmed missing chunks/creator page. Zero browser/native runs or screenshots. Repeat `git show HEAD:Games/DuckHunt/duckhunt.js | node --check`. Main owns any narrow asset lease. Recommended: fail-visible loading, renderer paths, shooting/hit/miss outcomes/replay, P/M/F, cross-wave pause timing, bounded query fixtures, local-only requests and audio unlock. Syntax passing does not resolve chunk failures.

## Future outlook

Week 1: source/asset/dependency-notice and missing-chunk triage before polish. Week 2 only after boot works: accessible instructions/loading/error and replay semantics. Later: rebuild controller timing/input fixes from verified editable source. Level creator, new art and performance certification are deferred until permission and native evidence exist.
