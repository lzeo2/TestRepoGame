# Turretina: current external original

**Current `model.glb` is the unchanged external Blender-authored delivery, not
output from retained procedural `build.mjs`.** EXTERNAL ORIGINAL by operator dot,
supplied 2026-10-22. Originality/authorship are operator declarations; no
`model.blend` was supplied despite `manifest.json` declaring it. No local Blender
work, re-export, subdivision or triangle padding was performed.

## Current measured artifact

- URL: `models/turretina/model.glb`; bytes: **1022124**.
- SHA-256: `e5a3dffe77d0487c30197759367e6851ad650a9d9358670e198fe927a8f763a7`.
- **22416** scene triangles; **81** mesh drawables; **27117** vertices;
  **9** materials; **23** movable rigid nodes.
- Dimensions (X/Y/Z metres): **0.911676422 / 1.949999956 / 1.089500015**.
- One mesh lacks UVs; no attributes were repaired. Normals and present UVs have
  matching finite vertex counts; all indices are in range.
- `receipt.json` contains exact bounds/dimensions, per-part counts/materials,
  metadata hashes and checked rig parent/local/model pivots and local axes.

## Safe reproduction

From repository root, run `node Games/Jankolock3D/models/import-external.mjs
--check` (or omit the flag). `--self-test` additionally tests corrupt-header,
URI and changed-byte rejection. Both are read-only. `--ingest` requires the
operator's original `external-art/turretina/` and the other four drops, audits all
five before writing, then copies unchanged bytes and measured receipts. No
external-art tree is needed for normal checks.

Manifest, palette and rig are copied byte-for-byte. `rig.json` is canonical;
supplied `manifest.rig.json` was byte-identical and remains a documentation alias,
not a duplicate file. The preserved manifest's source/alias declarations are
qualified here rather than silently rewritten.

## Historical fallback only

`build.mjs` stays verbatim. **Do not execute the legacy builder against this
directory:** it overwrites the external model/receipt with historical procedural
geometry. Legacy checks do not validate this delivery. Shared `../model-build.mjs`
is unchanged. Historical README, receipt and concept source reference
`docs/jank3d-design/hero-concepts/turretina.png` are preserved only as historical
Git evidence at `bf215f0` (`git show bf215f0:<path>`), not external Blender source.

Audit is Node-only: GLBv2, self-contained/no URIs/images, finite attributes,
actual scene triangles, material slots and rig JSON agreement. No visual,
pose-clearance, runtime palette, gameplay, FPS or hardware acceptance is implied.
Parent owns loader/pose and shared maintenance reconciliation. No browser,
screenshot, game addition, install or push.
