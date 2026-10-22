# Deployed stapler: external original

**Current `model.glb` is the unchanged external Blender-authored delivery.**
EXTERNAL ORIGINAL by operator dot, supplied 2026-10-22. Originality/authorship
are operator declarations, not independently verified creation history. The
preserved manifest declares `model.blend`, but no Blender source was supplied.
No local Blender work, re-export, subdivision or padding was performed.

## Current measured artifact

- URL: `models/deployed_stapler/model.glb`; bytes: **161804**.
- SHA-256: `82eea211eaa556258adaec5e9daf88dfd931931932d983a08c31efa060039fd0`.
- **3248** scene triangles; **16** mesh drawables; **4110** vertices;
  **6** materials; **5** movable rigid nodes.
- Dimensions (X/Y/Z metres): **0.812820308 / 0.713581030 / 0.772500023**.
- Every mesh has finite normals/UVs with matching position counts; indices are
  in range. No UV synthesis or geometry edits were performed.
- `receipt.json` records exact bounds/dimensions, per-part counts/materials,
  metadata hashes and checked rig parents/local/model pivots/local axes.

## Safe reproduction

From repository root:

```sh
node Games/Jankolock3D/models/import-external.mjs --check
node Games/Jankolock3D/models/import-external.mjs --self-test
```

Default/check is read-only and needs no external-art tree. Explicit `--ingest`
audits all five pinned operator drops before copying their exact bytes, including
`external-art/deployed_stapler/`, then writes measured receipts. Manifest, palette
and rig are preserved byte-for-byte. `rig.json` is canonical; supplied
`manifest.rig.json` was identical and remains a documentation alias only. The
manifest's source/alias declarations do not imply those absent files ship.

There is no procedural builder for this model. The four existing hero builders
and shared `../model-build.mjs` remain unchanged historical fallbacks, not
reproduction sources for any external delivery. Prior model/source evidence is
preserved in Git at `bf215f0`; this new turret was not present at that revision.

Node-only audit establishes GLBv2, embedded buffer/no URIs/images, actual scene
counts, finite geometry, material slots and rig JSON agreement. Runtime mounting,
palette/pose, collision, visual quality, clearance, FPS, hardware and gameplay
remain parent gates. No browser, screenshot, game addition, install or push.
