# Portrait relief

The operator supplied this in-house photo-derived portrait relief and approved
an optimized derivative for the existing game. It is a relief, not a full head
scan. This is supplied provenance, not an independent identity or likeness-rights
verification. No Valve art or third-party model source is claimed.

- Original: 10,972,672 bytes, 210,986 vertices, 421,968 triangles.
- Original SHA-256: `abe1b2ee07038d6926813542a2127bca06cb19564f535dd49c593ea60c199fc9`.
- Derived `models/portrait_relief.glb`: 3,228,372 bytes, 61,893 vertices,
  124,512 triangles.
- Derived SHA-256: `8463eee8276187cacaba912d9540279ad1bb338aa382e9448632aa9a33892514`.

`optimize-portrait.py` uses existing numpy and deterministic 1.5 mm vertex
clustering: average positions and RGBA colors, normalize averaged normals,
remove collapsed/duplicate/zero-area triangles, and compact indices. Native
metre coordinates and face winding are retained. The original outside this game
is read only and is not redistributed here. No dependency installation is needed.

Measured source-vertex to assigned float32-centroid displacement is 0.551242 mm
RMS and 1.311636 mm maximum, before unused-cluster pruning. This is not a
surface-distance bound or a visual acceptance claim. Full precision measurements,
bounds, hashes, source counts and derivation details are in
`portrait-receipt.json`. Visual recognizability, lobby placement, screenshots and
hardware performance remain unverified by this asset-only task.

## Local runtime and host boundary

`portrait.js` imports the existing local three.js r186 module. Three.js is
Copyright 2010-2026 Three.js Authors, MIT; preserve `vendor/LICENSE`. No new
loader dependency, external resource, renderer or animation loop is added.
The parser accepts only the optimizer's single untransformed mesh with float32
POSITION/NORMAL, normalized RGBA8 COLOR_0 and uint32 triangle indices.

`await mountPortrait(scene)` returns `{group, dispose, metadata}` after local
config validation and pinned byte-count/SHA-256 verification. Failure rejects
without attaching a partial portrait. The host owns error feedback, scene
lighting, position, orientation, scale, render loop and calls `dispose()` on
teardown. Disposal affects only this portrait, not shared scene resources.
The group retains native coordinates and unit scale, approximately 0.308 m tall;
use about 26x host scale for an 8 m effigy. No host file was changed here.

## Reproduce and verify

Run from the repository root. Pass the supplied original as a CLI argument;
no machine-specific source path is embedded in the script or receipt.

```sh
python3 -B Games/Jankolock3D/optimize-portrait.py --self-test
python3 -B Games/Jankolock3D/optimize-portrait.py "$SOURCE_GLB"
node --check Games/Jankolock3D/portrait.js
node --experimental-default-type=module --input-type=module <<'JS'
import { readFile } from 'node:fs/promises';
import { selfCheckPortrait } from './Games/Jankolock3D/portrait.js';
const data = await readFile('Games/Jankolock3D/models/portrait_relief.glb');
console.log(await selfCheckPortrait(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)));
JS
```

The optimizer checks available blocks with `statvfs` and emits `df -B1` before
each output write, enforces the 8,388,608-byte asset cap and checks source SHA.
Changing the grid requires regenerating config/receipt and updating the loader's
pinned `BYTES`/`HASH` and regression counts. The source SHA stays immutable.

Maintenance-manual/inventory reconciliation belongs to the orchestrator because
this task owns only the six portrait files. Module checks do not grade lobby
acceptance H or replace a browser/full-game release gate. No browser or push
was performed by the asset builder.

## Subsequent verification

The orchestrator independently reproduced the committed derivative byte-for-byte
from the supplied original, recomputed receipt counts/error measurements, and
verified loader/config pins and unchanged source bytes. The optimizer self-test,
loader integrity/parser regression and isolated mount/disposal checks passed.
No replacement asset or fabricated receipt values were introduced.

Independent review `080008e`, recorded in `PORTRAIT-REVIEW.md`, grades H
**QUALIFIED** against the exact integration light/dark lobby captures hashed in
that report. The relief is visible in the room's framed display. These are
integration-owner captures, not a successful run of `portrait-qa.py`, which
skipped because the shared browser slot was occupied. The broader integration
run timed out and its recorded source hash differs from subsequent integration
edits. This closes neither stable-current-source visual acceptance nor hardware,
full-game or release gates. The asset-generation receipt's unverified visual
fields describe its original asset-only generation stage and are preserved.

## Procedural visual pass

The four full-body concepts under `docs/jank3d-design/hero-concepts/` were
created with codex-imagen on the operator's subscription and committed before
character mesh changes. Exact prompts and normalization are recorded in
`art/hero-concept-prompts.json`. They are original design references, not
runtime textures, sculpted models or third-party game assets. Astra workers
interpret them using original procedural geometry; no Blender is used.

The existing three.js r186 package supplies the MIT GLTFLoader, GLTFExporter,
BufferGeometryUtils and SkeletonUtils addons now vendored in `vendor/addons/`.
Only ESM import specifiers were remapped to local modules. Exact upstream/local
hashes and source-relative paths are in `vendor/addons/provenance.json`; the
unchanged full MIT notice remains `vendor/LICENSE`. This adds no package install
or remote runtime dependency. `models/model-build.mjs` is the original shared
Node export/measurement helper, not an in-game renderer.

Spatial research, viewed online and retained only in temporary research storage:
https://deadlock.wiki/Map,
https://cdn.deadlock.wiki/Billboards_green_lane.png and
https://cdn.deadlock.wiki/Old_map_eclipse.jpg. These depict an older reference map,
not an independently verified current layout. They informed masonry recesses,
cornices, rooftop clutter, curved intersections and cable layering only. No
screenshot pixels, signs, character designs, textures or meshes are imported.
All new facade maps/geometry and character surface maps are locally authored.

The procedural result is not represented as a photoreal sculpt. The operator's
external-model queue and remaining quality gaps are recorded in
`docs/jank3d-design/MODEL-WISHLIST.md`. Runtime integration and fresh visual
acceptance are separate from the concept or mesh-generation milestone.
