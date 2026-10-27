# Trio base models: gameplay integration

Scope follows `5d11a7cc` (Ribbon) and `fc116792` (trio delivery). No new game,
ID, model, dependency or archive extraction. The operator reports that
`doc_e10017cf305c_Jankolock_Trio_Base_Models (1).zip` is byte-identical to
`doc_abbe503244db_Jankolock_Trio_Base_Models (1).zip`; this task uses only the
already committed assets, not an independent archive comparison. All twelve
original trio files (GLB/manifest/palette/rig) remain byte-identical to `fc116792`.
Authorship/originality are supplier-declared, not independently proven. No
Blender or source reconstruction was performed.

## Presence and loader

| Model | Bytes | Triangles | Drawables | Rigid controls | Embedded PNGs |
| --- | ---: | ---: | ---: | ---: | ---: |
| Spoollash | 3,102,828 | 19,448 | 50 | 28 | 18 |
| Checkmate Regent | 4,213,784 | 18,148 | 56 | 22 | 18 |
| Prism Warden | 2,847,116 | 18,454 | 60 | 18 | 24 |

The existing `character-assets.mjs` loader now admits these three IDs and their
simpler delivery manifest schema. New per-model `receipt.json` files pin measured
bytes/SHA/counts and hashes of unchanged manifest/palette/rig sidecars. Validation
retains local-only buffers/images, PNG resources, exact triangle counts, units,
axes, complete semantic palette indices and actual hierarchy/pivot checks.
Supplied basecolor/ORM/normal maps stay intact rather than receiving procedural
replacement textures; clone geometry/materials remain isolated. Cache/clone
teardown releases shared textures once. The original manifests' descriptions
and `gameplay_implemented:false` describe the supplied base asset, not the current
game entry, and are intentionally preserved as delivery evidence.

`hero-model.mjs` uses authored rest-relative limits for walk, aim, dash, slide,
jump, fall and recoil. Whip flex, cape panels and tripod/tool articulation are
cosmetic; no mesh-derived hitboxes, IK, foot planting, cloth or whip physics.
Spoollash stays native scale (body below 1.8m, cosmetic lash reaches 3.146m).
Regent .7175 and Warden .6823 scales bring their crowns to approximately 1.8m.
Cosmetic emitters follow grip/sceptre/projector nodes; damage still uses the
existing covered controller-origin ray. The standard grounded capsule and 1.8m
target volumes do not expand to include the lash, crown, guard or tripod pads.

## Selection and implemented kits

`game.mjs` preloads the trio and merges `docs/jank3d-trio-kits.json` after the
unchanged original and Ribbon definitions. Ribbon's dynamic accessible-card UI
creates eight cards. Selection disposes the old runtime, constructs the selected
GLB/kit and start configures that kit in systems. Selection locks during play.
Existing five-bot lineup remains the original kits; this does not add trio AI.

| Hero | HP | Weapon cadence / range | Native four-slot abilities |
| --- | ---: | --- | --- |
| Spoollash | 580 | 19 / .28s, 22m, 16 rounds, 1.5s reload | Snagline: damaging 35% tether slow, 2s/16m; Reel In: collision-resolved **self** hook, not enemy pull; Crosscut: instant covered cone; Free Spool: 35% speed for 2.4s, no invulnerability |
| Checkmate Regent | 660 | 28 / .42s, 32m, 10 rounds, 1.7s reload | Rank Guard: solid existing filing wall for 4s; Royal Decree: covered 5m damage/slow; Rook Line: 40m precision hitscan; Castle Guard: 1.2s invulnerability and 15% speed |
| Prism Warden | 500 | 40 / .6s, 60m, 8 rounds, 1.8s reload | Sightline: 72m precision hitscan; Optic Census: live 40m through-cover reveal for 3s; Fine Focus: 2.2x headshots for 4s; Prism Charge: bouncing 1.6s fuse, covered 4m blast |

All have existing weapon/melee/reload/parry and movement controls. Authority,
armor, shop scaling and status expiry remain in systems. Baseline weapon cadence
is approximately 67 damage/s before armor/reloads, below the original kits'
72-83 damage/s. HP/ranges/magazines/cooldowns trade short-range mobility, brief
defense and lower-health precision against one another; this is a provisional
budget, not proven human-match balance. Exact damage, cooldowns and scaling are
in the kit JSON. No new effect schema, homing/projectile primary, whip contacts,
chess-piece summons, reflection, refraction, flight or proposal-parity claim.
Existing generic ability FX are reused, not newly authored character animations.

## Verification boundaries

Run `node Games/Jankolock3D/heroes/trio-test.mjs` from the repository root.
It separately reports:

1. **Assets/loader:** three independent SHA/byte pins, sidecar hashes, real GLTF
   parsing, finite geometry/indices/UVs, 60 actual PNG stream inflations <=512px,
   PBR preservation, clone isolation, 630 bounded poses/rest restoration/sockets.
   Bitmap creation/upload is mocked; PNG checks are not browser image decoding.
2. **CPU playable behavior:** real HeroRuntime/controller/systems with all three
   kits, weapon damage, melee, reload, cooldowns, cover and normal wall collision;
   all 12 effective ability casts, linked slow break, self-hook movement, solid
   deployed wall, speed/invulnerability, reveal, enhanced headshot and real
   bouncing/fused blast damage. Expiry/reset/disposal are exercised. This is an
   isolated API-driven scene, not a completed match or native input.
3. **Selection VM:** executes the actual dynamic eight-card generation/click/start
   callbacks and game select/start bodies with real runtimes/systems. Each trio
   starts its own configured kit, disposes replaced art and locks selection once
   playing. DOM nodes and bot startup are mocked, so no native lobby claim.

Ribbon's own regression and the unchanged original hero/runtime/rig/controller,
bot, combat-input, asset importer and UI checks also pass. Systems passes all 18
regression groups plus its 600-second script using supported `--no-evidence`;
its default mode stops at the existing 2,178,940,928-byte evidence-write guard.
The unchanged integration suite completes both chains/orb/portrait checks, then
fails the pre-existing hardcoded catalog assertion `129 !== 127`. Global
maintenance inventory is already stale outside this game's row; no unrelated
refresh or check weakening is included. The game's row alone is reconciled to
the inspected source tree.

No browser, screenshots, install, asset copy, full-fleet smoke or push. Native
selection/input, actual GPU rendering/PBR appearance, pose clearances, supported
hardware, full-match balance and performance remain unverified. Prior rendered
receipts remain historical and do not certify the trio. The runtime eagerly
preloads an additional 10,163,728 existing asset bytes; startup/texture-memory
cost is not benchmarked.
