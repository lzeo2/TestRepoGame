# Gooey Sticky: current external original

**Current `model.glb` is unchanged external Blender-authored art, not output from
retained procedural `build.mjs`.** EXTERNAL ORIGINAL by operator dot, supplied
2026-10-22. Delivery ID `gooey_sticky` maps to runtime model directory `gooey`.
Originality/authorship are operator declarations. No `model.blend` was supplied
despite the preserved manifest's source declaration. No local Blender work,
re-export, subdivision or triangle padding was performed.

## Current measured artifact

- URL: `models/gooey/model.glb`; bytes: **1242716**.
- SHA-256: `56d029d66b5aeaa31e07b1bedcaf70b96537e56cf0b9e66d48bd17d22623ab12`.
- **48760** scene triangles; **30** mesh drawables; **32296** vertices;
  **6** materials; **10** movable rigid nodes (not 17-23).
- Dimensions (X/Y/Z metres): **1.442000014 / 1.439443307 / 0.700270861**.
- Nine meshes lack UVs; this audit does not repair them. All normals and present
  UVs are finite with matching counts; indices are in range.
- Exact bounds/dimensions, per-part counts/materials, metadata hashes and checked
  rig parents, local/model pivots and local axes are in `receipt.json`.

## Safe reproduction

From repository root, run `node Games/Jankolock3D/models/import-external.mjs
--check` (default is also read-only). `--self-test` adds corruption/URI rejection
checks. Neither requires `external-art/`. Explicit `--ingest` audits all five
original drops, including `external-art/gooey_sticky/`, before copying pinned
unchanged bytes and writing measured receipts. Manifest/palette/rig bytes are
preserved. `rig.json` is canonical; supplied `manifest.rig.json` was byte-identical
and remains a documentation alias only, not a second stored rig. Preserved
manifest source/alias declarations do not establish those files are present.

## Historical fallback only

`build.mjs` remains verbatim. **Do not run it against this directory:** it
replaces the external GLB/receipt with historical procedural output; legacy
checks do not validate this delivery. Shared `../model-build.mjs` is unchanged.
Historical README/receipt and concept source reference
`docs/jank3d-design/hero-concepts/gooey.png` are preserved in Git at `bf215f0`
(`git show bf215f0:<path>`), not asserted to be source for the external art.

Node-only audit verifies GLBv2, self-contained/no URIs/images, actual scene
triangles, finite attributes, material slots and rig JSON agreement. No visual,
pose-clearance, palette/animation integration, FPS, hardware or gameplay
acceptance is inferred. Parent owns runtime and shared maintenance updates.
No browser, screenshot, new game, install or push.
