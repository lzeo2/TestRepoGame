# Gooey Sticky: human adhesive specialist

Original procedural interpretation of the supplied concept at
`docs/jank3d-design/hero-concepts/gooey.png`, concept-first commit `79dc4c8`.
The actual image was read before modeling. No reference-game meshes, textures,
marks or imagery were imported. The earlier blob placeholder is not this model's
anatomy. This directory contains a character asset, not a new game or a runtime
integration change.

## Measured delivery

| Property | Actual value |
| --- | ---: |
| Indexed triangle primitives | 179,556 |
| Vertices including UV/part seams | 109,012 |
| Mesh drawables / material primitives | 43 / 43 |
| MeshStandardMaterial PBR materials | 13 |
| GLB bytes | 4,612,808 |
| Height | 2.051000112 m |
| Width including hoses | 1.176500388 m |
| Depth including sprayer and reservoirs | 0.822696060 m |
| Minimum Y | -0.000000007 m (floating-point zero) |
| Zero-area triangles found | 0 |
| Embedded image maps / external buffers | 0 / 0 |

SHA-256:
`28af9491202b130ec2853aff3d1090c2bdaa5f166b2e643f80ef5601942a2a5e`

`receipt.json` is written by the shared exporter, not hand-authored. Triangle
counts describe actual exported indexed primitives, independently decoded from
the GLB and loaded by the local GLTFLoader; they are not a screen-space visible
triangle count or an FPS result. No hidden filler meshes, cube subdivisions or
invisible budget-padding geometry are used. Ordinary garment overlaps and
reservoir brackets remain where the layered construction requires them.

## Construction and integration

- Broad human proportions; continuous shaped face with brow ridges, eye sockets,
  cheeks, nose bridge/nostrils, lips, chin, ears, eyebrows and moustache. An
  open-front helmet and lightly transparent curved visor leave the face exposed.
- Rounded brass visor rim, fasteners, side valves and ochre screw-top crown.
- Ivory rubberized coat with displaced longitudinal/compression folds, curved
  breastplate, separate turned lapels, layered shoulders, bound split skirt and
  rolled hem. The `cape` pivot owns the coat skirt, not a separate superhero cape.
- Tapered sleeves/elbows, gauntlets, four individually curved fingers and thumb
  on each hand; gathered trousers/knees, shaped boots, soles, laces and buckles.
- Curved leather harness, belt, shaped flap pouches and brass hardware.
- Two rear pressure reservoirs with ribs, ribbed screw caps, cradle bands,
  brackets and valves. Corrugated hoses follow curved paths to the equipment.
- Original brass glue sprayer has a pressure sleeve, open reinforcing cage,
  piston, grip, trigger/guard, gauge and tapered nozzle. The right hand holds it.

Units are metres, Y-up, facing -Z. Named rigid pivots are `torso`, `head`,
`arm-left`, `arm-right`, `leg-left`, `leg-right` and `cape`, positioned at the
waist, neck, shoulders, hips and skirt attachment. A named
`glue-sprayer-muzzle` child marks the nozzle inside `arm-right`. Positive X is
the character's right side, consistent with facing -Z. Meshes are merged by
material within their body pivot, preserving animation boundaries.

All materials are original MeshStandardMaterial color/roughness/metalness
variations. There are no image maps in the GLB. Cloth/organic surfaces have
explicit longitudinal/angular or facial UVs; tubes and fittings retain their
native primitive UVs. UVs are not a packed non-overlapping atlas. The integrator
owns applying shared original 512px surface maps and any runtime asset wiring.
No kit, hitbox, camera, attack origin or live renderer path was edited here.

## Deterministic rebuild and regression

From the repository root, using the existing Node installation and local vendor:

```sh
node --check Games/Jankolock3D/models/gooey/build.mjs
node Games/Jankolock3D/models/gooey/build.mjs
node Games/Jankolock3D/models/gooey/build.mjs --check
sha256sum Games/Jankolock3D/models/gooey/model.glb
```

`buildModel()` is exported; importing the module does not generate or write an
asset. Direct execution constructs and checks the model, then invokes the shared
exporter/storage guard. `--check` rebuilds geometry in memory without rewriting
files, checks finite attributes, UV coverage, nonzero triangle areas, pivot names,
feet/height and triangle/drawable limits, decodes the saved GLB triangle count,
and verifies its byte length and SHA against the measured receipt. Two consecutive
exports produced the identical hash above. No random seed, timestamps, downloads,
Blender, browser, installation or external assets are involved.

Fresh Node-only checks completed with 179,556 triangles, 43 drawables and
4,612,808 bytes. The existing `character-assets.mjs` local loader also loaded the
asset and cloned all 43 meshes with shared surfaces; repeated clone cleanup completed.
These are construction/integrity checks, not renderer or visual acceptance.

## Honest gaps and handoff

This is a bounded procedural interpretation, not a photoreal sculpt or an
accepted visual match. The concept's irregular wear, subtle skin detail and
cloth microstructure are not baked into this geometry. The face is a static
procedural surface, not a scanned or facially rigged head. Hair is sculpted
ribbons, not strand grooming. There is no skeletal skinning, cloth simulation
or deforming hose rig. Limbs and corrugated hose routes are rigid assemblies;
large arm swings can separate a hose from its torso reservoir. Shoulder/elbow,
coat/leg and transparent-visor clearances need actual animation/render review.
The boot soles and hardware are simplified relative to the concept.

No browser, screenshot, supported-GPU measurement, gameplay gate or visual grade
was produced. No push, catalog change or game addition occurred. The global
maintenance checker was run and reported `Inventory stale: inspect changes, then
run --refresh.` Global manual/inventory reconciliation belongs to the parent
integrator, outside these four owned files. Parent handoff target: 6821732.
