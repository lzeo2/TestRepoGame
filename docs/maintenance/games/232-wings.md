# Wings

<!-- maintenance-game: Games/Wings -->

## Identity and status

Registered catalog **232**, entry `Games/Wings/index.html`; 125 catalog entries
unchanged. Static offline adaptation of anomalyco/arcade Wings at source pin
`bf5f6277e38ee52e9bfa4ae4a01337b46175c181`, ingested by owner order despite
missing upstream LICENSE. Current F-15/F-35 closeout (2026-10-15) covers source
through `2d8ba30`, not a new game or registration. **Integrated, not released.**
Latest unchanged fleet gate: **124/125, exit 1, HOLD**; earlier 122/125 also failed
and is historical. No fleet rerun here, and no claim that a full gate is next.
See [latest fleet handover](../audits/fleet-followup-handover.md).

## Implementation map

`assets/` contains Vite output; `models/` local GLBs; `fonts/` local fonts/OFL.
`port.patch` records authored staging changes, offline adapter, renderer boundary,
menus, descriptors and verification sources. Apply to the pinned upstream root,
then rebuild `games/wings` using Bun and relative-base Vite. Never hand-edit bundles.

Inspected boundaries: entry/main, scene host/session lifecycle, lobby/spawn/pause,
HUD copy/layout, loopback regression, jet generator, serialized model validator,
aircraft loader/material conversion and relevant toon/scene/thumbnail mechanisms.
This is not an exhaustive engine/shader/rights audit. Before closeout, inventory
still recorded Wings tree `ea4951cb78308b668a3bc8050f936f54d1fbe5eb`, 43 files,
9,251,579 bytes; current pre-doc tree was
`35afcc2d0175f56430976e0a514b3076ebc14d4f`, also 43 files. Refresh follows the
committed model-document change, not an assumption that the old inventory is current.

## Gameplay and controls

Solo has zero AI aircraft but enemy fleet guns remain active; bots use two teams
and normal skill. Custom retains upstream bot/skill/team/pilot/score/time controls.
All starts request offline/unlisted mode with unchanged Fleet Strike rules.
Seven-aircraft hangar or keys 1-7; **6 F-15-style, 7 F-35-style**. Custom Aircraft
selects `StartRequest.aircraft` for the real spawn after the renderer gate.
Original five aircraft and bot weights remain unchanged; both new bot weights zero.

W/S throttle, arrows pitch/turn, A/D roll, Q/E full roll, Shift boost, mouse steering
and weapons; Controls shows the selected upstream scheme. Keyboard/mouse required:
narrow-screen menus are not touch-flight support. Back to menu uses session leave.
Native Escape/pointer-lock behavior remains unaccepted. Exact tuning/camera/anchor
table: [model contract](../../../Games/Wings/docs/models.md), mirrored in source
`port.patch`; no new weapons, gear toggle or bay-door animation.

## State and persistence

Room state is in memory. `wings.settings` and `wings.autoQuality` store preferences.
Retry with Low saves Low and reloads. Back disposes the session; restart creates a
new room. Spawn/pause listeners are disposed on exit. No account, remote transport,
fixed-seed override or online invites. Automatic quality benchmarking waits for
return from successful play; hardware behavior remains unverified.

## Dependencies and provenance

`Games/Wings/CREDITS.md` records upstream URL/pin, owner order and missing-license
qualification. Three 0.186.0 MIT and font OFL notices are retained; they do not
license the entire game or upstream models. No new runtime dependency/remote load.

Current `f15.glb` and `f35.glb` are two original from-scratch
**openai-codex/gpt-6-astra** procedural models using Python stdlib. Upstream GLBs
were inspected for materials/conventions, not copied meshes. Approximate -style
silhouettes carry no engineering, copyright or unrestricted-rights guarantee.
Both gear-up, transparent framed canopy/tub, layered gray opaque panels, gaps,
petal exhausts and generic `livery_` marks; no real insignia or textures/images/
skins/clips/external resources. Current measured counts/hashes and exact tuning
are in the model contract. Legacy GLBs/functions were removed after tracked and
constructed-path consumer tracing, not merely because documentation called them
old. [Archived dated receipts](../audits/wings-real-jets.md) preserve all legacy
hashes, intermediate geometry, failures and follow-up evidence.

## Audit findings

