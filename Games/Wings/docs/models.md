# Wings F-15/F-35 model contract

Current closeout: 2026-10-15, source through `2d8ba30`. Operator contract:
[real-jets brief](../../../docs/wings-real-jets-brief.md), preserved unchanged.
[Dated milestone receipts](../../../docs/maintenance/audits/wings-real-jets.md)
retain all legacy hashes, tuning and intermediate results; they are not current
asset or acceptance claims.

## Provenance and geometry

Two original from-scratch procedural models authored by
**openai-codex/gpt-6-astra**, generated with Python stdlib only by
`../verification/generate-models.py`. Upstream F/A-18, YF-12 and A-10 GLBs were
inspected for material separation and loader/coordinate/node conventions, not
copied meshes. No downloaded geometry, textures or images were used as inputs.
These are approximate **F-15-style** and **F-35-style** silhouettes, not engineering
replicas. Original generation is not a guarantee of ownership, copyrightability,
non-infringement or unrestricted rights; Wings' missing upstream license remains
unresolved. Existing Three MIT and font OFL notices remain applicable.

Both are gear-up, with transparent framed canopies over actual skin apertures,
cockpit tubs/seats/coaming, layered gray opaque panels, control gaps/seams,
flush gear/bay panels, generic `livery_` marks and petal exhausts. No real insignia.
F-15 has swept shoulder wings, upright twin tails, rectangular intakes and twin
engines; F-35 has trapezoidal wings, canted tails, exposed diamond intakes and one
engine. Bay/weapon/exhaust nodes are static anchor metadata, not new weapons,
external missiles, animated doors or landing-gear functionality.

| Asset | Triangles | Vertices | Bytes | Primitive material assignments | Definitions / unique values |
| --- | ---: | ---: | ---: | ---: | ---: |
| `models/f15.glb` | 43,392 | 25,483 | 1,185,940 | 112 | 10 / 10 |
| `models/f35.glb` | 42,760 | 25,285 | 1,173,404 | 109 | 10 / 10 |

SHA-256 (remeasured during documentation closeout):

- Generator: `4031b6b9787936e0510f7f0637154c433691c6f3851a9127fd9ac8e39747a723`
- F-15: `5787ebe4d03fc70ce08036ad1a37a7eff6ee1a0b73d132939a27cb02964ba0f8`
- F-35: `5e3cd65a8fa1c890907878b3219c863cfdfe4f63bc6da638b846411a5f5caafb`

Indexed triangles, finite normals and UV0, identity roots, scale 1, **-Z forward,
+Y up, +X right**, meter-like units. No textures/images, skins, animation clips,
external resources or additional dependencies. Deterministic committed bytes
match two fresh generations. Hard budgets: F-15 40,000-55,000 triangles; F-35
35,000-50,000; each strictly below 1,200,000 bytes and at least 40 meaningful
material assignments, not 40 distinct colors.

## Runtime integration and exact tuning

Seven-kind hangar keys 6/7 and Custom `StartRequest.aircraft` select `f15`/`f35`.
Original five kinds and bot selection weights are unchanged; both new weights
are zero. Existing renderer first-draw gate still precedes session creation.
Actual authored settings are recorded in `../port.patch`:

| Kind | Cruise / boost m/s | Corner speed / rate | Roll / yaw-turn rad/s | Pitch / roll / yaw response | Cockpit eye / pitch | Chase distance / height |
| --- | --- | --- | --- | --- | --- | --- |
| f15 | 155 / 215 | 105 / 1.2 | 4.6 / 1.05 | 12 / 17 / 9 | (0, 1.05, -4.9) / +0.02 | 28 / 6 |
| f35 | 130 / 180 | 85 / 1.3 | 4.2 / 1.15 | 12.5 / 16 / 9.5 | (0, 1.08, -4.1) / +0.035 | 25 / 6 |

F-15 is faster with higher roll rate; F-35 has lower corner speed and higher
corner rate. Both retain fighter stall 55, radius 8, HP 450, existing weapons
and remaining physics. Cockpit markers match camera coordinates, not accepted
native visibility. Gun anchors: F-15 (1.03, 0.27, -3.9); F-35 (-0.95, 0.53, -3).
Both descriptors have empty pivots, stores, spinners and afterburners. F-15
anchors include wing-inner/outer, fuselage, centerline and twin exhaust; F-35
includes wing, bay and single exhaust. Placeholder length/span: 18.5/13 and
15/10.6; shadows [13, 18.5] and [10.6, 15]. Converted bounds X/Y/Z:
13 × 4.315000 × 18.5 and 10.600000 × 3.305779 × 15.

