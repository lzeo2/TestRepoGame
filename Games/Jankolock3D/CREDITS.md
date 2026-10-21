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
acceptance H or replace a browser/full-game release gate. No browser or push.
