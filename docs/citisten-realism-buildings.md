# CITISTEN building surface pass

## Scope and integration

Material-only changes in `external-buildings.mjs` and `building-surfaces.mjs`.
No geometry, supplied asset, world, day/night, terrain, manual or inventory edits.
Existing id 241 remains unchanged; no new game or runtime dependency.

The existing material cache now calls `createBuildingSurface` once per original
material. Instances still share each clone. Preparation, material/layout merge
keys, instanced meshes, loader ownership, parser-cache release, rigid-part rigs,
facade normalization and unchanged-pose upload avoidance retain their existing
paths. Architectural classification uses delivered material names, not a guess
based on which node happens to use them. Fire-door glass therefore receives the
same treatment as facade glass without splitting its draw batch.

The orchestrator supplies `scene.environment`. This lane creates no environment
map, cubemap, image, texture, render target, remote request or transmission pass.
Glass remains opaque because these delivered models do not supply interiors.
Standard-material dielectric Fresnel, metalness 0, roughness at most 0.22 and
`envMapIntensity` 1.15 provide sky reflections. Existing authored glazing maps,
normal scales, colors, emissive factors/maps and the kit's absolute day/night
emissive-intensity baseline remain intact. Industrial glass has a delivered
emissive texture but no nonzero emissive factor; this pass does not invent one.
Reflections depend on the integrated environment and are not visually accepted
by these Node checks.

## Actual delivery inspected

Inspected JSON material definitions, mesh attributes and nodes in all 51 loaded
LOD0/1/2 GLBs, plus the loader, kit, world and material checks. All original 138
supplied files, including 52 GLBs and the separate terrain set, matched HEAD
byte-for-byte after implementation. Canonical inventory's Citisten source tree
was `88ccf185435f81855938b0fdc4cef9dbe88b09f4` before this lane's edits, matching
the inspected HEAD tree. This receipt does not refresh the inventory.

Material names below use the exact `<directory>__<slot>` convention:

- `residential_row`, `commercial`, `town_hall`, `police_station`, `fire_station`:
  `warm_brick`, `limestone`, `slate`, `warm_glazing`, `patinated_metal`,
  `recess_shadow_joints`, `civic_pale_painted_trim`. All except fire also have
  `door_timber`; commercial/town hall add `clock_ivory`; fire adds
  `firehouse_oxide_red`. Brick, limestone, slate and glazing already contain
  base-color, normal, packed metallic/roughness and AO maps. Glazing additionally
  contains an emissive map/factor. Their supplied normal scale is about 0.23.
- `industrial_shed`, `power_plant`, `water_tower`: `bolt`, `concrete`, `dark`,
  `ivory`, `rust`, `steel`; industrial/power additionally have `glass`.
  Concrete/steel carry base-color, normal, packed metallic/roughness and AO.
  Glass has an emissive map. Normal scale is about 0.35. Flat-colored slots
  already carry distinct authored roughness/metalness factors.
- `wall_segment`: `dark`, `stone`. `watchtower`: `bolt`, `dark`, `steel`, `stone`,
  `wood`. Stone/steel/wood have base-color, normal, packed metallic/roughness
  and AO maps, with normal scale about 0.35.
- `park_lot`: `park_painted_iron`, `benchwood`, `asphalt`,
  `pale_granite_edging`, `grass`. Wood/asphalt/grass have base-color, normal
  and packed metallic/roughness, without supplied AO. Normal scale is 0.5.
- Assembled `tree_deciduous`: `bark`, `leaf_0`, `leaf_1`, `leaf_2`, `leaf_3`.
  Bark carries base-color, normal and packed metallic/roughness, normal scale
  0.5. Trees, all citizens/zombies and all three vehicle types stay authored.

Actual nodes include civic `__static_warm_brick`, `__static_slate`,
`__static_warm_glazing`, `__door_01` hierarchies; fire's
`fire_station__apparatus_door_01__door_vision_glass` and second apparatus door;
commercial's two HVAC fan hierarchies; industrial `loading_door_lift` and
`pedestrian_door_hinge`; water's `tank_hatch_hinge`; utility `static_assembly_*`;
park `static_bench_*`, `static_park_*`; tree `static_tree_deciduous_13`.
The external-model check resolves every actual named node at every LOD and
checks its unchanged local/world transform against the GLB, including all eight
civic entrance pivots. No roof equipment, door pivot or supplied rig is replaced.

## Treatment and bounds

Of 127 LOD0 source material definitions, 77 stay authored, 18 receive metal
weathering, 16 masonry weathering, five slate weathering, seven reflective glass
factors and four upward-facing steel sheet seams. These counts include all 17
model types, not just buildings. Brick mortar and slate relief already exist in
the supplied maps, so no procedural replacement mortar/normal map is added.

