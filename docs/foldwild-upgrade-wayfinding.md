# Foldwild wayfinding implementation receipt

## Scope and traced source

Lane 1 owns only `Games/Foldwild/navigation.js`,
`scripts/test_foldwild_navigation.mjs` and this receipt. No controller, renderer,
UI, campaign, save, creature, asset, manual or inventory edits.

Read repository instructions, quality standards, maintenance README and full
Foldwild manual before implementation. The initial clean source checkpoint was
`737a559f`; Foldwild's committed tree was
`c7f1981da461dc6b9263a1feff9a9dc723e7e809`, already different from inventory's
`c935f92b7c41a90697fec764e084adf46f0e86ad`.

The original meadow description says “Maren waits in the northern clearing.”
The Woodland courier says “the clearing northeast of the village.” The actual
interaction is `REGION_LAYOUTS[0].points`'s `rival`, Maren at **(22, -26)**,
reached from spawn **(0, 16)**. The decorative stone at **(16, -40)** is not
Maren's clearing. Lane 2's current enriched world-point contract attaches
**Northern Clearing** to that existing rival. The helper reads that metadata,
not a second map or an invented objective coordinate.

Traced `objective`, `updateHUD`, `updateProximity`, `nearbyActions`, `approach`,
`travel`, `interact`, `previewChallenge`, `beginBattle`, movement and saved-battle
resume in `script.js`; inspected `campaign.js`, `world.js`, `region-data.js` and
existing regression patterns. `routeTo` remains the collision authority.

## Exact API

```js
import { navigationObjective } from './navigation.js';
const goal = navigationObjective(state);
```

Input is an already canonical in-memory state (`freshGame`/`validateSave`), not
untrusted imported JSON. Advice is synchronous and pure, including frozen input.
It does not validate saves again, execute actions, alter RNG, mark discoveries,
write storage or introduce save fields. No dependency other than existing local
modules. Lane 2's `worldPoints(state, { exploration: true })` enriches labels;
the older adapter can ignore that option and falls back to point labels.

Return shape:

- `kind`: `battle`, `recover`, `trial`, `travel`, `lesson` or `complete`.
- `text`: compact next actionable objective. Trial text includes the live named
  landmark when available.
- `action`: `{type: 'interact', label, pointId}`, `{type: 'travel', label, region}`
  or `{type: 'resume-battle'}`. This is advice, not authorization.
- `targetRegion`: destination region. For an exit this is the next adjacent
  region, while the target itself remains in the player's current region.
- `target`: `{id, type, label, locationName, x, z}` from current live points, or
  `null` for menu travel and battle resume. It intentionally omits species,
  encounter seeds, dialogue and optional-point data.
- `navigation`: `null` without a spatial target; otherwise:
  - `distance`: direct horizontal world units (authored meters), unrounded.
  - `routeDistance`: remaining collision-safe polyline length; zero on arrival,
    `null` if no route exists.
  - `bearing`: next useful route waypoint's world bearing in radians, north=0,
    east=PI/2, south=+/-PI, west=-PI/2; `null` on arrival/no route. This is NOT
    camera-relative and is NOT the controller's player-yaw convention.
  - `direction`: eight-way lowercase compass word, `here` on arrival or `null`
    if no route exists. It points along the route, not through obstacles at
    the final target. The initial route says north around the cottage before
    heading northeast to Maren.
  - `arrived`: Euclidean target distance <=1.8, matching existing interaction
    checks; `reachable`: arrival or a nonempty route.
  - `route`: existing `routeTo` waypoints; empty on arrival/no route. Direction
    skips points within the controller's 0.3-unit waypoint tolerance.
  - `arrivalText`: named destination plus contextual action when arrived,
    otherwise `null`.

Priority: pending battle, recovery if no conscious selected teammate, next
uncleared trial, the three return lessons in campaign order, then an optional
rematch in the current region. Trial advice never routes through a locked exit.
A previously cleared region uses its real exit toward the next region. Return
lessons use the existing unlocked Travel controls to reach their specified
regions (0, 1, 4), then target the real camp. Camp interaction opens services;
the player still chooses Rest or the return lesson. No training level threshold
is invented. Advice never targets wild/optional encounters or reveals their
names, coordinates or collection progress.

## Orchestrator integration instructions

