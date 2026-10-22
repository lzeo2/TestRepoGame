# Original candle supply trooper

Original offline procedural character, authored with the existing local three.js
and exporter. The retained Stampead concept plate in
`docs/jank3d-design/hero-concepts/stampead.png` informed the muted canvas, ivory
curved armor, brass fittings, leather straps and supply-ruck vocabulary. No mesh,
image map, commercial-game asset, Blender output or external dependency was
imported. This is a simpler soldier, not a duplicate hero or a photoreal sculpt.

## Geometry and budget

- **31,730 actual GLB triangles; 1,592,464 bytes; 12 mesh drawables; 4 materials.**
- Contract: 15,000–40,000 triangles (target 25,000–32,000), under 2,000,000 bytes,
  at most 12 drawables. No padding surfaces or high-poly sphere anatomy.
- Bounds in metres: approximately X `[-0.37594, 0.37729]`, Y `[0, 1.89600]`,
  Z `[-0.32224, 0.28600]`. Ground error is only float32 roundoff, about 0.00000003m.
- Front is **-Z**, Y is up. Fitted torso, folded jacket and split skirts,
  tapered upper/lower limbs, shaped instep/toe/heel, tread contacts, individual
  bent gloved fingers, kneepads and curved chest/shoulder plates are modeled.
  Rear rucksack, harness, buckles and ribbed compact stapler carbine are geometry.
- Candle is a continuous carved wax shell with orbital recesses, brows, nose,
  cheek/mouth/chin shaping, scalloped melt rim, shallow well, drips and wick.
  Small solid amber flame has emissive intensity **0.22**, without bloom or lights.
- Geometry is indexed with normals, UVs and linear vertex colors. Batches merge
  by pivot/material. Four MeshStandardMaterial variants provide matte cloth,
  enamel/metal, wax and flame responses; cloth/leather/rubber share roughness and
  armor/brass/steel share roughness/metalness to avoid extra draws. There are
  **no image maps or external buffers**. Shared original 512px surfaces are
  integrator-owned; UVs are procedural per-part, not an authored packed atlas.

SHA-256: `e8cd44bc75769081ca7a2bfa6a2d73634c89de5cc20c4de200bde212405fcff4`.
`receipt.json` is emitted by the shared exporter from measured geometry and bytes.

## Animation handoff

`build.mjs` exports `buildModel()` without writing on import. Root placement,
cloning/shared resources and runtime animation remain caller-owned.

| Group | Pivot in root metres | Contents |
| --- | --- | --- |
| `leg-left` | `[-0.125, 0.91, 0]` | Left thigh, lower leg, knee and boot |
| `leg-right` | `[0.125, 0.91, 0]` | Right thigh, lower leg, knee and boot |
| `arm-left` | `[-0.255, 1.35, 0]` | Left shoulder, sleeve, forearm and hand |
| `arm-right` | `[0.255, 1.35, 0]` | Right arm/hand and carried stapler |
| `candle` | **`[0, 1.45, 0]`** | Wax mesh plus nested `flame` group |

All candle/flame vertices are at nonnegative local Y relative to the candle
base. Scaling `candle.scale.y` shrinks upward geometry toward **Y=1.45**, not
toward the head center. The regression checks 0.35 scale preserves that base.
Flame follows the candle as a child; its material and group are identifiable.
No HP logic was added. Collar stays on the body outside this scaling group.

These are rigid marching pivots, not skeletal skinning. Elbows, knees and fingers
look articulated but do not bend independently. Large swings can intersect gear;
no runtime motion clearance, crowd FPS, supported-hardware or visual acceptance
is claimed. Carved face, cloth folds and surface color remain procedural
interpretations, not scanned anatomy, hand-sculpted detail or texture weathering.

## Rebuild and checks

```sh
node --check Games/Jankolock3D/models/trooper/build.mjs
node Games/Jankolock3D/models/trooper/build.mjs
node Games/Jankolock3D/models/trooper/build.mjs --check
```

The default CLI uses `models/model-build.mjs` with the requested bounded export
arguments and then decodes the actual GLB through the local GLTFLoader. `--check`
only reads/reconstructs: validates real triangle/byte budgets, drawable count,
material type, finite positions/normals/UVs/colors, nondegenerate triangles,
source/GLB/receipt agreement, bounds, named pivots, bottom-anchored candle scale,
absence of image maps/external geometry, and SHA-256.

Two consecutive final exports produced byte-identical **GLB and receipt**.
No browser, screenshot, Blender, install, runtime/UI edits or push was performed.
No game or catalog entry was added. This asset is not automatically integrated.

Retained maintenance/spec context: read project AGENTS, CODE_QUALITY, the current
Jankolock3D manual, model wishlist and hero mesh appendix; no temporary spec was
present. Inventory entry hash matched current source, but its game-tree hash was
already stale after sibling model commits. The maintenance checker was run and
blocked on concurrent tracked source edits (`Commit inspected source changes
before validating its inventory.`). Parent owns the shared manual/inventory
reconciliation; this delivery changes only the four files in this directory.