The shared shader adds restrained continuous local-position dirt/streaks,
stronger near the base, plus small roughness variation. Steel adds
screen-derivative-filtered standing seams on upward-facing faces only. No vertex
displacement, replacement normals or UV changes. Color reduction is bounded to
12% on masonry, 8% on metal/slate, with at most another 12% at steel seams;
roughness receives at most 0.06 wear plus 0.04 seam. Authored base color, normal,
AO, emissive and packed G-roughness/B-metalness sampling stays in Three's shader.
Roof and metal reuse the same program key; masonry and steel use two additional
surface keys. Three still selects native variants for differing map layouts.
There are no per-instance shader uniforms, textures or extra draws.

The kit owns/disposes each surface clone once; the external loader alone owns
shared source textures/images. Independent kits do not acquire a global cache.
No FPS, heap, RSS, GPU-memory or target-hardware measurement was made here.

## Unchanged material and triangle counts

Counts are triangles referenced by GLB nodes, not estimates from manifests.
Material counts below apply independently to all three LOD files. Park excludes
its assembly's separate tree instances; the integration check includes the
actual assembled template when comparing merged triangle totals.

| Loaded type | Materials | LOD0 triangles | LOD1 triangles | LOD2 triangles |
| --- | ---: | ---: | ---: | ---: |
| residential | 8 | 21,046 | 10,534 | 4,878 |
| commercial | 9 | 45,388 | 22,326 | 9,911 |
| industrial | 7 | 11,702 | 4,908 | 1,864 |
| power | 7 | 28,576 | 11,996 | 4,565 |
| water | 6 | 24,500 | 8,324 | 3,635 |
| police | 8 | 21,614 | 10,543 | 4,582 |
| fire | 8 | 28,550 | 13,767 | 5,899 |
| park | 5 | 3,356 | 1,836 | 924 |
| townhall | 9 | 111,163 | 53,595 | 22,602 |
| wall | 2 | 9,228 | 416 | 36 |
| watchtower | 5 | 8,988 | 3,770 | 1,417 |
| citizen | 12 | 20,455 | 10,823 | 5,093 |
| zombie | 10 | 20,553 | 10,876 | 5,116 |
| car | 8 | 9,608 | 5,031 | 2,262 |
| tree | 5 | 7,350 | 4,042 | 2,000 |
| patrol_car | 10 | 9,980 | 5,218 | 2,357 |
| utility_car | 8 | 9,980 | 5,227 | 2,350 |

All-type LOD0 fixture remains **240 instanced batches**, before and after. Each
pool's merged triangle sum and distinct material count equal its source template
at each LOD, including park assembly. This is not an integrated frame draw count.

## Verification

Commands run from repository root:

```sh
node Games/Citisten3D/building-surfaces-check.mjs
node --experimental-vm-modules Games/Citisten3D/external-model-check.mjs
node Games/Citisten3D/external-materials-check.mjs
node Games/Citisten3D/world-check.mjs
node Games/Citisten3D/native-check.mjs
```

Actual accepted output includes:

```text
PASS building surfaces: 381 actual LOD0/1/2 material definitions; classification, authored channels, source isolation, shared shader keys, ownership/cleanup
LOD0 surface kinds: {"metal":18,"authored":77,"masonry":16,"roof":5,"glass":7,"sheet":4}
PASS: 17 real LOD0 GLBs, 240 instanced batches; stable handles, UV/PBR, rig/walk/wheels, night baseline, cleanup
PASS: all 17 selected LOD1/2 GLBs, material set, URL whitelist, failed/disposed readiness cleans successful siblings
PASS external terrain: actual GLB channels/factors, indexed/nonindexed triangle coverage, source isolation, AO, flow, ownership/disposal
WORLD CHECK PASS: roads/lanes, static/mobile block AO invalidation, water height, sky probe/shadows, day/night, bounded FX; GLB/animation/material tests run separately
NATIVE CHECK PASS: atomic road cost/occupancy, zone placement, protected hall, stable meshes, grid poses and removal
NATIVE LOOP PASS: static skip, speed 0, input wake, active delta, hidden/resume, pending shots and cleanup
PASS: 138 supplied model files match HEAD byte-for-byte
PASS: catalog 128 entries, unique IDs/schema and tracked URLs
```

`node --check` passes for all four touched/new modules; `git diff --check` passes.
The initial surface test's expected tally was incorrect; inspection established
the exact counts above before the accepted rerun. No production check was relaxed.

`python3 -B scripts/check_maintenance_docs.py` was attempted and blocked with
`AssertionError: Commit inspected source changes before validating its inventory.`
Sibling source dirt remains; manual/inventory refresh belongs to the orchestrator,
not this exclusive path lane. Historical acceptance remains historical.

The Node harness uses real GLTF parsing but stubs HTTP/image decoding. Surface
checks assemble against the vendored Three standard shader chunks; they do not
compile/link WebGL or prove visual realism. Integrated environment reflections,
desktop/mobile day/night screenshots, shader compilation, dense-town performance
and memory measurement remain the orchestrator's fresh BIG-pass QA gates. No
browser, screenshot, full-fleet release gate, push or publication was attempted.