1. Import the function in `script.js`; replace the old prose-only `objective`
   implementation with `navigationObjective(value).text` if desired, retaining
   its existing callers and save-preview behavior. Do not treat advice as a save
   migration. Compute one shared goal for the live world UI rather than repeating
   route searches for each DOM field.
2. Present `goal.text` plus `goal.target.locationName` and `goal.target.label`
   (deduplicate identical strings). For the first goal this is **Northern
   Clearing / Maren**, not the northern waystone. Show the world compass direction
   and rounded `routeDistance` as trail distance; distinguish `distance` if used.
   Recompute on region/progression/team changes and at a bounded cadence while
   moving, not every renderer frame. Do not map compass words to WASD because
   movement is camera-relative.
3. For an interact goal, the destination button calls existing
   `approach(goal.target.id)` until arrival. At arrival use existing `interact()`;
   preserve `nearbyPoint`, phase, pause, busy, save and challenge guards. The helper
   must not directly call `beginBattle` or bypass the explicit preview/Begin flow.
   Recovery opens camp services then Rest; finale opens camp services then the
   return lesson. No auto-rest or auto-battle.
4. For `{type: 'travel'}`, call existing `travel(goal.action.region)` through
   normal world/input guards. There is no spatial marker in the wrong region.
   For `resume-battle`, retain existing Continue/`resumeSaved` flow; do not run
   world movement advice over a live battle.
5. Announce `arrivalText` once on a false-to-true `arrived` transition, keyed by
   current region, goal kind and target ID. Reset that transient key on world/run
   changes. Do not announce every movement tick or persist arrival into saves.
   On `reachable === false`, report no open trail and do not fabricate an arrow.
6. If forwarding the route to a renderer, use the returned collision-safe
   polyline and world-bearing convention above. Existing `approach` can simply
   recompute it; no new route/controller state is required by this lane.

## Verification receipt

Commands run against the current sibling-enriched source:

- `node --check Games/Foldwild/navigation.js` and
  `node --check scripts/test_foldwild_navigation.mjs`: exit 0;
  `PASS: 2 navigation JavaScript syntax checks`.
- `node scripts/test_foldwild_navigation.mjs`: exit 0;
  `PASS: 54 navigation fixtures; live points, trial/lesson gates, routes, compass, arrival, recovery, secret exclusion and immutable state`.
- `node scripts/test_foldwild_data.mjs`: exit 0; exact canonical 80, original
  7,300,844 model bytes and separate optional 6,384,292-byte SHA check pass.
- `node scripts/test_foldwild_world.mjs`: exit 0; deterministic world/proximity,
  strict save boundary, resources/progress and storage guards pass.
- `node scripts/test_foldwild_regions.mjs`: exit 0; 5 regions, 73 POI plus 15 wild
  routes, 185 collision-safe segments, movement/bounds/immutability pass.
- `node scripts/test_foldwild_campaign.mjs`: exit 0; exact campaign tables,
  migrations, location/identity guards, settlement and pending continuation pass.
- `node scripts/test_foldwild_continuity.mjs`: exit 0; legacy save continuity,
  exact action/RNG replay and release/storage guards pass.
- `node scripts/test_foldwild_optional.mjs`: exit 0; default-off/gates, 500 exact
  base RNG snapshots, controller encounter/save replay and bonus separation pass.
- Sparse-aware catalog validation: exit 0;
  `PASS: 129 catalog entries; schema/unique IDs/Git-tracked URLs`. No catalog edit.
- `git diff --check -- Games/Foldwild/navigation.js scripts/test_foldwild_navigation.mjs docs/foldwild-upgrade-wayfinding.md`: exit 0.
- `python3 -B scripts/check_maintenance_docs.py`: exit 1;
  `AssertionError: Commit inspected source changes before validating its inventory.`
  Concurrent lane 2 runtime edits were dirty. Inventory was already stale at
  entry; orchestrator owns the manual/inventory refresh and final recheck.

The first navigation-test run failed because the fixture froze a state and then
tried to move it for a second arrival assertion. The check now freezes a clone,
retaining immutable-input assertions without preventing fixture setup. The next
run and subsequent rerun passed; no assertion was removed.

Seven targeted suites pass, not seven native-play gates. No browser, install,
asset copies, screenshot, full-fleet smoke, release or push. No games added.
Native first-play/UI/animation/save acceptance and inherited M2, campaign,
rights and device holds remain with the orchestrator. Other workers' runtime/UI
changes are outside this lane's commit.
