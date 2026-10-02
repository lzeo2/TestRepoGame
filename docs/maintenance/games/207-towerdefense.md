# Tower Defense: maintenance manual

<!-- maintenance-game: Games/TowerDefense -->

## Identity and status

Registered ID 207, category `strategy`, featured `false`. Entry: `Games/TowerDefense/index.html` ([open source](../../../Games/TowerDefense/index.html)). Source baseline `8c8a055`; 5 tracked files, 56,492 logical bytes. This is an existing game, not a new addition. Runtime is read-only in delegation 67. Local source/dependency evidence is not an offline browser pass. No native gameplay, screenshot or hardware measurement was performed here.

## Implementation map

SourceReview coverage: read entry/CSS/glue and compressed bundle bootstrap, event manager, Stage/Act/Scene, grid/building/monster, panel and endless-wave sections. Remaining rendering/pathfinding helpers were not fully reviewed algorithmically. `_TD.init('td-board', true)` assembles modules, starts its internal game, and deletes its own init method. The wrapper hides `#td-loading` and exposes `#td-board/#td-canvas` after initialization.

Bundle anchors `start/step/getEventXY`, `Grid.checkBlock/buyBuilding`, `Building.tryToUpgrade/tryToSell`, `Monster.checkFinish`, and `getDefaultStageData('scene_endless')` are useful review points, not a stable external API. Everything renders on canvas; there are no external assets besides the local favicon. Touch-end synthesizes a click using the changed touch coordinates.

## Gameplay and controls

Select a tower from the right panel, build on a valid grid cell, and select an existing tower to upgrade/sell. Path blocking is checked before building. Cannon, LMG, HMG, laser and wall types have separate prices. Actual source waves start automatically after a weapon is built and the wait expires; wrapper copy saying Press start is stale. Pause/Continue and Restart are canvas buttons; life reaching zero shows Game Over and Restart. There is no keyboard input adapter.

## State and persistence

The internal object holds money, life, score, difficulty, stage, frame counter and timeout `_st`. `start` clears the old timeout; `step` schedules one timeout and updates event registrations/entities. Scenes own waves and render/step lists. Endless config begins with life 100 and money 500, waits three expected seconds between waves, and caps generated wave size at 100 monsters. No local/session storage is used. `_TD.cheat` is a debug hook enabled by the wrapper's `true` argument, not evidence of a remote security exploit.

## Dependencies and provenance

Local `CREDITS.md` records upstream https://github.com/oldj/html5-tower-defense, revision `e3e009c7673121e98d6ff02c85fb442c774b6391`. Shipped `LICENSE` inspected: MIT. These are repository evidence, not a fresh network/source-pin verification. Preserve notices and inspect code, asset and component terms separately; a game license does not automatically clear every bundled recording/font/image. Dependencies and asset consumers are identified above; no newly added remote loads or dependency installs in this audit.

## Audit findings

- MEDIUM, `index.html::#howto` versus bundle `stage_main.step2`: instruction claims a Start control that is not the wave trigger. Repro: build a weapon and wait; wave advances without pressing Start. Minimal fix: describe automatic waves and actual Pause/Restart controls.
- MEDIUM, bundle `getEventXY`: client coordinates are reconstructed from wrapper/canvas offsets rather than `getBoundingClientRect`; responsive scaling/ancestor offsets may misalign hit testing. Recommended mobile/scrolled-container repro before changing; fix mapping at this shared coordinate boundary.
- MEDIUM, entry CSS and bundle `Button`: 640px logical board and 30px-high canvas buttons lack responsive/keyboard shell support. Native phone overflow and target-size test remains pending.

## Safe iteration

Keep path-blocking and tower rules intact. Prefer correcting copy in entry and adding bounded authored input/status glue. Engine changes need readable upstream source from the pinned revision, not manual alteration of the compressed build. Do not remove debug mechanics on the basis of the word cheat alone; decide production debug policy explicitly.

## Verification

Recommended native sequence: build LMG, reject blocked exit/path, let wave run, upgrade and sell, pause/resume, lose all life and restart. Test touch click exactly once, scrolling/retina hit coordinates and keyboard-only controls. Reinitializing `_TD.init` is not a supported restart test because the method self-deletes.

Actually run: Git blob inventory and `node --check` via standard input for 2 external/inline script units, 2/2 PASS. No execution implied. Reproduce parsing without checkout; focused extraction commands are in [batch verification](../audits/games-67.md#verification):

```sh
git show 8c8a055:"Games/TowerDefense/td-pkg-en-min.js" | node --check
```

A future authorized focused browser run may extract only this directory with `git archive` into a disposable directory, serve that root over HTTP, block third-party requests and terminate the server. Check disk first; do not alter sparse selection or leave dependencies. Main owns the unchanged serial full-catalog smoke gate, separately from these recommended interactions.

## Future outlook

Week 1: controls copy and correct shared coordinate mapping after reproduction. Week 2: accessible DOM affordances for pause/restart/tower selection and narrow layout. Later: verify pathfinding/large-wave performance on N100 and reduce debug exposure if approved. No new tower assets or backend needed.
