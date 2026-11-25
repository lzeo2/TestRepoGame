# Tanks and Soldiers (248) - original combined-arms preview

Registered portal entry `Games/Tanks and Soldiers/index.html`, catalog id 248,
category simulation, unfeatured. Copied from the owner-authorized staging
prototype `~/tanks-and-soldiers` at staging commit `7b02ddc` (GLB model
integration). This is a registration of the existing owner-ordered original
game, not a new ingestion.

## Source and provenance

- Original game code authored for the owner's explicit combined-arms order
  (quiz/grill, model wishlist, then implementation; staging brief preserved in
  the owner's Hermes notes).
- Engine: locally vendored Three.js r186 (`vendor/three.module.js`,
  `three.core.js`) with its complete MIT license and provenance notes.
- Addons: matching r186 `GLTFLoader`, `BufferGeometryUtils`, `SkeletonUtils`
  with only bare engine imports patched for the local vendor.
- Models: four GLB files (soldier 13 meshes, tank 57, jet 24, boat 32) with
  22-joint soldier skeletons, loaded locally; procedural blockout fallbacks
  remain for scenery and any failed load. No CDN, remote fonts, external
  fetches, sockets or backend.

## Scope and known limits

- Offline single-player vs AI, two fictional factions, three capture posts,
  180-ticket default (45-ticket short option), bounded active simulation on a
  2.1 x 2.4 km coast. Mouse+keyboard and no-capture Touch control modes.
- Delivered-model load is CPU-verified (headers, skeletons, instancing,
  cleanup); rendered appearance on physical GPUs is not verified. The touch
  slice is CPU-suite-verified; actual-device touch admission stays held.
- No saves, no multiplayer, no leaderboard. Restart resets the battle.
- Three delivery lanes (infantry, vehicles, battlefield) plus touch controls
  are the staged source structure preserved in `src/`.

## Verification

- `node --check` over all `src/*.js` passes.
- Staging CPU suites (battlefield, vehicles, infantry, squad, feedback,
  touch, audit, gameplay, simulation, role transitions, player fight) pass in
  staging; staged browser evidence in the staging repo's `docs/` (native
  squad-fight XTest/SwiftShader 50% pass at `20c06b1`, sustained sea/landing/
  capture/end previews) remains the native receipt.
- Portal-targeted smoke: this game's entry loads through the portal iframe
  path. Full-fleet `smoke_test_games.py` runs only on an owner-ordered push
  or release.
- Model integration receipt, engine licenses and provenance notes travel with
  the copied `vendor/` directory; staging receipts stay in staging.
