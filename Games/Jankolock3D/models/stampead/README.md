# Stampead procedural model

Original authored geometry for the existing JANKOLOCK 3D hero. This is a bounded
procedural interpretation, not a scanned human, photoreal sculpt, or acceptance
grade. No external art, image maps, Blender, packages, or runtime code were added.

## Concept and interpretation

The actual supplied image `docs/jank3d-design/hero-concepts/stampead.png` was read
before modeling. It exists in concept-first commit `79dc4c8`; its SHA-256 is
`df6cb4edfc8753103ba77d432f654451e7f2e44904665938e313aa33a2eae203`.
The supplied plate is the visual reference, not an ingested mesh or a claim about
third-party redistribution rights. All output vertices are generated here.

The interpretation retains the broad human inspector silhouette, stern exposed
face under a dark peaked officer cap, cream segmented curved armor, oxblood
straps, asymmetrical red shoulder cape, back-mounted field pack, heavy boots,
and a mechanical stamp hammer. Geometry includes shaped jaw/cheek/orbital planes,
nose/nostrils, ears, eyes/lids/brows/lips, shoulder/elbow/knee contours, bent gloved
fingers and thumb, separate armor lames and tassets, rolled armor rims/rivets,
cloth folds and a ragged cape hem, pouch flaps/buckles, boot lacing and tread,
and a stepped piston-like stamp assembly with an original grid on its underside.

## Files and build

- `build.mjs`: deterministic exported `buildModel()` and direct-invocation build/check.
- `model.glb`: standard indexed glTF 2.0 geometry with no images or textures.
- `receipt.json`: measured counts, material values, world bounds and binary SHA.
- `README.md`: provenance, reproduction, integration limits and current evidence.

Uses only existing local three.js, `BufferGeometryUtils`, and the shared
`../model-build.mjs` exporter. The exporter guards available disk before writes.
The shared runtime may apply its original procedural maps; this artifact does not
require them. No runtime integration or gameplay changes are included.

Run from repository root:

```sh
node --check Games/Jankolock3D/models/stampead/build.mjs
node Games/Jankolock3D/models/stampead/build.mjs
node Games/Jankolock3D/models/stampead/build.mjs --check
sha256sum Games/Jankolock3D/models/stampead/model.glb
```

The runnable check reads actual GLB primitives, indices, material count, UV/normal
attributes, position buffers and scene-node transforms. It checks finite exported
positions, world bounds against the receipt and a fresh source build, joint names,
byte/triangle/drawable limits, no embedded images, and the pinned receipt hash.
A second complete export was run and produced the identical SHA-256.

## Measured artifact

| Measurement | Value |
| --- | --- |
| Rendered primitive triangles | 179,388 |
| Mesh drawables | 45 |
| MeshStandardMaterial materials | 13 |
| GLB bytes | 5,797,108 |
| Height | 1.985 m |
| World minimum | (-0.673067321, -0.000000010, -0.189500004) m |
| World maximum | (0.682412622, 1.985000017, 0.379539307) m |

Binary SHA-256:
`f3479144cf4e33eb183b5b8983815740858899463c7a1a749c4420892ef688f3`

Builder SHA-256:
`cec8147a3c19b90e1801f127753a4382ad469e01e97d151057d0c6327a538776`

The approximately -1e-8 m foot minimum is float roundoff. Tread soles sit at y=0.
Face direction is -Z. Root scale is one, with metres as units. Top-level `torso`,
`head`, `arm-left`, `arm-right`, `leg-left`, `leg-right`, and `cape` retain useful
joint origins. Coordinates are baked relative to those pivots, not flattened into
one root. Left/right labels refer to negative/positive model X. Materials are
merged only within each pivot; brass/steel are metallic, skin/cloth are not.

## Honest quality and integration limits

- No browser, renderer screenshot, or independent visual review was run by this
  builder, per task restriction. Human likeness, silhouette quality, clipping,
  lighting and reference fidelity remain review gates, not inferred successes.
- Facial anatomy is handcrafted parametric geometry, not sculpted musculature.
  Skin has modeled features but no pores, facial hair, expression rig or dental
  detail. Human likeness at close range is unverified.
- Cloth uses deterministic sinusoidal folds, not draping simulation. Cape and
  shoulder drape are separate double-sided sheets; their overlap is not a sewn
  watertight garment. No cloth/body collision or extreme-pose clearance is proven.
- Armor shells have modeled thickness at open rims rather than densely tessellated
  hidden backs. Some covered profile ends are open. This is a render asset, not a
  printable watertight solid. No hidden padding was added to reach triangle count.
- Rivets, curved rims and seams are modeled, but painted wear, chipped enamel,
  woven grain, dirt and the concept's fine leather distress are not reproduced
  in this map-free GLB. Material names describe intended surfaces, not proof of
  physically simulated damage. Shared runtime maps remain an integration task.
- Animation is rigid pivot motion only. Elbows, fingers and knees are a baked pose,
  not independent skeletal joints; the hammer follows the right arm. Large
  rotations can separate armor and soft tissue. No skin weights or motion clips.
- The generated artifact is below its individual 6,000,000-byte allocation;
  the aggregate 60 MB model budget remains the integrator's cross-worker gate.

## Maintenance handoff

Source inspection began with `docs/CODE_QUALITY.md`, the maintenance index,
`240-jankolock3d.md` and the inventory record. The inventory records the older
60-file game tree, so this new asset requires reconciliation by the integrating
parent, who owns the shared manual/inventory. This worker owns only these four
files and does not overwrite concurrent source or documentation work.

`python3 -B scripts/check_maintenance_docs.py` was run and reported:
`AssertionError: Inventory stale: inspect changes, then run --refresh.`
The result is a reported blocker, not a passing documentation gate.
Syntax, actual GLB structural checks and repeat-build SHA checks completed.
Zero screenshots; no A-I gameplay acceptance letters claimed. No new game,
catalog registration, full-fleet gate, browser test, push, or publication.