Native WebGL2 shader/driver failure remains unresolved: historical HUD-only flight
had zero draws; later Low/Balanced probes warned about UVs and stalled. The current
boundary requires a real first scene draw, records compiler/linker logs and fails
closed on scene/device/shader/zero-draw/timeout errors. Low retry retains upstream
materials; no renderer substitution. A GPU-driver stall can delay JS timers.

The menu no longer unconditionally boots the world; explicit start owns scene
boot and first-draw gating. Same-browser menu context regression improved after
that lifecycle fix, not proof of flight. Mobile spawn scrolls; HUD fixture layout
was improved. Upstream dark shell is not recolored by theme preference. Existing
mobile diagnostic toast still crowds the footer and was not fixed in this run.

Material exploration measured F/A-18 151 assignments/10 unique values, YF-12
123/12, A-10 166/12. Inspected 55-degree creased normals, paint remap/vertex-color
merge, shared glass/team livery, toon weathering/environment/clearcoat and scene
ACES/quality shadows/bloom/thumbnail lights. Chosen: richer parts, apertures,
panels/exhausts, exposed formerly buried F-35 intake, retained seams. Not chosen:
shader/world/lighting rewrite (existing adequate mechanisms plus held GPU failure),
edge postprocess (existing creases), gear toggle/struts (gear-up and unverified
animation), paint picker (team livery), external missiles/animated bays/new weapons
(unchanged gameplay/static anchors), extra dependencies or textures.

Actual CPU conversion gives four paint/metal/livery/glass batches per jet, not
112/109 Wings draw calls. Raw standard-Three fixtures do use 112/109 draws.
Jets are about 2.4x the heaviest selectable triangle count; AC-130 scenery is not
precedent. Pair increase over retired models: 2,256,792 bytes. Reference byte
deltas and noisy worker/Main single ordered CPU samples are in the model contract;
they include I/O/parse/conversion/view and prove no performance win. Native
load-time delta remains unverified. No in-game visual parity or cockpit acceptance.

## Safe iteration

Source-only rebuild from pin `bf5f6277e38ee52e9bfa4ae4a01337b46175c181`:
use externally staged source, cached dependencies/public assets and Bun/Vite,
replace only rebuilt Wings output, regenerate `port.patch`, then check application
against the clean pin. Vite-only instruction remains; no typecheck PASS claimed.
Exact recovery/build recipe: [follow-up source receipt](../audits/fleet-followup-wings.md).
The compatibility-named `astra-check.ts` now tests f15/f35 and its bundled `.mjs`
is source-built with cached Bun `--target=node --minify`, not manually patched.
No refetch/install, minified edits or backend/network restoration. Trace cached
tracked consumers including sparse content and constructed paths before deletion.
Preserve notices/evidence and inspect changes before committed-source inventory refresh.

## Verification

Fresh source/model milestone receipts, reported by their owners and retained in
the archive (documentation closeout does not claim it reran their browser/build):

- Main independently ran `check-models.py`, `astra-check.mjs`, `solo-check.mjs`:
  all PASS, exit 0. Node syntax, `git apply --check` against pin and 125-entry
  schema/unique-ID/Git-URL validation exit 0. Documentation closeout separately
  reran `check-models.py`, exit 0, and remeasured generator/GLB SHA-256.
- Worker jet CPU regression and cached Bun/Vite builds exit 0. Original five
  cruise/boost pairs unchanged; current offline config/spawn/wire snapshots,
  ordinary-input takeoff/turn, descriptors/anchors and camera math pass.
- Worker current model browser: **six cases, exit 0**, no console/page errors or
  external loads; bounded standard-Three previews only, not Wings GPU flight.
- Fresh Main unavailable-GPU UI: **four cases, exit 0**, evidence
  `wings-orchestrator-final/ui.log` and `wings-orchestrator-final/ui/`.
  Actual menu requests/spawns, keys, listener disposal and fail-closed launch
  routes are fixture evidence, not rendered flight.
- Main reviewed desktop/mobile both preference screenshots and front/rear/
  underside comparisons: distinct silhouettes, intakes, cockpit, exhausts and bay
  panels visible; menu labels fit; crowded mobile error toast remains. These
  are **not Wings GPU flight screenshots**.
- Run-wide `git diff --check ad34ed5..HEAD`: **exit 2**, one inherited generated
  Three shader whitespace finding in `verification/astra-check.mjs:3848`.
  Worktree diff check exits 0; do not call the global range clean.

