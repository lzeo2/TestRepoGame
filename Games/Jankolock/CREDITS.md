# JANKOLOCK credits and provenance

Original shipping-office arena skirmish commissioned by the operator. Runtime
code, roster, item descriptions, Canvas drawing and synthesized audio were
authored for this project; no upstream game implementation or Valve assets
were ingested. This is a genre translation, not an official port, affiliation
or endorsement. Authoring/identity evidence: `../../docs/jankolock-provenance.md`.
No blanket third-party rights or trademark-clearance claim is made.

## Supplied portrait

`assets/portrait_relief.glb` was generated from the operator's photo by the
in-house photo3d pipeline on 2026-10-20 and explicitly supplied/requested for
this game's trophy lobby. Preserved byte-for-byte, not decimated or used as
combat geometry. SHA-256:
`abe1b2ee07038d6926813542a2127bca06cb19564f535dd49c593ea60c199fc9`.
10,972,672 bytes; 421,968 triangles. Exact structural receipt:
`assets/portrait-receipt.json`. The supplier reports photorealistic quality
FAIL: this is an approximate photo-colored bas-relief, not a complete head scan.
Operator-supplied permission is not an independently adjudicated likeness-rights
opinion or a grant of the library's MIT license to the portrait.

## Local library and fonts

The lobby read-copies three.js r160 core, GLTFLoader and BufferGeometryUtils
from the existing Circuit Ward vendor tree, including its full MIT notice at
`vendor/LICENSE`. Upstream: https://github.com/mrdoob/three.js ; pinned revision
`d04539a76736ff500cae883d6a38b3dd8643c548`. Four donor files total 1,414,498
bytes and remain byte-identical; only local relative imports, no CDN.
Donor provenance: `../../docs/circuit-ward-sources.md`.

Bungee and Atkinson Hyperlegible are existing repository-local fonts under
`../../assets/fonts/`, covered by their retained OFL notices and the separate
`../../docs/portal-font-sources.md` receipt. They are shared dependencies, not
embedded in this game's folder. No font or other runtime resource is remote.