## Materials, decisions and cost limits

Material-by-material reference inspection measured F/A-18 **151 assignments /
10 unique values**, YF-12 **123 / 12**, A-10 **166 / 12**, all without textures.
The Wings loader uses 55-degree creased normals, paint remapping/vertex-color
merging and shared glass/team-livery materials. Existing toon weathering,
environment and clearcoat, scene ACES/quality shadows/bloom and thumbnail lights
were inspected. Author glass alpha .38 becomes shared converter opacity .62.

The chosen changes enrich parts, apertures, panels and exhausts, expose the
initially buried F-35 intake and retain seams. No shader/world/lighting rewrite:
existing mechanisms are adequate for this scope and GPU failure remains held.
No edge postprocess (existing crease path), gear toggle/struts (gear-up spec and
unverified animation), paint-picker (existing team livery), new weapons/animated
bays (unchanged gameplay), extra dependencies or textures.

CPU conversion yields **four batches each: paint / metal / livery / glass**,
not 112/109 Wings draw calls. Batch triangles are F-15
37,476 / 2,908 / 704 / 2,304 and F-35 36,488 / 3,072 / 896 / 2,304.
Raw standard-Three fixtures have 112/109 draws respectively; that is not Wings
rendering or visual parity.

| Model | Asset triangles / bytes | CPU-converted triangles / batches | Worker ms | Main ms |
| --- | ---: | ---: | ---: | ---: |
| F/A-18 | 16,896 / 912,784 | 17,288 / 8 | 461.560 | 993.078 |
| YF-12 | 18,028 / 780,572 | 18,420 / 8 | 284.415 | 396.393 |
| F-15 | 43,392 / 1,185,940 | 43,392 / 4 | 295.507 | 473.553 |
| F-35 | 42,760 / 1,173,404 | 42,760 / 4 | 202.183 | 503.736 |

Reference CPU totals add 392 generated flame triangles each. Times are noisy
single ordered samples including local I/O, GLTF parse, conversion, view setup
and event-loop wait; Main's sample ran concurrently with UI. No performance win
can be inferred. Jets are about 2.4 times the heaviest selectable triangle count;
AC-130 scenery is not a selectable load precedent. Byte increases versus F/A-18
are +273,156 / +260,620; versus YF-12 +405,368 / +392,832. The pair adds
2,256,792 bytes (about 2.26 MB) over the retired 102,552-byte pair. Native load-time
delta, GPU upload/compile cost and cockpit/flight acceptance remain **UNVERIFIED**.

## Verification and migration

`astra-interceptor.glb`, `astra-trainer.glb` and their `interceptor()`/`trainer()`
generators were removed after cached tracked scans and constructed-path traces.
Live old consumers were generator/checker/preview; the preview's constructed
`../models/astra-` path was migrated. Runtime descriptors/lobby now use f15/f35.
Shared geometry helpers retain jet callers. Historical receipts/hashes remain in
the archive; the compatibility name `astra-check` now tests the two current jets.

Runnable from repository root, using existing tools only:

```sh
python3 -B Games/Wings/verification/check-models.py
node Games/Wings/verification/astra-check.mjs
node Games/Wings/verification/solo-check.mjs
python3 -B Games/Wings/verification/check-models-browser.py --out "$EVIDENCE"
```

The model checker compares committed bytes to two generations without rewriting
assets. Browser checks use cached Three 0.186.0 (or `--three-root PATH`), install
nothing and terminate their owned loopback server. `model-preview.html` is an
isolated fixture, not a game entry or the Wings GPU pipeline. Latest worker:
six renders, exit 0, no console/page errors or external loads. Main independently
passed model, jet CPU, original solo, syntax and clean-pin patch checks; four
fresh unavailable-GPU UI cases passed. Documentation closeout independently
reran the model checker, exit 0. See the [current manual](../../../docs/maintenance/games/232-wings.md)
for scoped evidence, Standards and unresolved release holds. No full-fleet rerun,
new game or publication acceptance.