External relative evidence labels: `wings-jets-materials/` (upstream tables and
four F-15 standard-Three comparisons); `wings-f35-materials/` (six comparison
front/rear/underside views); `wings-jets-regression/` (CPU/bundle/build);
`wings-migration-cleanup/` (consumer traces and six current two-jet screenshots).
Earlier logs, failed probes and hashes remain in the dated archive and linked
fleet receipts; later focused passes do not retroactively change those failures.

## Standards

### PASS criteria

A bounded model/source PASS requires committed deterministic GLBs, indexed triangles,
finite UV0/positions/unit normals, winding and nondegenerate/unique faces, valid
indices/accessors/buffers/node tree and identity root with -Z forward/+Y up at
scale 1. Validate all material definitions are used, intentional glass and at
least 40 meaningful part assignments, not 40 unique colors. Gray opaque panels
and generic team-livery regions only, no insignia; gear-up, static anchors, no
new weapon or door animation. Structural PASS is not native renderer acceptance.
Source-only Bun/Vite rebuild must use the pinned revision above, preserve notices
and pass patch applicability; no hand-edited generated output.

### Verification scripts

From repository root, existing tools only:

```sh
python3 -B Games/Wings/verification/check-models.py
node Games/Wings/verification/astra-check.mjs
node Games/Wings/verification/solo-check.mjs
python3 -B Games/Wings/verification/check-models-browser.py --out "$EVIDENCE"
python3 -B scripts/check_maintenance_docs.py
```

`check-models.py` compares committed bytes with two fresh stdlib generations.
`astra-check` covers actual CPU GLTF loading/conversion/view plus spawn/simulation
and camera/anchor checks. `solo-check` covers ordinary-input takeoff, fresh room,
crash and respawn without state grants. Browser models use cached Three, a
115-second alarm and an owned server terminated in `finally`.
`check-browser.py --out "$EVIDENCE"` needs a bounded root HTTP server (port 8938)
and runs four unavailable-GPU UI cases. `check-context-sequence.py` bounds the
unchanged same-browser Wings/Server Survival/Astray menu sequence to 90 seconds
(port 8982); it is not flight. No persistent servers, installs or weakened filters.
Catalog schema/unique IDs/Git URLs, node syntax and scoped/global diff checks
remain separate. Maintenance coverage is not semantic/gameplay acceptance.

### Active holds

1. Supported-GPU first draw, shaders, flight/thumbnail/material/cockpit visibility,
   native input/combat/audio/crash-respawn/exit/restart and load-time delta remain
   unverified. UI/simulation/standard-Three/CPU fixtures cannot lift this hold.
2. Upstream game/model redistribution rights and missing LICENSE remain unresolved;
   original jet generation does not cure them.
3. Full-fleet release remains **124/125, exit 1, HOLD** (Ovo network failures);
   historical 122/125 also failed. No rerun in this task. Stable-host diagnosis
   and any later authorized release gate belong to the orchestrator/operator.
4. Inherited generated shader whitespace and historical artifact-path cleanup
   remain qualified findings; no global-clean claim or history surgery here.
   Crowded mobile error toast is also open, not polished-flight acceptance.

### Provenance

Only these two operator-authorized original stdlib procedural -style models;
record generator/GLB hashes and supplied brief unchanged. Inspecting upstream
materials/conventions is not copying meshes or establishing rights. No new
third-party runtime load, dependencies, textures/images, skins or animation clips.
Preserve dated legacy receipts and consumer traces after retirement.

### Budgets

| Current model | Hard triangle floor-ceiling | Strict file ceiling | Actual triangles / vertices / bytes | Assignments / unique definitions |
| --- | --- | --- | --- | --- |
| F-15 | 40,000-55,000 | <1,200,000 bytes | 43,392 / 25,483 / 1,185,940 | 112 / 10 |
| F-35 | 35,000-50,000 | <1,200,000 bytes | 42,760 / 25,285 / 1,173,404 | 109 / 10 |

Both require >=40 meaningful assignments. Budgets are hard per-model limits,
not a supported-device performance promise. Asset-only reference triangles are
F/A-18 16,896 and YF-12 18,028; CPU totals 17,288/18,420 add 392 flame triangles
each. Do not mix these counts or substitute scenery budgets for selectable jets.

## Future outlook

On supported hardware isolate the renderer/compiler failure, then verify first
scene, takeoff/turn/combat/crash-respawn, cockpit visibility, back and fresh session,
with measured native load-time delta. Retain fail-closed behavior. Resolve rights
and fleet/network hold through separate operator gates; no publication or push
permission follows from this documentation closeout.
