# Circuit Ward source evidence

## Original game, not an upstream game port

Circuit Ward (approved catalog id 222) is an original self-made game under the
one-run operator exception dated 2026-10-01, ticket
`pi-912882-1790827041648`. Commit `b15c1c0` records that exception in
`AGENTS.md`. The game implementation is separate from the third-party rendering
library below; three.js authors are not being credited as Circuit Ward's authors.
The primitive game was built in `0a9a6b9`, with native transport in `14ce629`
and QA/pairing/pause corrections in `77dbd71`. The catalog registration and
release limitations are recorded in [circuit-ward-qa.md](circuit-ward-qa.md).
Game code and primitive geometry are original; this is not a claimed upstream
port. The one-run exception does not authorize additional original games.

At the historical primitive/library milestone `e02d5d8`, no generated models or
GLTFLoader had been supplied. The current build includes **six operator-supplied
Dot-generated GLBs**: first five in `bc57a17`, wall in `91adf55`; pooled integration
in `6e71fa4` and `b0e19ae`, completed browser regression in `63b150a`. Total artwork:
**691300 bytes, 5692 triangles**. No sample models, external textures or fabricated
replacement assets were added. The pinned local r160 GLTFLoader and
BufferGeometryUtils were added in `50ff282`, with only local import-path changes;
see [circuit-ward-models.md](circuit-ward-models.md) for exact inventory, hashes,
structural audit and loader provenance.

The operator explicitly supplied the six models and authorized publication of
current work in this repository/site. This is scoped publication permission,
not verification of provider identity, broader redistribution terms or embedded
CC0 claims. Embedded generator/creator/license assertions remain unverified.
The library's MIT license covers the library, not the game's code or artwork.
Future model/art additions require their own source and permission evidence;
the planned vehicle amendment is not supplied or implemented in this green build.

## Vendored rendering library

- Project: three.js, by the three.js authors.
- Official repository: <https://github.com/mrdoob/three.js>.
- Official tag: <https://github.com/mrdoob/three.js/tree/r160>.
- Annotated tag object: `643680ed5fc73ba27e32a6529d59cae8c8b3825c`.
- Peeled commit: `d04539a76736ff500cae883d6a38b3dd8643c548`.
- Resolution: `git ls-remote https://github.com/mrdoob/three.js.git refs/tags/r160 'refs/tags/r160^{}'`.
- Local modifications: none; both downloaded files match official Git blobs
  reported by the GitHub Git Trees API at that commit.
- License: MIT, with `Copyright © 2010-2023 three.js authors`.
  The complete notice and permission/warranty terms are retained unmodified in
  `Games/Circuit Ward/vendor/LICENSE`; the module's upstream license header is
  also retained.

Official pinned download URLs:

- <https://raw.githubusercontent.com/mrdoob/three.js/d04539a76736ff500cae883d6a38b3dd8643c548/build/three.module.js>
- <https://raw.githubusercontent.com/mrdoob/three.js/d04539a76736ff500cae883d6a38b3dd8643c548/LICENSE>

| Local path | Bytes | SHA-256 | Official Git blob SHA-1 |
| --- | ---: | --- | --- |
| `Games/Circuit Ward/vendor/three.module.js` | 1,272,972 | `76dea8151bc9352aef3528b4262e249b2604f62543828328db978d060d61a495` | `0bcc7a286da2c115853ceec9deea19923e10ddc1` |
| `Games/Circuit Ward/vendor/LICENSE` | 1,081 | `852e0e8699169bf9f6fdc6bda3e682d078dcbc738b5d33e74df594721bff271d` | `d07e209686512b9ac93d7df5481a4a6f622093e7` |

Core module and license total: **1,274,053 bytes** at `e02d5d8`. The later local
loader/helper add **140445 bytes**; total library files are **1414498 bytes**.
No clone, package installation, source map or external runtime dependency was
added. The library and supplied GLBs are distinct provenance inventories.

## Runtime network review

The module has no external imports or hardcoded third-party request endpoints.
HTTP(S) strings are reference comments, diagnostic text, or the XHTML namespace
used by `document.createElementNS`, not remote assets loaded on import.
`FileLoader.load` and `ImageBitmapLoader.load` can fetch caller-supplied URLs;
`ImageLoader.load` assigns a caller-supplied URL to an image. These generic APIs
are retained unmodified and must only receive local/data assets from the game.
Importing the module and constructing a primitive scene made zero network calls
in the blocked-network Node check below. This is not a browser/WebGL or full-game
offline verification.

## Runnable dependency checks

Run from the repository root:

```sh
node --check 'Games/Circuit Ward/vendor/three.module.js'
printf '%s\n' \
  '76dea8151bc9352aef3528b4262e249b2604f62543828328db978d060d61a495  Games/Circuit Ward/vendor/three.module.js' \
  '852e0e8699169bf9f6fdc6bda3e682d078dcbc738b5d33e74df594721bff271d  Games/Circuit Ward/vendor/LICENSE' \
  | sha256sum --check
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
let requests = 0;
const blocked = () => { requests++; throw new Error('Unexpected network request'); };
globalThis.fetch = blocked;
globalThis.XMLHttpRequest = blocked;
globalThis.WebSocket = blocked;
const source = readFileSync('Games/Circuit Ward/vendor/three.module.js', 'utf8');
const THREE = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
assert.equal(THREE.REVISION, '160');
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({color: 0xffffff});
const scene = new THREE.Scene();
scene.add(new THREE.Mesh(geometry, material));
assert.equal(scene.children.length, 1);
geometry.dispose();
material.dispose();
assert.equal(requests, 0);
console.log('module import + primitive scene: PASS; revision=160; network requests=0');
JS
git diff --check
git diff --cached --check
```

Worker #4 ran the syntax, checksum, Git-blob identity, primitive-scene, and diff
checks on 2026-10-01 using `openai-codex / gpt-6.1-sol`. Actual check output:

```text
node --check: PASS
Games/Circuit Ward/vendor/three.module.js: OK
Games/Circuit Ward/vendor/LICENSE: OK
three.module.js: official Git blob 0bcc7a286da2c115853ceec9deea19923e10ddc1 (1272972 bytes): MATCH
LICENSE: official Git blob d07e209686512b9ac93d7df5481a4a6f622093e7 (1081 bytes): MATCH
module import + primitive scene: PASS; revision=160; network requests=0
```

`git diff --check` returned zero before staging. The stock staged diff check
returned exit 2 for one existing upstream indentation defect:

```text
Games/Circuit Ward/vendor/three.module.js:46517: space before tab in indent.
```

The source line contains a tab after spaces. It is retained to keep the module
byte-identical to the pinned official
build. This is an explicit formatting warning, not a clean full diff gate.
The source-evidence document and license pass their scoped diff check.

These checks describe dependency worker #4's historical milestone (`e02d5d8`),
not the later game integration. The completed six-model browser regression at
`63b150a` and unchanged **121/121** full-game gate at `3557812` are documented in
[circuit-ward-qa.md](circuit-ward-qa.md), along with historical failures and
measurement limits. Current work is approved and release criteria are green;
actual push and remote verification remain pending. No release is claimed here.
The game also reuses the repository's locally vendored Bungee and Atkinson fonts;
see [portal-font-sources.md](portal-font-sources.md) for their OFL provenance.
No push was performed.
