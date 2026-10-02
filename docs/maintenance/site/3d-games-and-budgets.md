# 3D runtime contracts and resource budgets

Source baseline: `8c8a055813b35bbd5d8b632423328333b4252d43`. This feature page covers Circuit Ward, unregistered Foldwild and Spline Ride only; it does not relabel other workers' games. It is a source-grounded resource/lifecycle guide, not a full-renderer certification or measured hardware benchmark.

## Runtime boundary map

| Experience | Authoritative owner | Renderer interface | Observation contract | Persistence/network |
| --- | --- | --- | --- | --- |
| Circuit Ward, id 222 | `script.js:createRun/stepRun` on solo/host | `boot/loadModels/draw`; mesh art does not change hitboxes | module `inspect()`/`stats()` frozen detached state/diagnostics | No save. `multiplayer.js:PeerRoom`, manual direct WebRTC, no backend/STUN/TURN |
| Foldwild, no id | `battle.js`, `world.js`, `region-data.js`, controller `state/battle` | `view.js:createView`, controller-owned clock/canvas | `window.foldwildSnapshot`, view `inspect()` | `foldwild-save-v1`, `foldwild-save-backup-v1`; canonical version 2, no networking |
| Spline Ride, id 224 | `script.js:params/elapsed/playing` | `addTube/render/animate`, procedural curve camera | `window.splineRideSnapshot` | No save/network; real 20-second lap parameter |

Detailed module/DOM/save contracts and severity findings are in [Circuit Ward](../games/222-circuit-ward.md), [Foldwild](../games/unregistered-foldwild.md) and [Spline Ride](../games/224-spline-ride.md). These diagnostics are read-only, not production state setters. Native test fixtures and natural user progression must be distinguished; do not mutate snapshots to manufacture native victory/evolution evidence.

All three vendor three.js r160 at `d04539a76736ff500cae883d6a38b3dd8643c548`, with local addons and MIT notices. Individual renderer copies are identical Git blobs where documented, but separate static browser URLs/cache entries. Consolidating them is not automatically worthwhile: preserve existing self-contained ports until an actual deployment/cache measurement justifies changing path closure. No compiled engine hand editing. GLTFLoader accepts generic caller/resource URLs; local caller paths and embedded GLB dependency inspection are required, not a claim that the loader itself enforces offline policy.

## Measured inventory versus runtime budget

These exact values come from tracked Git tree inventory, not workspace `du` under sparse checkout:

| Tree | Files | Logical bytes | Payload interpretation |
| --- | ---: | ---: | --- |
| Circuit Ward | 18 | 2,842,516 | 1,414,498 vendor bytes; six loaded art files 691,300 bytes; three unused vehicle files 660,120 bytes; shell/controller/credits remainder |
| Foldwild | 94 | 8,937,020 | 1,414,498 vendor bytes; eighty runtime model files 7,300,844 bytes; authored modules/shell remainder |
| Spline Ride | 8 | 1,330,245 | engine 1,272,972 bytes; procedural demo/helpers/shell/notice remainder; no model/audio/texture payload |

Circuit Ward six loaded source meshes total 5,692 triangles; that is **not frame triangle count**, because wall/cover/bot instances multiply draws/triangles. Three unused vehicles add 5,312 triangles but have no runtime consumer in `modelNames`. Foldwild source inventory is eighty models, while low world mode permits four nearby wild models, standard six; NPC caps are four/eight. Cache cap is twelve entries, not twelve guaranteed active GPU assets: retired entries with live references/pending completion may temporarily survive eviction. Reference counting/generation cancellation must remain intact.

Drawing-buffer constraints are implemented, not benchmarked:

- Circuit Ward: DPR 1, <=1280x720, no antialiasing, primitive/loaded instanced pools; max 24 bots/eight cells/four players. No shadows or postprocessing seen. Simulation dt max 0.05 seconds.
- Foldwild: WebGL1 context, DPR 1, low <=960x540 and scheduled 30 Hz, standard <=1280x720 and scheduled 60 Hz. One controller RAF supplies view time. Terrain/NPC instancing, camera avoidance and nearest-model caps keep work bounded; actual path/scene cost still needs profiling.
- Spline Ride: DPR 1, <=1280x720, antialiasing enabled, 64 longitudinal segments; default eight sides means 1,024 tube triangles, rendered in solid and wire passes plus marker. Sides 3/12 change geometry; cached renderer counters must be observed after real frames. Historical focused run saw two geometries and two/three draws depending on view, not fresh measurements.

## Provisional target-device contract

Owner's current provisional target is **Intel N100, 8 GB RAM, 64 GB storage**. Actual target hardware is unavailable in this audit. Standard 60 FPS and low 30 FPS are planning goals; software/headless renderer timings or desktop frame counts do not prove either. Earlier N4020/4 GB hidden-model notes are historical, not current hardware acceptance.

Recommended owner-approved hardware session: record model/OS/browser/GPU backend, power mode, viewport/DPR and quality; warm once, then collect frame-time median/p95/p99, long pauses/context loss, memory trend and request closure during a repeatable scene route. Circuit should cover maximum-bot co-op/solo, Foldwild world/battle/inspection transitions and resumed saves, Spline all paths/maximum sides. Report raw timings and real user control success separately. A reasonable provisional acceptance question is whether p95 stays within the chosen 16.7/33.3 ms frame budget without sustained stalls; this is proposed, not an already approved threshold or measured pass.

Test 320/390px touch interfaces as input/layout checks, not laptop GPU simulation. Hidden-tab pause and idle rendering deserve independent observation. Circuit/Spline still render when paused; Foldwild renders frozen simulation time while an inspector dialog is open. An idle optimization must preserve redraw after orbit/resize and single-RAF ownership.

## Immutable art and hidden-candidate cost

Do not edit source GLBs, recolor entire creature art, re-export materials or add an optimized derivative without a separate owner order/provenance record. Circuit's six art models have scoped prior permission; unused vehicle deliveries have separate pending rights/concept approval. Foldwild's eighty unchanged deliveries and source-only prototypes are distinct.

The uploaded optional hidden Foldwild candidate is **not runtime**: `OPTIONAL_HIDDEN_SPECIES=null`. Historical [candidate evidence](../../foldwild-hidden-delivery.md) measured 6,384,292 bytes, 13,926 triangles, four materials and four used texture objects. Three 2048x2048 images plus one 512x512 imply 49 MiB RGBA8 base storage and roughly 65.33 MiB with full mipmaps. Those estimates exclude driver/decoded CPU copies and are not actual GPU allocation. Four primitives require at least four art draws; preview fifth draw was the floor. Triangle-cap fit alone cannot clear memory, double-sided material cost, source rights, format acceptance or N100 performance. A planning suggestion to use 512–1024 textures is not permission to alter or ingest a derivative.

## Evidence classes and lifecycle gates

Concept images communicate design only. Uploaded-model preview proves a bounded import/render of those bytes, not implemented encounters/driving. Pure `.mjs` suites verify deterministic rules/validators, not native touch. Focused browser fixtures may intentionally seed saves; label them developer fixtures. Natural-play checkpoints and stable uninstrumented native runs are stronger interaction evidence. Full catalog smoke is a separate unchanged Main-owned loading gate and cannot certify provenance, target hardware, unregistered Foldwild or subjective UI polish.

Current immediate holds: Foldwild mobile single-close M2 stability; graphics context-loss paths across all three; vehicle/hidden-asset integration permission; actual device QA. See [ranked 3D audit](../audits/3d.md) and [four-week outlook](../3d-outlook.md). This document adds no runtime loads, installs, IDs or autonomous scheduled work.
