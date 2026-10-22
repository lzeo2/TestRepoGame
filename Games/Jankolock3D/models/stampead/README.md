# Stampead: current external original

**Current `model.glb` is the unchanged external Blender-authored delivery, not
output from the retained procedural `build.mjs`.** EXTERNAL ORIGINAL by operator
dot, supplied 2026-10-22. Originality/authorship are operator declarations.
`manifest.json` declares `model.blend`, but no Blender source was supplied.
No local Blender work, re-export, subdivision or triangle padding was performed.

## Current measured artifact

- URL: `models/stampead/model.glb`; bytes: **948632**.
- SHA-256: `6c679456b2ce7adce25515f5eb5e4947960a4541904edb65f290a5f9978926f0`.
- **25596** scene triangles; **69** mesh drawables; **23960** vertices;
  **9** materials; **17** movable rigid nodes.
- Dimensions (X/Y/Z metres): **1.326644348 / 1.825499956 / 0.926499985**.
- One mesh has no UV attribute. Normals and all present UVs have matching finite
  vertex counts; indices are in range. Missing UVs were not synthesized.
- `receipt.json` records exact bounds/dimensions, per-part counts/materials,
  metadata hashes, rig parent/local/model pivots and local-axis checks.

## Reproduce/check without changing geometry

From repository root:

```sh
node Games/Jankolock3D/models/import-external.mjs --check
node Games/Jankolock3D/models/import-external.mjs --self-test
# Only when the original operator drop is available:
node Games/Jankolock3D/models/import-external.mjs --ingest
```

Default and `--check` are read-only and need no `external-art/` directory.
`--ingest` validates all five pinned deliveries before copying exact bytes from
`external-art/stampead/`; it preserves manifest/palette/rig bytes and writes
measured receipts. `rig.json` is canonical: supplied `manifest.rig.json` was
byte-identical and is a documentation alias, not a second stored rig file.
The unchanged manifest's alias/source declarations do not imply those files ship.

## Historical fallback only

`build.mjs` remains verbatim as fallback source. **Do not run it against the
current model directory:** direct invocation replaces current GLB/receipt with
legacy procedural output; its checks describe that historical model, not this
external delivery. `../model-build.mjs` is likewise unchanged and is not used to
regenerate this asset. Legacy source evidence, README/receipt and concept
`docs/jank3d-design/hero-concepts/stampead.png` are preserved in Git at `bf215f0`
(use `git show bf215f0:<path>`), not claimed as current external-art source.

Node-only audit confirms GLBv2, embedded buffer/no URIs or images, finite geometry,
actual scene counts, material slots and JSON rig agreement. It does not establish
visual quality, pose clearance, runtime palette/animation integration, FPS or
hardware/gameplay acceptance. Parent owns loader, pose and shared maintenance
manual/inventory reconciliation. No browser, screenshot, new game or push.
