# Circuit Ward model delivery and local loader

## Required provenance and usage status

The operator states that all six models were generated via **Dot** and orders
integration into Circuit Ward on the public site. The first five were delivered
in `bc57a17`; `arena-wall.glb` arrived in `91adf55` on 2026-10-01. The complete
six-file source inventory is now tracked together at `91adf55`, with the first
five byte-identical to `bc57a17`. This audit changes none of the model bytes.

The missing-wall delivery request in ticket `pi-912882-1790843183570` is
**fulfilled**. Its separate public-distribution/provider-terms question remains
**pending**; no operator confirmation of those rights has been received for
this audit. No generator's legal identity or license grant is established here.
The operator's integration order is not a substituted provider license. This
work is local only, with no push or release authorization.

Each GLB's embedded `asset.generator` says
`Original arcade maintenance-bay procedural mesh builder`; its extras claim
creator `OpenAI assistant`, original procedural design without downloaded
models/textures/scans/third-party artwork, and license `CC0-1.0`. These are
**unverified embedded assertions**, not evidence of generator identity, ownership,
provider terms, or a valid CC0 dedication. Do not present them as verified
permission. Preserve the files and obtain the pending confirmation before a
public redistribution/release decision. The three.js MIT license covers the
library, not the model artwork.

This delivery supersedes the historical "No generated 3D models" / "No
GLTFLoader" statements in [circuit-ward-sources.md](circuit-ward-sources.md);
that note documents the earlier primitive-only milestone. The one-run game
approval and wishlist remain in [circuit-ward-concept.md](circuit-ward-concept.md).

## Actual model inventory

All dimensions below are measured from decoded binary POSITION values, not
merely copied accessor bounds. X/Y/Z extents are in declared meters, with Y up;
front/muzzle -Z and grip placement are delivery metadata/intention, not a
semantic orientation proof. Six decimal place extents hide float32 rounding.

| File under `Games/Circuit Ward/models/` | Bytes | SHA-256 | Triangles / ceiling | Measured X × Y × Z (m) |
| --- | ---: | --- | ---: | --- |
| `cover-console.glb` | 100740 | `c5584de91a719fb630f5b2d2ab9d888da74bd2e440086025426fb2e31ca6196a` | 828 / 2000 | 2.400000 × 1.050000 × 1.200000 |
| `sentry-walker.glb` | 189064 | `5809078aa1fed84a7cffc19491fe1f6f4466825ae83ae8c42c42cd008e768cf5` | 1564 / 2500 | 1.300000 × 1.950000 × 0.850000 |
| `buzzer-drone.glb` | 147768 | `e266d70934e10ba093aca148e3db65a7435ab12ece4255187beee6cccc7f1dee` | 1220 / 1500 | 1.500000 × 0.400000 × 0.800000 |
| `coil-blaster.glb` | 113720 | `2ac188eeb484fb78b2b0602cb5e5e3f7af294929aea68a7f696dbf371c7df147` | 936 / 2000 | 0.190000 × 0.327000 × 0.550000 |
| `repair-cell.glb` | 38356 | `c8951bc2f38db11f621ec2d56c021347cac668dac676510d1f8f8daf8e595484` | 308 / 600 | 0.360000 × 0.400000 × 0.360000 |
| `arena-wall.glb` | 101652 | `67f25e3112592200ed462f7c11a3de810572ed7dc48d4f02783900c9f0885767` | 836 / 2000 | 4.000000 × 5.000000 × 0.350000 |

Total supplied artwork: **691300 bytes, 5692 triangles, 6 files**. All six are
present in the local model directory and the tracked `91adf55` inventory.
The auditor compares each file to its own delivery revision; the five earlier
models remain byte-identical. No artwork was fabricated or downloaded by this
audit, and no runtime asset fetching was added here.

All six supplied assets independently meet the same structural properties:

- Binary glTF 2.0, exactly JSON and BIN chunks; one embedded buffer with bounded
  views/accessors, no buffer/image URI or other external resource reference.
- One scene, one identity-transform node, one joined static mesh, one primitive,
  one material per file (within the at-most-two-material limit).
- Non-indexed TRIANGLES, finite float32 POSITION/NORMAL/COLOR_0 values, matching
  vertex counts, unit normals, varying RGBA vertex colors with opaque alpha.
  Accessor position bounds match actual vertex data; all transforms are applied
  in the sense that the exported node transform is identity.
