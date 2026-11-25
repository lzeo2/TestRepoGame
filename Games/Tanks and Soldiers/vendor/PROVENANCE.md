# Vendored engine provenance

Only `three.module.js`, `three.core.js`, and `THREE-LICENSE.txt` were copied verbatim from the already locally vendored `TestRepoGame-citisten/Games/Citisten3D/vendor` engine directory. Both JavaScript files identify the Three.js authors and MIT SPDX license. `three.core.js` reports revision **186**. The complete reviewed MIT license is retained alongside them.

This is engine reuse, not a copy of that game's code or assets. No game-specific files, loaders, models or textures were copied from that game. No new download/install was performed. Original gameplay code and procedural fallback blockouts in `src/` are new to this isolated prototype.

For the private delivered-model increment, `addons/loaders/GLTFLoader.js`, `addons/utils/BufferGeometryUtils.js`, and `addons/utils/SkeletonUtils.js` were copied from the existing local `three-0.186.0/package/examples/jsm` cache. Their only changes are runtime `from 'three'` imports patched to `from '../../three.module.js'`; relative addon imports are preserved. They match the r186 engine and are covered by the retained Three.js MIT license. No decoder packages are required by the selected GLBs. Model provenance/rights are separate: see `assets/models/README.md` and `docs/delivered-model-integration.md`. The bundled asset controller was not used.
