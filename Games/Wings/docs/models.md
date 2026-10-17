# Wings F-15 and F-35 model contract

Repair status: 2026-10-17. Geometry milestone `92e470f`; authored CPU regression
`f1f7cc6`. The orchestrator reviewed revised front/side/top/open-bay fixtures
against the official references before approving that geometry milestone. This
is scoped geometry approval, not final operator, native-flight or release acceptance.

Read the [standing quality contract](aircraft-quality-contract.md),
[v2 brief](../../../docs/wings-jets-v2-brief.md),
[repair acceptance](repair-acceptance.md) and [study](repair-study.md).
The [original brief](../../../docs/wings-real-jets-brief.md) and
[dated receipts](../../../docs/maintenance/audits/wings-real-jets.md) preserve
historical models, hashes, failures and decisions; their measurements are not current.

## Provenance and measured geometry

Original procedural models were authored by **openai-codex/gpt-6-astra**;
current geometry and integration repairs use **openai-codex/gpt-6.1-sol**.
`verification/generate-models.py` uses Python stdlib only. Original selectable
GLBs were studied for materials, coordinates and rig conventions, not copied
meshes. Official aircraft specifications and photographs informed the revised
proportions; no downloaded mesh or texture was incorporated. These are game
models, not engineering replicas or operational loadout claims. Original
procedural generation does not establish redistribution rights for the upstream
game or models. Wings' missing upstream LICENSE remains unresolved; retained
Three MIT and font OFL notices license their own components.

| Asset | Triangles | Vertices | Bytes | Assignments | Material definitions / unique values | Raw X/Y/Z bounds |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `models/f15.glb` | 41,352 | 25,305 | 1,176,316 | 142 | 12 / 12 | 13 / 4.315 / 19.44 |
| `models/f35.glb` | 40,812 | 25,323 | 1,174,768 | 143 | 12 / 12 | 10.7 / 3.313559 / 15.7 |

SHA-256 of committed bytes (generator measured through Git, using LF):

- Generator: `961dfcef3760a4b6dd6bbc87ba11360b5ef5f35cae57a3895b42a8bcf7c3d0b7`
- F-15: `5c1bf64dc21962dc822dc44edd91186aa4a6932034b06a405d3170518fc135bf`
- F-35: `ce19018414037e3cef949a99ae08a1d035b25fbd20601e1835c2426bc32db197`

Both use indexed triangles, finite positions/unit normals/UV0, identity roots,
scale 1, -Z forward, +Y up and +X right. No textures, images, skins, animation
clips or external resource URIs. Both are gear-up, with canopy apertures and
cockpit interiors, dark neutral panels, generic team markings and emissive exhaust
discs. F-15 has external missile stores; F-35 has actual recessed belly apertures,
interior roofs/walls, internal stores and curved hinged covers. No gear toggle or
new weapon type was added.

## Runtime contracts

Seven-kind selection uses `f15` and `f35` (hangar keys 6/7). Original five aircraft
and bot weights remain unchanged; both jets have bot weight zero. Session creation
still waits for the renderer's real first draw. These are distinct arcade fits
using existing weapon IDs:

| Kind | Pilot slots | Officer slots | Stealth | Cruise / boost m/s |
| --- | --- | --- | --- | --- |
| f15 | cannon20 / aim9 | maverick / null | No | 155 / 215 |
| f35 | cannon20 / tvmissile | tvmissile / null | Yes, existing stealth rules | 130 / 180 |

Both retain fighter stall speed 55, collision radius 8 and HP 450. Handling uses
existing fixed-wing rules:

| Kind | Corner speed / rate | Roll / yaw-turn rad/s | Pitch / roll / yaw response | Cockpit eye / pitch | Chase distance / height |
| --- | --- | --- | --- | --- | --- |
| f15 | 105 / 1.2 | 4.6 / 1.05 | 12 / 17 / 9 | (0, 1.05, -5.148972972973) / +0.02 | 28 / 6 |
| f35 | 85 / 1.3 | 4.2 / 1.15 | 12.5 / 16 / 9.5 | (0, 1.08, -4.291333333333) / +0.035 | 25 / 6 |

Gunner offsets are (0, -1.4, cockpit Z); camera visibility remains a native-review
gate. Placeholder length/span is 19.44/13 and 15.7/10.7; shadow span/length is
[13, 19.44] and [10.7, 15.7].

`VehicleSpec.hardpoints` now supplies actual gun and missile launch coordinates.
`muzzlePosition` rotates those local points by aircraft orientation and adds its
world position; original aircraft retain the radius-based fallback. Coordinates
come from the final GLB node hierarchy, not copied fighter constants:

