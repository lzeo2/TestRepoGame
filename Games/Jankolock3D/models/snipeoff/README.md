# Snipeoff: bounded procedural marksman

Original project-authored geometry interpreted from the actual supplied plate at
`docs/jank3d-design/hero-concepts/snipeoff.png` (concept commit `79dc4c8`).
No downloaded art, copied commercial assets, Blender, image maps or new dependencies.
The shortened follow-up explicitly authorized reuse of the authored Stampead human
base. `build.mjs` imports `../stampead/build.mjs` for its shaped face/ears/nose,
neck, gloves/fingers and boot/leg geometry; it removes the cap, heavy torso,
original cape and hammer, narrows the legs, and authors Snipeoff's clothing,
hair and rifle. The exported GLB is standalone; regeneration depends on that
source base and the existing three.js r186/helper files.

## Geometry and materials

- Human facial planes, socket/eyelid details, nose, lips, ears and swept hair locks.
- Ochre lowered hood; fitted charcoal waistcoat and cream lapels.
- Two long swept split-tail panels, longitudinal folds, separate red lining,
  curved hems, edge seams and fasteners. Neither subdivided cubes nor hidden
  padding were added to reach the triangle budget.
- Diagonal leather harness, belt, ammunition pouches, satchel and document rolls.
- Bent sleeves, curved metal bracers, separated glove fingers, knee plates,
  fitted boots, lace crossings, eyelets, seams and sole tread.
- Original diagonal walnut/brass rifle: pencil-section fore-end, graduated ruler
  strip, barrel, scope/saddles, adjustment turret, bolt, trigger guard and ferrule.
- 15 MeshStandardMaterial PBR materials with distinct metalness/roughness. No
  embedded textures. Integrator may attach the shared original surface maps.
- Sweeps have longitudinal UVs; standard primitives retain native UVs. No unique
  packed atlas, authored tangent-space detail or texture-paint work is claimed.

## Coordinates and animation

Metres; front is -Z. Ground minimum is approximately zero (floating-point error
below 0.000001 m), maximum Y 1.979033 m. Named joint-origin groups: `torso`, `head`,
`arm-left`, `arm-right`, `leg-left`, `leg-right`, `cape`. These are rigid pivots,
not a skin rig. The rifle is torso-mounted in the static carrying pose.

## Reproduce and check

From repository root:

```sh
node --check Games/Jankolock3D/models/snipeoff/build.mjs
node Games/Jankolock3D/models/snipeoff/build.mjs
node Games/Jankolock3D/models/snipeoff/build.mjs --check
```

Importing `buildModel()` does not export files. Direct execution uses the shared
storage-guarded exporter. `--check` reads actual GLB bytes/accessors/transforms,
checks hash, triangle/material/drawable counts, finite positions, UVs, bounds,
absence of maps, fresh-source metrics and the strict 6,000,000-byte folder budget.
`receipt.json` records measured geometry, not visual acceptance.

Current export: **170,342 triangles, 39 drawables, 117,798 vertices, 15 materials,
4,835,696 bytes**. SHA-256:
`700f216bc643bf8fde432e91978193c36efce3ade4f62a8fb1471a2d391491ec`.

## Honest limitations and integration handoff

This is a procedural approximation, not a realistic sculpt or photoreal asset.
The borrowed face is generic rather than the plate's likeness; facial anatomy,
hair and material wear need an artist pass. Coat folds are mathematical sweeps,
not cloth simulation; panel intersections and doubled lining require visual
review. The bent sleeves and glove-to-rifle contact are approximate. The base's
knee/boot fittings remain more armored than the lean concept. No skin weights,
IK, facial rig, animated cloth or validated animation clearance. Some narrow
metal/seam details are dense relative to their on-screen value; no LOD supplied.

No browser, renderer, screenshot, gameplay acceptance letter, hardware gate or
push was run or claimed. Parent must inspect the silhouette from front/back,
hand contact, surface normals, clipping and both-theme material readability,
then own runtime integration and maintenance inventory/manual reconciliation.
Only the four assigned files in this folder were changed by this worker; no
catalog entry, game addition, runtime or UI change is part of this artifact.
