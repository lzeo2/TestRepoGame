# Aircraft material pass

Source-only checkpoint for the seven existing selectable aircraft. No new game,
model, geometry, rig, loadout, simulation, generator or boat changes. The source
night landing/search SpotLight paths from `5c13421` remain byte-for-byte intact.
Main repository files and generated deployed bundles are not updated by this lane.

## Converter and consumers

`scene.ts`, `world-view.ts`, the aircraft preview and `ui/game.ts` consume the
shared aircraft renderer. `preloadAircraft` loads the GLBs, `buildTemplate` bakes
rigid skinning and material buckets, and `createAircraftView` shares those meshes
between instances. Existing source conversion stripped UVs and replaced source
roughness/metalness with two fixed paint/metal materials. All seven actual GLBs
have scalar PBR definitions and no texture/AO maps or vertex colors.

The converter now carries roughness, metalness and neutral AO in the three-float
`aircraftSurface` attribute. Values remain per source mesh when paint/metal and
team-livery geometry is merged. Livery remains a single batch even when its
source factors differ. Existing glow and flame paths are unchanged. Glass keeps
its source color, opacity, roughness and metalness, with dielectric IOR 1.46,
clearcoat and disabled depth writes; no costly screen-space transmission.

`aircraft-surfaces.ts` generates two shared local 128 x 128 linear RGBA textures:
packed AO/roughness/metalness and a normalized tangent-space micro-normal map.
Integer-hash grain, elongated finish variation and shallow staggered panel seams
replace the previous dark three-axis regular seam grid. ORM modulates rather
than replaces authored factors. Weathering is restrained and clearcoat reduced.
Near-black paint is no longer lifted to light gunmetal.

The surface UV attribute is projected in aircraft-local metres before skinning.
It follows animated parts without world-space swimming and does not depend on
inconsistent primitive UV scale. No source texture UVs are required by these
seven models. Future textured assets must review this assumption rather than
silently discard source maps. Dominant-normal projection can show transition
seams on curved primitives; visual acceptance remains open. Paneling is generic
finish detail, not a claim of aircraft-specific rivet or maintenance-panel accuracy.

## Budgets and unchanged source evidence

| Asset | Source triangles before / after | GLB bytes before / after |
| --- | ---: | ---: |
| F/A-18 (`fa18`) | 16,896 / 16,896 | 912,784 / 912,784 |
| Apache | 11,322 / 11,322 | 745,072 / 745,072 |
| A-10 (`a10`) | 17,576 / 17,576 | 952,180 / 952,180 |
| YF-12 | 18,028 / 18,028 | 780,572 / 780,572 |
| B-2 | 4,740 / 4,740 | 283,788 / 283,788 |
| F-15 | 41,352 / 41,352 | 1,176,316 / 1,176,316 |
| F-35 | 40,812 / 40,812 | 1,174,768 / 1,174,768 |

Authored renderer source bytes before / after: `toon.ts` 7,221 / 7,613;
`aircraft.ts` 59,961 / 60,948; new `aircraft-surfaces.ts` 0 / 2,781.
These are UTF-8 source bytes, not a measured deployed bundle-size delta.

The CPU check pins complete SHA-256 hashes, bytes and primitive triangle counts.
No geometry-conversion or procedural cone code changed. Historical converted
F-15/F-35 totals are 41,744/41,008; these are not fresh runtime measurements.
Paint/metal/livery batching remains bounded as before; source-aware glass uses
existing distinct glass buckets. No per-panel draw calls or per-frame texture
updates. New vertex data is 20 bytes per converted opaque/livery vertex (UV and
three factors). Shared base texture payload is 131,072 bytes, about 175 KB with
mips, allocated lazily once. Exact converted memory/draw counts are unmeasured.

## Verification

From the isolated source repository, with Node 22 and the existing model folder:

```sh
node --experimental-strip-types games/wings/aircraft-realism-check.ts <models-directory>
git diff --check -- games/wings/src/render/toon.ts games/wings/src/render/aircraft.ts games/wings/src/render/aircraft-surfaces.ts games/wings/aircraft-realism-check.ts games/wings/AIRCRAFT-REALISM.md
```

Fresh result: seven unchanged asset PASS lines, **762 source PBR factors**,
finite/deterministic ORM and normal maps, normalized decoded normals, finite
local UVs, and unchanged geometry conversion, rigs, loadouts, animation and
SpotLight paths. Source section guards compare against `5c13421`. Existing
esbuild **0.28.2** transpiles all three renderer files and this regression; CPU
bundle execution requires no Three dependency or test framework.

**FPS NOT MEASURED. Tooling hold:** exact Three 0.186 is unavailable. No Three
0.180 substitution, browser download, dependency install, native shader compile,
screenshot, target-device performance or visual-realism PASS is claimed. Only
existing node material properties/TSL attribute, texture and arithmetic APIs are
used, but WebGPU/WebGL2 shader acceptance is unproven until exact tooling returns.
Run the native aircraft preview across all seven kinds on both backends and
review dark paints, canopy transparency, projection boundaries and mip behavior
before delivery. This is not release, push or publication approval.

The main maintenance checker was attempted read-only and stops at its existing
`Commit inspected source changes before validating its inventory.` assertion
because unrelated main game WIP is dirty. No main manual/inventory writes are
allowed in this lane; the orchestrator must reconcile them on integration.
