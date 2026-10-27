<!-- maintenance-game: Games/BrainrotBoulevard -->
# Brainrot Boulevard maintenance baseline

## Identity and status

Existing catalog id1, **Brainrot Boulevard: After Dark**, entry
`Games/BrainrotBoulevard/index.html`. This missing manual is added only to repair
maintenance coverage during the authorized Foldwild release. No Brainrot runtime,
registration, asset or native acceptance is changed. Source reference: fresh
`origin/main` at `76518f9d`, tree `695a328f7ba3be840a8a6881551e679ae39dbb02`,
19 files/13,849,149 bytes. Existing README claims are not new verification.

## Implementation map

Entry loads `style.css` and `src/main.js`. Main imports local three.js,
RoomEnvironment, `characters.js`, `secret-character.js` and `rules.js`.
`character-surfaces.js` supplies shared generated materials. Main owns scene,
input, AI, carrying/combat, menus, HUD and the animation loop. Rules owns economy,
progression and save projection. Inspection here covered the entry, README,
license, complete rules/secret-loader modules and selected main input/storage/loop
boundaries. Full main, CSS, character geometry, vendor and binary audit is not claimed.

## Gameplay and controls

Existing buy/steal/defend solo loop with AI rivals, upgrades, collection and
rebirth. Entry exposes WASD/arrows movement, drag camera, E interaction, Space
bat, L lock, U upgrades, C collection, Q drop and Escape pause. Touch joystick
and action buttons are authored. Play is initially disabled during asset loading.
Rules requires three distinct original discoveries and a free slot before the
separate ninth shrine collectible; it is not a random conveyor purchase.

## State and persistence

Main uses localStorage key `brainrot-boulevard-v1`; `save` serializes through
rules and warns when storage throws. Version1 rules restore recognized bounded
fields, deduplicate owned IDs and discoveries and sanitize malformed input rather
than promising corrupt-byte preservation. Player money, owned crew, discoveries,
upgrades and counters persist; renderer/transient combat state is not serialized.
Main saves on blur/hidden/unload paths. Do not substitute this contract for
Foldwild's different strict save boundary.

## Dependencies and provenance

All listed runtime imports and the secret GLB path are local. Existing `LICENSE`
is MIT, copyright Brainrot Boulevard contributors; vendor notice covers three.js.
README asserts original procedural artwork, but this coverage repair does not
independently verify authorship or asset redistribution rights. The supplied
`assets/secret-cave-creature.glb` is 6,384,292 bytes; preserve its bytes/notices.
The preview lineup is described as an offline asset render, not native play proof.

## Audit findings

No current browser/device/gameplay pass is established here. README refers to
npm scripts, tests, Blender art and tools absent from this 19-file tracked tree;
do not invent them or install tooling to satisfy those instructions. Native
input, full loop, storage restrictions, context loss, target-device memory and
rights remain unverified by this baseline repair.

## Safe iteration

Trace main callers before changing rules or transport; retain clone/shared-resource
ownership in the secret loader and character helpers. Do not dispose cached shared
geometry/materials per clone. Do not add backend/multiplayer or replace art under
this documentation-only authorization. Preserve storage identity and local imports.

## Verification

Catalog/path/tree/size values derive from tracked main, not a backup or unfinished
feature branch. The maintenance checker validates this page's identity/nine
sections only, not gameplay or documentation completeness. No Brainrot test,
browser, screenshot, asset conversion, runtime patch or native acceptance was run
or claimed for the Foldwild release.

## Future outlook

A separately scoped owner should audit the complete authored source, reconcile
upstream run/test instructions with tracked files and collect normal-input/device
and provenance evidence. This is not authorization for automatic expansion.
