# Original city environment

## Scope and integration

`world-scene.mjs` mounts `environment.mjs` over the existing immutable world.
The shared `scene`, `camera`, `renderCamera`, `render`, `sync`, `syncStructures`,
`resize`, `diagnostics` and `dispose` APIs remain. Environment counts are added
under `diagnostics().environment`; existing diagnostic fields remain.
No world-data, traversal, spawn JSON, heroes, systems, catalog or UI edits.
The renderer now uses ACES tone mapping and hemisphere fill. This affects the
whole shared scene, so the parent must review actors/portrait under this lighting.

- Graft: brick commercial loft shells, deeply inset glazing, projecting sills,
  stepped cornices with brackets, arched shop entrances and fire escapes.
- Midway: limestone offices with vertical fins, framed windows and stepped
  art-deco parapets with radial metal inlay.
- Greenhedge: brick/stone shopfronts, wall ivy and tree-lined boulevard edges.
- Rooftops: louvered HVAC with modeled fan rings/blades, water tanks with supports,
  hoops and conical caps, original painted billboard boards and diagonal frames.
- Street kit: bent-neck lamps, sagging service cables, scaffold poles/bracing.
  Twenty-one rounded paved turnouts occupy collision-clear intersection corners.

The recessed facades are assembled from real piers/spandrels around glass planes
0.6m behind the exterior, in front of an inset core. These are not flat window
colors painted on the old full-size building cubes. Repeated rectangles remain
appropriate for masonry and framing; geometry is not subdivided to pad counts.
Curves use actual rings, discs, tubes, cones and canopy surfaces.

## Routes and state ownership

All 62 building footprints, roof heights, main lanes, bridge/roof/access ramps,
vents, rope, portals, crates and zipline routes remain in the unchanged world
and traversal modules. Cornices sit below the roof walking plane. Rooftop
service props avoid the east landing, central roof-link and vent landing areas.
Scaffolds are on west facades, escapes on north facades. Lamps/trees are outside
the main lane strip. Paving candidates reject overlaps with every existing box
and ramp; they do not invent new collision or silently move an obstacle.
Decorative props have no new movement colliders: walking through a service prop
or tree off the preserved route remains a limitation, not simulated collision.

Objective groups and crates are deliberately NOT part of environment batches.
`syncStructures` still hides deaths and missing objectives, moves live positions,
and changes Patron phase scale; labels remain attached to those groups.
The environment owns only its geometry/material/texture/instance resources and
cleans them up before the existing scene disposal path.

## Texture authorship and research

All shipped PNG pixels are procedural originals from
`textures/environment/generate.py`, using already-present Pillow for offline
painting/encoding and its bundled default font for lettering. No tool installation,
image-generation service, downloaded material, or runtime dependency was added.
The generator uses fixed random seeds and checks available disk before each PNG
write. Re-run with `python3 -B Games/Jankolock3D/textures/environment/generate.py`.

Inspected research images, spatial feel only:

- https://cdn.deadlock.wiki/Billboards_green_lane.png
- https://cdn.deadlock.wiki/Old_map_eclipse.jpg
- Context: https://deadlock.wiki/Map

Only the architectural ideas of layered cornices, vertical signs, inset windows,
roof equipment and overlapping street-height silhouettes informed this work.
No source pixels, characters, logos, wording, layouts or game assets were copied.
The four sign designs/phrases and folded-paper emblem are authored here.

| Maps | Dimensions | Encoded bytes |
| --- | --- | ---: |
| Brick color / roughness / AO | 3 x 512 square | 360,625 |
| Limestone color / roughness / AO | 3 x 512 square | 363,395 |
| Metal color / roughness / AO | 3 x 512 square | 372,709 |
| Foliage color | 512 square | 66,033 |
| Four-sign color atlas | 1024 square | 47,802 |
| Total | 11 PNGs | 1,210,564 |

Masonry and metal use actual `MeshStandardMaterial.roughnessMap` and `aoMap`.
The AO maps encode darker mortar/panel grooves and use geometry UV channel 0;
color maps are sRGB, AO/roughness are linear data. Masonry UV density is scaled
to geometry size without extra subdivisions. This is **texture-space crevice
AO**, not SSAO, baked scene-wide contact shadows, ray tracing or photorealism.
There are no new external runtime loads; texture URLs resolve beside this module.

## Geometry and performance bounds

CPU construction measured by `environment-test.mjs`:

- 41 reused geometry buffers: 2,376 unique triangles, 77,328 buffer bytes.
- 66,904 static instances; 926,466 triangles if every detail instance is drawn.
  This is the entire assembled city, NOT a measured browser frame count.
- Twelve spatial coarse architecture chunks; 280 coarse mesh batches before
  frustum culling. Details use per-building/street groups with a 155m cutoff.
- Instance matrices occupy 4,281,856 bytes before renderer bookkeeping.
- No arbitrary 20k/80k subdivision target was used: detail comes from modeled
  components, reused across the city. Source plus textures is well below 8MB.

Coarse geometry stays visible at distance; window mullions, small cornice brackets,
fan parts, scaffold braces, fine foliage and lamp/tree groups are distance gated.
Frustum culling remains enabled on every instance batch. Hard detail transitions
may pop. Frame time, upload cost and target-device memory are not measured here.

## Verification and remaining gate

Commands:

```sh
node Games/Jankolock3D/environment-test.mjs
node Games/Jankolock3D/world-test.mjs
node --check Games/Jankolock3D/environment.mjs
node --check Games/Jankolock3D/environment-test.mjs
node --check Games/Jankolock3D/world-scene.mjs
git diff --check
python3 -B scripts/check_maintenance_docs.py
```

Environment CPU regression passes: texture closure/dimensions, actual AO map
attachment, instance counts, collision-clear turnouts, static batch budget,
distance detail, public API keys, objective death, Patron retreat/phase reset,
crate hiding, world immutability and idempotent disposal. It executes the real
scene factory with only renderer/canvas I/O mocked; it is not a WebGL test.
`world-test: 491 assertions passed (module fixtures; native evidence separate)`.
Syntax/diff checks pass. Maintenance checker initially reports
`Commit inspected source changes before validating its inventory.` Parent owns
the registered maintenance manual/inventory reconciliation after integration.

No browser, screenshots, Blender, imagegen, installation or push was performed.
Screenshot count: **0**. Acceptance A is supported by unchanged-route regression,
not newly visually accepted; D/G dynamic rendering has CPU coverage only.

**Quality hold:** this is modular stylized architecture, not reference-level
realism. The protected sparse rectangular block plan and broad lanes remain,
not the reference's dense winding street canyon. Objectives, tower, bridge,
sewer and ground surfaces retain the prior simpler treatment. No full interiors,
scene contact shadows or reflected environment have been added. Parent owns the
subjective screenshot review, integrated lighting/performance check, current
maintenance manuals and the whole-pass budget. Do not promote historical browser
reports as acceptance of these new bytes.
