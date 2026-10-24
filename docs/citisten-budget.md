# CITISTEN: memory, HUD stacking and render sleep

2026-10-24. Builds on `a019e752` and the landed events, persistence/terrain and
Skylines work. No registration, assets, dependencies or push added.

## Scope and measured memory

Commands (system Chromium, exclusive sequential browser slots):

```sh
TMPDIR=/dev/shm timeout 180s python3 -B Games/Citisten3D/memory-qa.py before
TMPDIR=/dev/shm timeout 180s python3 -B Games/Citisten3D/memory-qa.py after
TMPDIR=/dev/shm timeout 90s python3 -B Games/Citisten3D/stacking-qa.py
```

The memory fixture imports the real world, simulation and native model-sync code.
It loads all 17 model types, adds 128 repeated residential render instances, and
places nine simulated homes with utilities/services. It advances the actual
fixed-step simulation through day start, 120s, nightfall at 240s and every 10s
through the next day at 520s. The rendered cycle uses 32 frames; it is accelerated
instrumentation, **not 520 wall-clock seconds of native gameplay**. Viewport is
960x600 at pixel ratio 1.5 (1440x900 drawing buffer), LOD0, original textures and
2048px shadows. SwiftShader on this host is not a supported-device GPU test.

CDP `Performance.getMetrics` measures JS heap. `/proc/*/smaps_rollup` measures the
owned Chromium tree every 250ms and at checkpoints: PSS apportions shared pages;
summed RSS intentionally double-counts shared mappings and is a conservative
resident bound. Neither is a standalone hardware-GPU VRAM measurement. Heap does
not include all ArrayBuffer, native, decoded-image or GPU allocations.

All values below are **measured bytes**, not asset-size extrapolations:

| Checkpoint | Before heap used | After heap used | Before browser PSS | After browser PSS |
| --- | ---: | ---: | ---: | ---: |
| Day start, t=0 | 11,871,740 | 15,827,456 | 970,720,256 | 953,742,336 |
| Mid-day, t=120 | 13,990,408 | 11,522,584 | 974,164,992 | 949,826,560 |
| Night start, t=240 | 15,280,304 | 14,258,168 | 998,663,168 | 973,251,584 |
| Highest sampled night PSS, t=510 | 15,687,568 | 15,459,824 | 1,132,754,944 | 1,109,110,784 |
| Whole run peak (polls + checkpoints) | 27,618,692 | 26,757,056 | 1,132,929,024 | 1,111,052,288 |

Whole-run conservative summed RSS: **1,556,541,440 before -> 1,533,505,536 after**.
PSS fell 21,876,736 bytes; summed RSS fell 23,035,904 bytes. These are two runs,
not statistical estimates or individually attributed savings. Heap GC timing
varies; day-start heap did not improve. Both original and fixed workloads were
already below 2,000,000,000 bytes. The after run has about 466 MB RSS headroom to
that target; the runnable fixture now rejects RSS >=1.8 GB. The added budget
assertions were also replayed against both recorded runs without another launch.

Before/after renderer observations:

- Geometries: **247 throughout both cycles**, 17,509,990 scene geometry/instance
  array bytes. The array count is instrumentation, not total GPU allocation.
- Texture allocations: **68 day / 70 night before; 68 day / 68 night after**.
- Programs: **13**, with 487 reported draw calls; no FPS claim.
- Walk actions: peak **20**, including two extra fixture walkers. The native
  simulation already bounds defenders to 24 and zombies to the size-200
  perimeter (796): target <=820 native walk actions, <=822 in this fixture.
  That worst-case population was **not** exercised or memory-certified here.
- Shot geometry is already a **64-slot ring**, not per-shot allocations;
  `world-check.mjs` verifies overflow, expiry and disposal. Geometry counts did
  not grow during this cycle. Checkpoint FX were already expired, so these are
  not a measured sustained-64-shot peak.

Raw JSON, measured process maxima, source identity and four JPEGs are retained in
[`maintenance/audits/citisten-QA/budget/`](maintenance/audits/citisten-QA/budget/).
The before JSON retains its original polling maximum separately from the larger
checkpoint-inclusive maximum. Source hashes identify the actual renderer bytes;
CSS was irrelevant to the memory-only canvas fixture.

## Surgical changes

- `69defe4e`: `native-loop.mjs` cancels queued callbacks while hidden; visibility
  wakes immediately with delta zero. Menu, pause and speed 0 sleep after two
  unchanged seconds, without a polling timer. Inputs, resize and programmatic
  camera poses wake it. Camera easing and pending shots settle before sleeping.
  Active simulation keeps its full elapsed delta; active pixel ratio/water/model
  appearance are unchanged. No active-night simulation is frozen to save power.
