# Foldwild world/save contract (delegation 31)

Owner scope: `Games/Foldwild/world.js`, `scripts/test_foldwild_world.mjs`, this document only. Actual runtime: `openai-codex/gpt-6.1-sol`. Operator-authorized original mechanics, not upstream ingestion. Foldwild remains unregistered; future catalog ID unresolved. No UI, entry module, assets, battle/data/view edits, portal, catalog, services or push.

## Frozen integration API

Named ES-module exports:

```js
import {
  SAVE_KEY, REGIONS, RIVALS, PLAYER_BOUNDS, MAX_ROSTER,
  freshGame, validateSave, readSave, writeSave, worldPoints, nearbyPoint
} from './world.js';
```

- `SAVE_KEY = 'foldwild-save-v1'`; `MAX_ROSTER = 160`.
- `PLAYER_BOUNDS = {minX:-10,maxX:10,minZ:-7,maxZ:7}`.
- `REGIONS` has three frozen `{id,name,description}` objects, IDs 0..2: Rootfold Meadow, Stillwater Reach, Stonefold Ridge. View palette indices remain unchanged.
- `RIVALS` has frozen `{id,name,dialogue,winDialogue,team}` objects: Maren, Sola, Iven. Each team entry is `{speciesId,level}`. Teams contain respectively one level-5, two level-9, three level-14 canonical creatures with element variety.
- `freshGame(starterId='cindupp',seed=1)` only accepts Cindupp, Dewgob, Pithnip; seed must be uint32. Returns a mutable plain validated state:

```js
{
  version:1, seed:1, starterId:'cindupp', position:{x:0,z:4,yaw:0},
  region:0, roster:[/* canonical level-3 creature uid owned-1 */],
  team:['owned-1'], seen:['cindupp'], caught:['cindupp'],
  defeatedRivals:[], score:0, kites:18, encounterIndex:0, nextUid:2,
  reducedMotion:false
}
```

- `validateSave(value)` returns a new deep mutable projected snapshot or throws a descriptive error. Plain objects only; version exactly 1; seed uint32; all species must be own keys of canonical `BY_ID`. Unknown extra fields are dropped. Roster has 1..160 distinct ASCII UIDs matching `/^[a-z0-9-]{1,48}$/`, levels 1..40, XP safe integer 0..1,000,000. Battle `normalizeCreature` validates effects before `clearEffects` removes them. Resources clamp to canonical maxima without healing; injected derived stats are discarded. Team has 1..3 distinct existing roster UIDs, including KO creatures if selected. Seen/caught are unique canonical arrays of at most 80; owned species are included in both, and caught species in seen. Defeated rivals must be the sequential prefix `[0,1,2]`; region cannot exceed `min(2,defeatedRivals.length)`. Finite position coordinates clamp to bounds; finite yaw normalizes to [-pi,pi). Score/encounterIndex are integers 0..1e9, kites 0..999, nextUid 2..1e9 and corrected upward beyond existing `owned-n` numbers (unrepresentable successors reject). Reduced motion is boolean. Inputs, including frozen inputs, are not mutated.
- `readSave(storage=globalThis.localStorage)` returns `{state:null|snapshot,error:null|string}`. Default storage access is guarded inside the function, including a throwing native property getter. Missing slot returns null/null. Invalid JSON, schema, access or strings exceeding 256 KiB return an error without any writes/removal, preserving original bytes.
- `writeSave(state,storage=globalThis.localStorage)` returns null on success, diagnostic string on failure. Validates/projects and bounds JSON before writing only `SAVE_KEY`; exceptions including native security/quota failures are caught. A valid intentional write can replace the slot. Core must disable autosaves after a read error until an explicit confirmed new run. No automatic corruption repair or slot deletion.
- `worldPoints(state)` returns fresh point objects `{id,x,z,type,speciesId?,label,level?}`. Three unique wild species always occupy `wild-0` (-5,-1), `wild-1` (0,-4), `wild-2` (5,-1). Camp is `camp` (-6,4), current undefeated rival is `rival` (6,-3), exit is `exit` (0,-7). Camp/exit always exist. Final region exit is Ridge Overlook; no fourth region. Labels use canonical names.
- World LCG is private, reproducing battle's formula but not consuming battle state. Choices depend only on seed, region and encounterIndex. Region 0 uses all 35 basics at levels 2..4; region 1 uses all non-boss species at levels 6..10; region 2 uses all 80 with basic/evolved/boss weights 4/2/1, levels 12..18 except bosses at 26. Selection is weighted without replacement. Core increments encounterIndex after battle. Hidden null metadata is ignored.
- `nearbyPoint(state,distance=1.8)` returns the nearest point within the finite nonnegative distance, or null. Flat ground, no collision/physics/pathfinding; movement clamps to `PLAYER_BOUNDS`. World functions expect validated live state.

## Scope and verification

Data/source contract: [foldwild-sources.md](foldwild-sources.md). Battle helper contract: [foldwild-combat.md](foldwild-combat.md). Renderer integration: [foldwild-view.md](foldwild-view.md). No runtime external loads, dependencies, DOM, `Math.random`, timers or services. Native storage is the sole persistence boundary.

Runnable framework-free verification:

```sh
node --experimental-default-type=module scripts/test_foldwild_world.mjs
node --experimental-default-type=module --check Games/Foldwild/world.js
node --check scripts/test_foldwild_world.mjs
node --experimental-default-type=module scripts/test_foldwild_data.mjs
node --experimental-default-type=module scripts/test_foldwild_battle.mjs
git diff --check -- Games/Foldwild/world.js scripts/test_foldwild_world.mjs docs/foldwild-world.md
```

The API handoff was written before implementation for concurrent Core integration. Actual Node v22.23.1 results:

```text
PASS: world/save exact API; 3 regions/rivals; pools 35/75/80 and 4:2:1 weighting; deterministic unique points/proximity; immutable inputs; strict schema/UID/effects/prototype/unknown ids; canonical resources/progress; storage namespace/quota/security/invalid JSON byte preservation
PASS: 80 exact roster species; 16/element; 10 families x8; 50 exact normative actions; evolution 12/26 acyclic; hidden null; wheel/schema; 80 tracked/local SHA matches; models=7300844 bytes
PASS: 80 species; all 50 abilities executed; 25 wheel pairs (5 strong/5 reverse); bounds/effects/Wait/switch/KO/teams/capture/replay/immutability/XP/invalid inputs/local-only
Capture reproducibility: hit seed=670, miss seed=671
PASS: catalog 113 entries; schema/unique IDs/tracked URLs; Foldwild unregistered
```

Both new script syntax checks and scoped whitespace check exited 0. Regression scans authored module source for external loads, DOM, timers and random globals. A preliminary prototype fixture used `Object.assign` and therefore actually changed its own prototype; the validator correctly rejected it. The fixture now uses a native JSON own `__proto__` property through spread to assert safe projection. No validator rule was weakened.

Disk remained 2.3G free before/after (above 2 GB guard); module and regression payload is 27,047 bytes plus this document. Concurrent workspace writes make an isolated disk-use delta unavailable. Existing unrelated portal changes, Circuit Ward models, Tag Relay work/tests and scratch files were left untouched. Sparse selection was not changed. No dependencies installed, games added or registered, assets ingested, screenshots or browser tests. **Zero full-game gate passes** in this logic-only milestone. Full registered-game smoke and release review remain the orchestrator's gates; no push.
