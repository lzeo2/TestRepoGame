# Turretina model

Original procedural interpretation of the supplied adult woman engineer concept.
The actual reference read before construction was
`docs/jank3d-design/hero-concepts/turretina.png`, committed in `79dc4c8`.
No reference-game assets, downloaded meshes, image textures, Blender, packages,
or external services were used. Local three.js and its existing exporter/utilities
are the only geometry dependencies; their existing vendor notices apply.

## Geometry and integration

- Anatomical head profile with tapered jaw, chin, cheekbones, brow, recessed eye
  sockets and integrated nose bridge/tip. Separate almond eyes, lids, eyebrows,
  lips, nostrils and shaped ears. Wavy locks, coiled bun, ochre helmet and goggles.
- Waist-shaped jacket and trouser lofts with displaced folds; curved cream chest
  and knee plates; rolled sleeves, forearms, gloves and individually bent fingers.
- Split leather apron with raised hems/seams, belt, buckles, pouches and tools.
  Shaped boot toes/shafts, welts, separate crossed laces, eyelets and sole lugs.
- Rounded canvas rucksack, shoulder straps, back pockets/flap, spiral bedroll,
  folded tripod with clamps/feet and two copper-wire spools.
- Brass stapler carbine with bevelled receiver, individual staple crowns, rails,
  exposed return spring, grip, trigger guard, muzzle and slotted fasteners.

Metres; feet at Y=0, forward -Z. Named top-level groups are `torso`, `head`,
`arm-left`, `arm-right`, `leg-left`, `leg-right`, `cape`. Origins are at waist,
neck, shoulders, hips and upper pack attachment respectively. `cape` contains
rucksack/equipment, not a cloth cape. Carbine moves with `arm-right`.

Geometry is indexed and merged per pivot/material. Fourteen named
MeshStandardMaterial roughness/metalness variants distinguish skin, lips, hair,
eye, jacket, cream, leather, stitch, brass, steel, copper, canvas, ochre and glass.
Every vertex has normals and UVs. Curved surfaces use parametric UVs; fittings use
local primitive charts. There are no image maps in the GLB. Shared original
surface-map assignment remains the integrator's task. Lens tint is opaque PBR,
not physically refractive glass.

## Measured build

| Measure | Result |
| --- | ---: |
| Rendered triangles (indexed primitive count) | 171,818 |
| Vertices | 111,408 |
| Meshes / drawables | 48 |
| Materials | 14 |
| GLB bytes | 4,648,580 |
| Maximum Y / total height | 1.966637 m |
| Bounds minimum | (-0.472000, -0.00000001, -0.332398) |
| Bounds maximum | (0.349000, 1.966637, 0.328500) |
| Degenerate triangles in final generated geometry | 0 |

SHA-256:
`3df07824fe5cce374244d8afb776203906bdb83181eb173e5c3a822030ff7d0d`.
`receipt.json` is written by the shared exporter, not hand-authored. The earlier
export contained 54 collapsed hemisphere-pole triangles; replacing that patch
with the local library's hemisphere topology removed them. An independent GLB
inspection initially rejected exported translation matrices in the verifier;
recognizing those identity-plus-translation matrices resolved that verifier issue.

## Rebuild and checks

From the repository root:

```sh
node --check Games/Jankolock3D/models/turretina/build.mjs
node Games/Jankolock3D/models/turretina/build.mjs
sha256sum Games/Jankolock3D/models/turretina/model.glb
```

The direct invocation runs assertions for grounded adult scale, the seven pivot
names, drawable budget and matching UV/position counts; the shared exporter
checks finite positions, triangle/byte budgets, PBR materials and disk headroom.
Importing `buildModel()` does not export or write anything.

Two consecutive final builds produced byte-identical GLBs and receipts with the
hash above. Import-only verification left the GLB modification time unchanged.
Additional checks inspected finite normals/UVs and triangle areas. Independent
binary GLB inspection checked embedded buffers, absent textures/images, indexed
triangle counts, valid indices, materials, drawables and transformed bounds.
No browser, renderer screenshots, runtime, full-game or hardware gate ran.
No A-I acceptance letter or visual PASS is claimed.

## Procedural limits and handoff

This is a bounded mathematical character model, not a hand-sculpted, scanned or
photoreal reconstruction of the generated plate. It preserves the major costume,
equipment and adult-human feature vocabulary, but facial likeness, believable
anatomy in the rendered result, garment intersections and final visual quality
require independent front/side/back rendering review. Smooth skin lacks pores;
cloth lacks woven microstructure and scuff maps. Shells and separate overlapping
parts are not a watertight retopologized production sculpt. UV charts are not a
unique packed atlas. Fine stitching is represented by raised seams, not every
individual textile stitch.

The pose is baked. There are no skin weights, finger/face rig, elbow/knee joints,
LODs or animation clips. Whole-group rotations are available but may reveal
intersection gaps. The carbine grip and backpack straps need posed visual review.
This asset is not wired into runtime by this task.

The repository maintenance checker was run and reported
`Inventory stale: inspect changes, then run --refresh.` The shared game manual
and inventory are outside this worker's four-file ownership; parent integration
must reconcile them after reviewing all model/source commits. No game was added,
registered or published. Screenshots captured: 0. Full release gates remain held.