- `1706c5c8`: inactive sun/moon shadow targets are disposed and cleared at phase
  transitions. Active shadows remain 2048px, with both retained during mixed
  dawn/dusk. Completed GLTF parser references no longer retain loader caches.
  Equal poses skip buffer writes while preserving pending walk/wheel motion.
- `64c9f31e`, `ui.css`/`native.css`: explicit HUD layers: events 3, diagnosis 2, other
  HUD/native controls 1. Existing urgent-last append order and phone's one-notice
  limit are preserved. Native `showModal()` top-layer dialogs remain above all
  HUD layers, without extreme z-index values or a new positioning system.

Building instances already share geometry/materials and immutable image sources;
terrain was already batched and FX already pooled. No duplicate system, texture
quality reduction, model compression, shadow-resolution reduction or extra
animation cap was added without evidence of need. The 2 GB goal is demonstrated
for this workload, not promised for every town size, later wave, viewport,
browser or 4 GB device. Native gameplay, hardware and 40 FPS gates remain held.

## Stacking and screenshots

Actual `index.html`, `ui.css`, `native.css` and `createUI` are exercised with a
labelled state fixture replacing only `native.mjs`. This is shell/layout proof,
not native-world gameplay. Four reviewed JPEGs cover 1440x900 and 390x844 in both
themes. Phone Events ends at y=503.14, before controls at y=730; urgent Blackout
is last (the sole phone notice). Desktop retains Placed, Nightfall, Blackout in
that order. Hit-testing also deliberately overlaps events with the top HUD;
menu hit-testing and tutorial modal state pass. No dialog was obscured.

The first fixture attempt failed `Top HUD occludes events`: its probe hit the
pointer-transparent Events heading, not a notice. The probe was corrected to
hit the actual interactive notice; no production CSS was changed to disguise
the test error. The accepted rerun output was:

```text
STACKING PASS: 4/4 theme/viewport cases; board > diagnosis > controls; urgent last; modal top layer; released
```

All four images were visually reviewed: readable diagnosis/events/controls,
no horizontal clipping, and separate tool controls. Images deliberately show no
3D world, because this is the UI fixture. Long civic notices, short-height and
expanded-controls combinations are not exhaustively accepted by these four shots.

## Verification and storage

Eight touched-module `node --check` invocations and Python source compilation
passed. Seven Node suites passed: sim, native, world, terrain, save, external
model (LOD0/1/2) and external materials. Actual selected output:

```text
NATIVE LOOP PASS: static skip, speed 0, input wake, active delta, hidden/resume, pending shots and cleanup
WORLD CHECK PASS: roads/lanes, static/mobile block AO invalidation, water height, sky probe/shadows, day/night, bounded FX; GLB/animation/material tests run separately
PASS: 17 real LOD0 GLBs, 240 instanced batches; stable handles, UV/PBR, rig/walk/wheels, night baseline, cleanup
CATALOG PASS: 128 unique IDs; schema and tracked URLs OK; no additions
```

Memory browser runs returned exit 0 in **85.945s before / 85.335s after**. All
servers, browsers and owned temporary profiles were released. Their measured
profile peaks were **827,962 / 2,891,493 bytes**; stacking's peak was **818,824**.
Each run monitors its entire owned `/dev/shm` profile/artifact tree, terminates
its own Chromium if it exceeds 12 MB, disables disk/shader caches and pins
`/usr/bin/chromium`. No persistent-profile size assumption, downloads, huge
traces or installs. Four JPEGs are each below 500,000 bytes. The initial authorized
preflight was **2,802,737,152 free bytes**; final exact free bytes/storage delta are
reported in the handover after commits. The operator's total-growth cap is
20,000,000 bytes, hard halt below 1,500,000,000 free bytes; temporary profile usage
is included, not silently excluded because it is in RAM-backed storage.

After source commit `64c9f31e`, inventory refresh and the final checker passed:

```text
Inventory: 134 games, 128 registered; shared runtime separate.
PASS: 134 game documents cover 128 registered + 6 unregistered games; Git inventory current.
Coverage only: section presence does not certify documentation accuracy or gameplay.
```

Only Citisten's inventory tree/count/byte fields changed. Earlier stale/dirty-source
checker output is not a passing gate. Full registered-catalog smoke was not run;
no release/native-input acceptance or push is authorized by these targeted checks.
