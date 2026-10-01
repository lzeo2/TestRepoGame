# Foldwild solo integration (delegation 35)

Scope: `Games/Foldwild/script.js`, `scripts/test_foldwild.py`, this document.
Actual runtime: `openai-codex/gpt-6.1-sol`, Node v22.23.1, native Python
Playwright with system Chromium and software WebGL. No CSS fix was necessary.
The controller finishes delegation 32's existing implementation; no frozen
world, battle, view, data, asset, catalog or portal files were changed.

This is operator-authorized original self-made gameplay, not an ingested game.
[Source evidence](foldwild-sources.md) records the delivered 80 models and scoped
use permission. Supplied CC0/creator assertions are not independently verified
redistribution clearance. Source geometry, materials and colors are unchanged.
The existing local Three.js r160 dependency retains its MIT notice in
`Games/Foldwild/vendor/LICENSE`. No new dependency or external runtime load.
Foldwild remains **unregistered**, future catalog ID **unresolved**; 224 belongs
to Spline Ride. No game was added to the catalog by this milestone.

## Controller and controls

The entry module imports the existing [world/save](foldwild-world.md),
[combat](foldwild-combat.md), [view](foldwild-view.md) and roster APIs.
It owns one RAF and phases `menu`, `world`, `dialogue`, `battle`, `result`.
Frame movement is capped at 0.05 seconds, speed 3, diagonals normalized, and
position bounded to x ±10/z ±7. Marker buttons or canvas taps select walking
waypoints, not teleports. Interaction requires normal world proximity.

- Three level-3 starters; each new expedition uses seed 1, without URL overrides.
- Focus the canvas for WASD/arrows. Held touch buttons support multiple pointers
  and release/cancel capture. E interacts; 1–4 selects the four species actions;
  C attempts a kite; Space waits; P/Escape pauses. Native dialogs retain Escape.
- Pause, modal dialogs, hidden documents and focus loss stop movement inputs.
  The 0.45-second action lock prevents duplicate commands/rewards. Reduced motion
  is persisted and passed to the view. No FPS measurement or hardware claim.
- Native ability controls display canonical costs/effects, HP/energy maxima,
  statuses, Wait, live team switching, and the capture eligibility explanation.
  Kites spend exactly one per eligible wild attempt; rivals cannot be captured
  or fled. Collection edits a unique UID-keyed team of 1–3 from up to 160 allies
  and displays all 80 species with four source abilities each.
- Ended encounters clear effects, apply the combat XP/evolution helper, update
  seen/caught, score, owned UIDs and encounterIndex. Defeat fully rests the roster
  at camp without deleting progress. Camp heals and replenishes to at least
  18 kites. Three sequential rival wins unlock the next region and then the
  completion result; free play remains available after completion.

`window.foldwildSnapshot` is a getter-only, non-configurable property returning
an independently cloned, recursively frozen `{phase,paused,busy,state,battle,view}`.
It is inspection only: no setters, teleport, progression, RNG or renderer bypass.
The existing view lazily loads visible models; no menu/collection roster preload.
Model-failure and WebGL-unavailable diagnostics remain honest; usable native
walking and battle controls are not presented as evidence of successful 3D.

## Persistence and restart

Autosave uses only `foldwild-save-v1`, through the strict projected world API.
Meaningful changes save immediately; movement saves at most once per second,
with a guarded unload write. Save failures keep the expedition in memory and
show `Save unavailable; expedition stays in memory.` rather than `Autosaved`.
Continue restores a validated expedition, not an in-progress battle snapshot.
Reloading during battle retains current roster resources but restarts the world
encounter; active battle effects/round state are not persisted.

Invalid/unreadable saved data disables autosave and Continue and preserves the
old bytes until native replacement confirmation. New run cancellation preserves
old bytes; confirmation returns to the starter menu, and Start writes the fresh
run. Existing valid-slot Start also requires replacement confirmation. No storage
clear, automatic corrupt repair or other game's namespace access.

## Actual verification

```sh
node --experimental-default-type=module --check Games/Foldwild/script.js
python3 -c "from pathlib import Path; compile(Path('scripts/test_foldwild.py').read_text(), 'scripts/test_foldwild.py', 'exec')"
python3 scripts/test_foldwild.py
git diff --check
```

The first native run failed a test's fixed 500ms touch-distance assumption after
reaching mobile input. Native CDP delivery adds latency under software rendering.
The second/last run measures actual monotonic elapsed time, still enforces speed
3, balanced diagonal displacement and stopped movement after release. No gameplay
or failure filtering was changed to obtain a pass.

Actual second-run output digest, exit **0**:

```text
held_WASD_seconds: 12
world_models: poolbit.glb, sootnub.glb, hushpip.glb (3 loaded, no fallback)
paper_kite_draw_calls: 1
capture_outcome: captured (roster 2, team 2, owned-2, encounterIndex 1)
persistence: Continue restored position, two uid-keyed allies, team membership, kites and encounterIndex
new_run: cancel preserved old bytes; confirmed reset returned starter menu; Start replaced with seeded level-3 run
touch_movement: dx=-1.1667261889577993, dz=-1.1667261889578038, observed_seconds=0.6165011990233324
console_errors: []
page_errors: []
request_failures: []
http_errors: []
external_requests: []
screenshot_bytes: 197716
storage_delta: 49152 bytes during regression
PASS: standalone entry desktop/mobile, real movement/combat/capture/team/Wait/switch/save/reset; isolated corrupt-save guard
Native regression exit: 0
```

Desktop was 1100×720, mobile 390×700, serial contexts. Actual checks include
shield cost, damage/round changes, eligible capture and visible kite draw,
collection removal/re-addition, Wait +3, switching, flee, camp, persistence,
reset and nested snapshot immutability. Corrupt JSON and denied WebGL/storage
are separate deliberate fixtures, not normal asset passes. Servers and browser
close in `finally`; no persistent dev server or installed tooling.

Execution artifacts `foldwild-core-qa`: `regression.log` and six viewport JPEGs,
`menu-desktop`, `world-desktop`, `battle-desktop`, `menu-mobile`, `world-mobile`,
`battle-mobile`. Images were inspected: menu/world preserve cream, blue and
source creature colors. Battle images primarily show controls, not full 3D
battle composition; loaded-model assertions establish import success, not
visual polish approval. Main retains subjective review. No dark-theme claim.

Existing pure data/combat/world passes are documented in their prior milestones;
they were not rerun or counted as new native tests here. No full three-rival
campaign, level-12/26 evolution, roster-full/zero-kite playthrough or all-80
collection was exercised in this browser run. Those mechanics are implemented,
but this is a bounded vertical-slice regression, not full-story completion proof.

Disk remained 2.2G free, above the 2 GB guard. Concurrent workspace writes prevent
an isolated whole-task storage delta; the regression's measured delta is above.
Sparse selection and pending identity/history decisions were not changed.
**One standalone native regression pass; zero full-catalog smoke-gate passes**
for this milestone. Registration, full mandatory registered-game smoke and
release approval remain orchestrator gates. No push.
