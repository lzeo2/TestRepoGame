# Ribbon Seraph: optimized supplied original

Operator-authorized import into the existing **3D** Jankolock game, not the 2D
project. Source archive: `doc_68f25c08bc86_Jankolock_ribbon_seraph_Optimized_Complete.zip`,
SHA-256 `8a5ea7e836f12fc37f74893d7bf24ab43cc3b012a5f7766c36b4a4e1af92af8d`.
The existing `manifest.json` is unchanged. It attributes original art and embedded
PBR maps to dot, 2026-10-24, with Astra 6 max collaborators. Authorship and rights
are operator/supplier declarations, not independently proven creation history or
a third-party open-source license. No remote dependency or upstream port is added.

## Custody and actual payload

All 35 ZIP paths were checked for absolute/traversal/backslash/drive/NUL paths,
duplicates, symlinks and encryption before selective reads. Only these exact
archive files were extracted from `jankolock/ribbon-seraph/`:

- `model.glb`: 3,395,656 bytes, SHA-256
  `fd7fdb83aa53d16e4d677360dc78a62c95b000336dede7d4d1d497c69a1fd702`.
- `rig.json`: 17 named rigid controls, parent-local metre pivots, artistic limits.
- `palette.json`: semantic palette; six slots used by the clean variant, one
  FX-only slot intentionally unused.

`receipt.json` is independently generated integrity/validation metadata, not an
artist-supplied gameplay receipt. Actual GLB: 17,888 indexed triangles, 23 glTF
meshes / 36 material primitives (36 three.js drawable meshes), six materials,
18 embedded PNGs at <=512px, no external URI, skin or animation clip. Validation
checks buffer/accessor bounds, finite attributes, normal/UV counts, indices,
PNG signatures/dimensions/CRC/inflation and exact manifest variant hash.

START_HERE claims a duo, but **no Mucilage Monk model is in this archive**. Monk
briefs do not establish asset presence. No Monk file or definition was changed.
No LOD1 is ingested: the current renderer has no character LOD selection, so an
unused distant GLB would add cost without runtime benefit. No FX GLB, Blend,
PDF, render, comparison, tools or duplicate rig alias is published. No Python
script from the archive was executed. The manifest's `files` map describes the
external delivery, not a claim that all listed files are in this public folder.

## Runtime integration versus proposed kit

The shared loader accepts this specific manifest/palette format, verifies all
sidecar hashes and preserves the supplied embedded basecolor/normal/ORM maps.
Materials remain per-instance; immutable textures are shared until asset teardown.
The rigid adapter uses authored wing/core/spool/trail controls within limits.
Uniform runtime scale .73 gives a rest crown height of about 1.8m (source 2.466m).
A cosmetic muzzle at hover-core local `[0,0,-.75]` clears the rest front surface.
Authority still uses the existing covered shoulder ray. Wings/trails are cosmetic:
standard capsule movement and 0.6m-radius/1.8m target volumes are unchanged.
Hover appearance does not enable flight, skinning, cloth, mesh collision or IK.

`game.mjs` preloads the real model and combines the original four kits with
`docs/jank3d-ribbon-seraph-kit.json`. The lobby creates cards from loaded kits,
so selecting this fifth card constructs its actual HeroRuntime; Start configures
that same kit with systems. Original/trio kits and bot lineup are untouched.

The archive's `duo-1.0-proposed` JSON is **not** the engine schema: abilities lack
runtime IDs, melee uses the wrong damage channel, and effect/delivery/windup
objects are not interpreted. Rather than silently importing inert abilities,
this integration supplies an explicit schema-v1 native-engine adaptation:

| Action | Implemented using existing engine | Difference from proposal |
| --- | --- | --- |
| Typebar | 23-damage hitscan, 14 shots, 24m | No moving projectile |
| Selvage Cut | 64-damage frontal melee query | Engine melee damage channel |
| Catchline | 20-damage tether, 30% slow, 14m, 2.4s; cover/range break clears slow | Proposal is zero damage and 17m break; reset uses existing status expiry |
| Carriage Return | 1.45x speed, 2.2s; no invulnerability | Immediate, no windup |
| Carbon Witness | Existing 16m through-cover live reveal, 2s | Not a one-time visible cone sample or shared team visibility policy |
| Full Width | Immediate covered 50-degree cone, one 100-damage hit per enemy | No seven-projectile simulation, windup, two-hit budget or 350 total cast ceiling |

Existing primitive FX remain visible gameplay telegraphs, not the optional
static artist FX. The kit descriptions disclose these actual rules. No new
audio, replicated authority or balance certification is claimed. Full proposed
projectile/reveal parity would require a separate runtime/systems change.

## Checks and limits

Run `node Games/Jankolock3D/heroes/ribbon-seraph-test.mjs`. It loads the real GLB,
validates PNG streams, tests material isolation, 420 bounded poses, scale/muzzle,
real controller collision and systems-accepted weapon/four-ability effects,
cooldowns, cover, slow/speed cleanup, reset and disposal. Bitmap creation is
mocked; this is not browser texture decoding, visible rendering, native selection,
actual keyboard/touch interaction, full-match balance or hardware acceptance.
No browser, screenshots, full-fleet smoke, new game registration or push ran.