| Kind | Gun | Pilot L2 / R2 store origins | Officer L1 / R1 store origins |
| --- | --- | --- | --- |
| f15 | (1.03, .27, -4.098162162162) | (+/-4.25, -.40, 1.313513513514) | (+/-2.55, -.48, .105081081081) |
| f35 | (-.958962264151, .53, -3.14) | (+/-.918584905660, -.15, .397733333333) | (+/-.535, -.15, -.1256) |

In the paired coordinates, L is negative X and R positive X. Each missile slot
has two rounds and two stores: each depleted round hides one store in launch
order; regeneration restores one. F-35 covers open for pilot secondary [0,1] or
officer primary [1,0], not pilot cannon [0,0]. Left cover rotates -1.45 radians,
right +1.45, about local Z; converted door surfaces must move downward and return
closed. F-15 has two afterburners and F-35 one, using existing throttle/boost glow,
stretch and generated +Z cones. Spinners are empty because these jets need none.

## Conversion and budgets

Only these jets preserve authored dark hull colors through conversion; original
five material behavior is unchanged. Metal, glass and team livery retain existing
materials. Raw GLB appearance is not converted-renderer appearance.

Current CPU conversion has six batches per jet: paint, metal, livery, afterburner,
glass and flame. F-15 totals 41,744 triangles including 392 generated flame
triangles; F-35 totals 41,008 including 196. Raw standard-Three draws are 142/143,
not six-batch Wings scene or frame draw counts. F/A-18 reference is 16,896 asset
triangles / 912,784 bytes, 17,288 converted / eight batches; YF-12 is
18,028 / 780,572, 18,420 converted / eight batches. No performance win or native
load-time delta is established by single CPU samples. AC-130 scenery is not a
selectable-aircraft budget precedent.

Hard model budgets remain F-15 40,000-55,000 triangles, F-35 35,000-50,000;
each strictly below 1,200,000 bytes, with at least 40 meaningful assignments.
The checker also validates F-35 store vertices inside the aperture footprint,
between the closed cover and bay roof. These are structural limits, not a device
performance guarantee.

## Verification and outstanding evidence

Fresh repeated-generation `check-models.py` passes against the committed models.
D19's source-built CPU regression passed against those bytes: distinct fits,
stealth, independently composed model hardpoints, identity/rotated muzzle tests,
offline takeoff/turn simulation, store depletion/regeneration, throttle/boost
exhaust, both bay triggers, cannon exclusion, signed door travel and camera math.
These are CPU and render-state fixtures, not native input acceptance.

Approved external build tooling is Bun 1.4.2, Vite 7.3.7, Three 0.186.0,
Rollup 4.64.5 and esbuild 0.28.2. Source-only build succeeded. Browser/test bundles
are integrated; the regenerated patch applies to the clean pinned index. Tracked
and constructed-path checks cover retired hashed chunks and current imports.
Generated bundles were not hand-edited.
See the [source rebuild receipt](../../../docs/maintenance/audits/fleet-followup-wings.md)
for the recovery pattern and [manual](../../../docs/maintenance/games/232-wings.md)
for runnable checks. No typecheck PASS is claimed.

**Native evidence:** the final parent probe passed both aircraft on Windows Edge
WebGPU/AMD: normal keyboard takeoff, climb above 120 m, turn, boost, cockpit/chase,
cannon projectiles, Escape pause, ordinary menu return (zero sessions) and fresh
restart (one session). No console/page errors or external requests. Root reviewed
raw family comparisons and saved native views in [previews-v2](previews-v2/README.md).
Cockpit forward view is usable with coaming/nose below the reticle; this is not
operator approval or converted-family parity. Headless pointer-lock acquisition
failed; keyboard fallback worked. Physical mouse capture, missile combat, audio,
Pi GPU behavior and load-time delta remain unverified. Worker readiness failures
and historical Pi shader failures are preserved as bounded failures.

**Full catalog gate:** the fresh unchanged run at `b52d942` passed **125/125,
exit 0**, in 1,579.29 seconds. Coding sparse configuration was restored exactly,
protected hashes remained unchanged, and the repository was clean. Peak Games
payload was 195,853,427 bytes; the 2 GiB free-space floor held. Existing failure
filters were unchanged and their exclusion counts are not instrumented. This is
a catalog loading pass, not full gameplay, offline or target-device acceptance.
See the [repair receipt](../../../docs/maintenance/audits/wings-repair-20261017.md).
The historical `2d2eb61` 124/125 failure remains dated evidence. Rights, remaining
native checks, historical artifact-path cleanup and two generated shader-template
whitespace findings remain open. No push or release authorization follows.
