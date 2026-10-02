# Bowling: maintenance manual

<!-- maintenance-game: Games/Bowling -->

## Identity and status

Registered ID 203, category `sports`, featured `false`. Entry: `Games/Bowling/index.html` ([open source](../../../Games/Bowling/index.html)). Source baseline `8c8a055`; 15 tracked files, 3,139,997 logical bytes. This is an existing game, not a new addition. Runtime is read-only in delegation 67. Local source/dependency evidence is not an offline browser pass. No native gameplay, screenshot or hardware measurement was performed here.

## Implementation map

SourceReview coverage: inspected entry inline CSS and lifecycle/input/scoring sections of four game/glue scripts in bounded source views: `bowlchallenge.js`, `bowlphysics.js`, `scores.js`, `keyboard.js`. `GLTFLoader.js` is a vendored dependency whose boundary is the local loader call; its internals and the large Three.js/Ammo.js engines were not human-reviewed in entirety. GLTF/bin/textures were inventoried, not rendered.

Entry loads Ammo, Three, GLTFLoader, Scores, physics, challenge, keyboard in that order. `init` creates scene/camera/renderer and generated `scoresDiv`, then loads `res/scene.gltf`, requiring named Track/Ball/Pin objects. `Ammo().then` gates `initScene`. `BowlPhysics` owns Bullet bodies; `updateGame` evaluates standing pins after three simulated seconds and submits pinfall to `Scores.addThrowResult`. `animate` continuously renders. `#restartBtn` is the authored shell patch point.

## Gameplay and controls

Drag sideways to position and flick forward to bowl. `onActionDown/Move/Up` distinguishes positioning from rolling using ray/plane intersection. Touch routes changed-touch coordinates into the same functions. Keyboard Left/Right positions in 0.07 units; Space, Enter or Up releases at maximum speed and zero angle, unless a button/link has focus. R and Restart reset the local game. Ten frames and strike/spare bonuses are implemented in `scores.js`; game completion alerts and immediately resets scores/physics.

## State and persistence

`Player` pairs physics, scores and meshes; globals track grab state. No save/storage exists. `Scores` tracks frame states, throw results, accumulated score and gameOver. Physics masks preserve standing pins for the second throw and reset them on new frames. Restart uses existing player/renderer, not a second loop. Ammo resources are allocated repeatedly during body resets; frame clocks and simulation duration are memory-only.

## Dependencies and provenance

Local `CREDITS.md` records upstream https://github.com/iliagrigorevdev/bowling, revision `60fa6fe5283869c45515f614f6a99b181c63d499`. Shipped `LICENSE` inspected: GPL-3.0. These are repository evidence, not a fresh network/source-pin verification. Preserve notices and inspect code, asset and component terms separately; a game license does not automatically clear every bundled recording/font/image. Dependencies and asset consumers are identified above; no newly added remote loads or dependency installs in this audit. Historical catalog-parts reports describe an earlier self-made implementation under this title and must not override the current local credits/source.

## Audit findings

- MEDIUM, `js/bowlphysics.js::resetPhysics/createBody`: old bodies are removed from the world but allocated Ammo objects are not destroyed. Repeated rolls/restarts may grow the native heap. Recommended repro: profile many resets with stable renderer count. Minimal fix: explicitly own and dispose each body/motion state/construction temporary according to the bundled Ammo API; preserve shared shapes.
- MEDIUM, `js/bowlchallenge.js::loader.load/Ammo().then`: no visible error callback or promise rejection recovery. Missing model/engine initialization can leave a blank lane. Add one loading/error surface at bootstrap.
- MEDIUM, `index.html` viewport forbids zoom; remove zoom limits and verify header/scorecard overlap in portrait.

## Safe iteration

Keep the upstream mesh names and physics constants synchronized. Adjust shell/header and keyboard in authored files; do not edit Three/Ammo bundles. Preserve GPL-3.0 game notice and MIT/zlib component evidence. Scoring changes need fixtures for all-zero, all-spare and perfect 300 games before browser integration.

## Verification

Recommended native sequence: await model/Ammo readiness, position and bowl with each input route, verify pinfall and second-throw mask, complete ten frames, then restart mid-roll. Record WebGL/context failure and denied loading separately. Historical `playtest_p2b.md` reports interaction success, but it is not this worker's native evidence or a current memory profile.

Actually run: Git blob inventory and `node --check` via standard input for 7 external/inline script units, 7/7 PASS. No execution implied. Reproduce parsing without checkout; focused extraction commands are in [batch verification](../audits/games-67.md#verification):

```sh
git show 8c8a055:"Games/Bowling/js/GLTFLoader.js" | node --check
```

A future authorized focused browser run may extract only this directory with `git archive` into a disposable directory, serve that root over HTTP, block third-party requests and terminate the server. Check disk first; do not alter sparse selection or leave dependencies. Main owns the unchanged serial full-catalog smoke gate, separately from these recommended interactions.

## Future outlook

Week 1: bootstrap error visibility and resource ownership review. Week 2: accessible zoom/header layout and non-blocking final score summary. Later: N100 WebGL/heap measurements, then optional pixel-ratio cap if measured. Do not substitute a camera demo or new bowling engine.