- No textures, images, samplers, rig/skins/joints/weights, morph targets,
  animations, Draco, KTX, meshopt, used extensions or required extensions.
- Opaque matte material, metallic factor 0, roughness 0.86; no baked texture
  lighting. This structural audit does not certify artistic quality or origin.

For integration, load each local GLB once and reuse its static geometry and
materials across visual instances. Leave collisions, movement and scoring
independent of artwork. Repeated walkers can also serve as teammate silhouettes;
no seventh model is required. Actual runtime sharing, placement, tinting,
browser visuals and gameplay integration belong to the separate `script.js`
worker, not this audit. No claims of measured device FPS/draw-call targets.

## Pinned official three.js r160 example modules

Project: [three.js](https://github.com/mrdoob/three.js), by the three.js authors.
Revision: **`d04539a76736ff500cae883d6a38b3dd8643c548`** (r160, matching the
existing `three.module.js`). Official pinned download URLs:

- <https://raw.githubusercontent.com/mrdoob/three.js/d04539a76736ff500cae883d6a38b3dd8643c548/examples/jsm/loaders/GLTFLoader.js>
- <https://raw.githubusercontent.com/mrdoob/three.js/d04539a76736ff500cae883d6a38b3dd8643c548/examples/jsm/utils/BufferGeometryUtils.js>

| Module | Upstream bytes | Upstream SHA-256 | Git blob SHA-1 computed from downloaded bytes |
| --- | ---: | --- | --- |
| `GLTFLoader.js` | 108522 | `d073b438e6a07e1359741dd5d6c76c953420cc0d4fd84eb1bdde94315540e6a3` | `440ecb714846d41bcce840bec05eb9dcb5513793` |
| `BufferGeometryUtils.js` | 31906 | `9be041e96308775d00e2695cc607645b9a9b64fd7c0e759dd8f7c00a8d92becb` | `087878da3e5f593f586ea421da522fc0a8244c85` |

| Local path under `Games/Circuit Ward/vendor/` | Bytes | Modified SHA-256 |
| --- | ---: | --- |
| `GLTFLoader.js` | 108527 | `1f9b02acfbf219a6ebb77f09e355500449a3ba9e6a77d87e0de72c0b9315ea4e` |
| `BufferGeometryUtils.js` | 31918 | `3a6701d824adfe05dc28c09b6c1d64aeab9a183bc3b944d85f15f596e5c6c2b3` |

Only modifications: in both modules replace `from 'three'` with
`from './three.module.js'`; in GLTFLoader replace
`from '../utils/BufferGeometryUtils.js'` with
`from './BufferGeometryUtils.js'`. No other source changes or removed notices.
These upstream example files have no file-level MIT header; the existing full
MIT notice in `vendor/LICENSE` remains unmodified: copyright 2010-2023 three.js
authors, including permission and warranty terms. Existing license bytes 1081,
SHA-256 `852e0e8699169bf9f6fdc6bda3e682d078dcbc738b5d33e74df594721bff271d`.

Recursive static import trace:

```text
GLTFLoader.js -> ./three.module.js, ./BufferGeometryUtils.js
BufferGeometryUtils.js -> ./three.module.js
three.module.js -> no imports
```

All three resolve locally. No dynamic imports, CDN import, additional utility,
decoder, runtime third-party dependency, clone, build tool, or package install
was added. HTTP(S) strings in the loader are specification links and example
comments, not hardcoded runtime requests. Stock loader/core APIs can load
caller-supplied URLs and support optional externally supplied decoders; those
APIs are unchanged, not a sandbox. The audited GLBs have no resources or
extensions that activate these paths. Callers must only supply local assets;
never configure Draco/KTX/meshopt loaders for this delivery.

## Runnable verification and limitations

Worker environment verified as `PI_PROVIDER=openai-codex`,
`PI_MODEL=gpt-6.1-sol`. Commands run from repository root:

```sh
python3 scripts/test_circuit_ward_models.py
node --check 'Games/Circuit Ward/vendor/GLTFLoader.js'
node --check 'Games/Circuit Ward/vendor/BufferGeometryUtils.js'
git diff --check
df -h / | tail -1
```

The stdlib assert auditor checks the constraints above, decoded triangles and
bounds, per-asset byte identity against `bc57a17` (first five) or `91adf55`
(wall), pinned local library/license hashes, and the recursive local static
import closure. It requires the local GLB inventory to match exactly the six
listed files and totals the observed bytes and triangles. It intentionally
accepts only this static float32, non-indexed delivery subset, not all legal
glTF layouts. Run without `python -O`.

Actual audit output (2026-10-01, after wall delivery):

```text
GLTFLoader.js static imports: ['./three.module.js', './BufferGeometryUtils.js']
BufferGeometryUtils.js static imports: ['./three.module.js']
three.module.js static imports: []
local static import closure + vendor/license hashes: PASS
cover-console.glb: bytes=100740 sha256=c5584de91a719fb630f5b2d2ab9d888da74bd2e440086025426fb2e31ca6196a triangles=828/2000 dimensionsXYZ=2.400000x1.050000x1.200000m mesh=1 materials=1 static vertex-colors normals transforms=identity PASS
sentry-walker.glb: bytes=189064 sha256=5809078aa1fed84a7cffc19491fe1f6f4466825ae83ae8c42c42cd008e768cf5 triangles=1564/2500 dimensionsXYZ=1.300000x1.950000x0.850000m mesh=1 materials=1 static vertex-colors normals transforms=identity PASS
buzzer-drone.glb: bytes=147768 sha256=e266d70934e10ba093aca148e3db65a7435ab12ece4255187beee6cccc7f1dee triangles=1220/1500 dimensionsXYZ=1.500000x0.400000x0.800000m mesh=1 materials=1 static vertex-colors normals transforms=identity PASS
coil-blaster.glb: bytes=113720 sha256=2ac188eeb484fb78b2b0602cb5e5e3f7af294929aea68a7f696dbf371c7df147 triangles=936/2000 dimensionsXYZ=0.190000x0.327000x0.550000m mesh=1 materials=1 static vertex-colors normals transforms=identity PASS
repair-cell.glb: bytes=38356 sha256=c8951bc2f38db11f621ec2d56c021347cac668dac676510d1f8f8daf8e595484 triangles=308/600 dimensionsXYZ=0.360000x0.400000x0.360000m mesh=1 materials=1 static vertex-colors normals transforms=identity PASS
arena-wall.glb: bytes=101652 sha256=67f25e3112592200ed462f7c11a3de810572ed7dc48d4f02783900c9f0885767 triangles=836/2000 dimensionsXYZ=4.000000x5.000000x0.350000m mesh=1 materials=1 static vertex-colors normals transforms=identity PASS
supplied GLBs: 6/6 structural PASS; bytes=691300 triangles=5692; redistribution terms still pending
```

Both `node --check` commands exited 0 with no output. An additional in-memory
Node ESM check imported all three local modules through data URLs (no on-disk
rewrites), blocked fetch/XMLHttpRequest/WebSocket, and parsed each embedded GLB
with `GLTFLoader.parseAsync`. It asserted one mesh, matching triangle count,
normal/color attributes, material vertex colors and no animations. Actual output:

```text
cover-console: GLTFLoader parse PASS; meshes=1; triangles=828
sentry-walker: GLTFLoader parse PASS; meshes=1; triangles=1564
buzzer-drone: GLTFLoader parse PASS; meshes=1; triangles=1220
coil-blaster: GLTFLoader parse PASS; meshes=1; triangles=936
repair-cell: GLTFLoader parse PASS; meshes=1; triangles=308
arena-wall: GLTFLoader parse PASS; meshes=1; triangles=836
6/6 GLTFLoader parses PASS; network requests=0 (Node, not browser/WebGL)
```

### Historical milestone and current scope

On 2026-10-01, the earlier five-model dependency audit (`50ff282`) created only
two small loader modules, this note and the auditor. Its inventory was
**589648 bytes, 4856 triangles, 5 files**, and the wall was not yet delivered.
Loader bytes added then: **140445**. The subsequent `91adf55` wall delivery
completes all six requested source models; the current six-model results above
supersede that earlier delivery status, not its historical evidence.

This follow-up modifies only `scripts/test_circuit_ward_models.py` and this
note. Vendor/license hash checks pass unchanged; no model bytes, runtime code,
or dependency files were modified. Disk checks before and after this audit
reported **2.5G available** (above the 2GB stop threshold). No new games were
registered, no captures or other artifacts created, and growth stays below the
operator's 30MB workspace/artifact cap. Runtime visual integration belongs to
the `script.js` worker; `scripts/test_circuit_ward.py` is orchestrator-owned.
No browser screenshots, full-game smoke gate, multiplayer verification or
release gate is claimed by this bounded dependency/model audit. Full
registered-game browser smoke and pending rights confirmation remain release
blockers; no push.
