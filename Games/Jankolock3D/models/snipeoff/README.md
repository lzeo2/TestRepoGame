# Snipeoff: current external original

**Current `model.glb` is unchanged external Blender-authored art, not output from
retained procedural `build.mjs`.** EXTERNAL ORIGINAL by operator dot, supplied
2026-10-22. Originality/authorship are operator declarations. `manifest.json`
declares `model.blend`, but no Blender source was provided. No local Blender,
re-export, subdivision or triangle padding was used.

## Current measured artifact

- URL: `models/snipeoff/model.glb`; bytes: **818532**.
- SHA-256: `a4a0faa196232bf7a40d28491b8f66f056ab0ba3da614c10946ecd8aab13b0bc`.
- **19160** scene triangles; **75** mesh drawables; **21214** vertices;
  **10** materials; **20** movable rigid nodes.
- Dimensions (X/Y/Z metres): **0.710881315 / 1.985000052 / 1.546487786**.
- Three meshes lack UVs. All present normals/UVs are finite with matching counts;
  indices are in range. No missing attributes were synthesized.
- Exact bounds/dimensions, per-part counts/materials, metadata hashes and verified
  rig parents, local/model pivots and local axes are in `receipt.json`.

## Safe reproduction

From repository root:

```sh
node Games/Jankolock3D/models/import-external.mjs --check
node Games/Jankolock3D/models/import-external.mjs --self-test
```

Default/check is read-only, requiring no external drop. Explicit `--ingest`
audits all five deliveries then copies pinned unchanged bytes, including
`external-art/snipeoff/`, and writes measured receipts. Manifest/palette/rig bytes
are preserved. `rig.json` is canonical; supplied `manifest.rig.json` was identical
and is retained as a documentation alias only. The manifest's source/alias
entries do not imply those absent files are delivered here.

## Historical fallback only

`build.mjs` and its Stampead fallback dependency remain verbatim. **Do not run the
legacy builder against the current directory:** it replaces the external
GLB/receipt; legacy checks describe only the procedural fallback. Shared
`../model-build.mjs` is unchanged. Historical README/receipt and concept reference
`docs/jank3d-design/hero-concepts/snipeoff.png` are preserved in Git at `bf215f0`
(`git show bf215f0:<path>`), not asserted as source for this external delivery.

Node-only GLBv2, URI/image closure, geometry/count/material and rig audit does
not prove visual quality, animated clearance, runtime palette/pose integration,
FPS, supported hardware or gameplay. Parent owns runtime and shared maintenance
reconciliation. No browser, screenshots, game addition, installs or push.
