<!-- maintenance-game: Games/Jankolock3D -->
# Jankolock3D maintenance manual

## Identity and status

Operator-authorized original 3D rebuild of existing JANKOLOCK, not an ingested
port or a new catalog registration. ID 240 still points to the older
`Games/Jankolock/index.html`. This directory is an unregistered development
project, with world-team entry `Games/Jankolock3D/world.html`; no canonical
`index.html` is established by the world milestone. Registration and push are
separate gates. No complete playable MOBA is claimed by this manual.

## Implementation map

World source review covered `world-data.mjs`, `traversal.mjs`, `world-scene.mjs`,
`viewer.mjs`, `world.html`, `world.css`, regression/QA/mockup tools and the
independent review. See [WORLD.md](../../../Games/Jankolock3D/WORLD.md) for exact
exports and [WORLD-REVIEW.md](../../../Games/Jankolock3D/WORLD-REVIEW.md) for
independent findings and subsequent grades. Data is a deeply frozen descriptor;
`docs/jank3d-spawns.json` is its exact JSON export. Scene and collision consume
shared positions. The descriptor has 42 structure spawns, three lanes, ramps,
roofs, stations, camps, crates, teleports, vents, sewer and plaza.

Sibling `heroes/` and `systems*` files are owned by other teams. Their presence
in this directory/inventory is not world-team source, integration or acceptance
coverage. Consult their own receipts before maintenance; this manual does not
certify those modules or their combination with the world.

Hero-team source review separately covers `heroes/player-controller.mjs`,
`hero-visuals.mjs`, `hero-runtime.mjs`, the four `devhero-N.html` entries,
`devhero.mjs`/CSS, their three Node regressions and bounded browser runner.
[HEROES.md](../../../Games/Jankolock3D/heroes/HEROES.md) documents exact APIs,
original character provenance, kit JSON, mockups and systems/world boundaries.
The hero ranges demonstrate isolated mechanics, not a complete match. Systems
must adapt long-range damage, healing/statuses and ammo ownership; the generic
systems method must not be wired blindly or replaced by direct health writes.

## Gameplay and controls

This is a first-person/spectator traversal tool, not the intended final
third-person game. WASD moves, arrows/drag looks, Space jumps, E interacts.
Walk off enables spectator height controls with Space/Shift. Flythrough is
bounded to the district and restores position on exit. Touch movement/look and
native action buttons are provided. Ziplines run at 24 m/s versus 8 m/s walking,
770 m station-to-station in a 900 m district. Teleport pair, two rooftop vents,
Staple Tower rope, collectible bell crate, breakable supply crates and a
stamina-draining sunken plaza use the shared traversal state. Structures and
neutral/Mid-Boss markers are geometry, not implemented world-team combat.

## State and persistence

No world save, accounts, sockets, analytics or remote runtime requests. The
caller owns traveler state, collected/broken ID sets and animation time.
`window.jank3dWorldSnapshot()` is read-only observation, not a test setter.
The viewer owns one animation loop; hidden/blur clears input and pagehide or
context loss disposes renderer/listeners/audio. Audio is opt-in, synthesized
locally. No hero or economy state is owned by the world viewer.

Hero ranges own ephemeral controller, ammunition, cooldown and dummy fixture
state; `window.heroSnapshot()` is observational only. No storage or network
backend. Capture mouse enables pointer lock, Escape releases it, RMB aims;
Ctrl sprints, Shift dashes, Space double-jumps, C slides, Q melees, F parries,
1-4 cast, and R reloads. Touch has drag-look plus native held/action controls.
Range counterfire and target respawns are fixtures, not match authority.

## Dependencies and provenance

Local three.js r186 core/module and MIT license are byte-identical to the
operator-staged package; exact hashes and wiki mechanics-reference URLs are in
WORLD.md. Vendor review covers byte closure/imports/license/syntax, not a full
human audit of upstream source. All map geometry and bell audio are original.
The wiki was a mechanics reference, not an asset or redistribution source.
Shared local Bungee/Atkinson retain their existing notices. Exactly two
codex-imagen designs are preserved; `world-mockup.py` performs the
operator-approved deterministic flat-palette transform before UI changes.
No external runtime assets or generated model files were added by this team.

## Audit findings

Earlier independent review held native A, reproduced roof-ramp slab side entry
and the tower's blocked visible opening, and identified skydome/skybox wording.
`bc25ca9` adds rotated-slab capsule collision, matches the tower's three actual
AABBs and uses a solid enclosing skybox. It retains the developer ban on
gradients. The fresh native run completes all three station rides and grounded
arrival walks; follow-up independent grading is in WORLD-REVIEW.md.

Remaining limits: station span is 770 m, not district-edge-to-edge; full native
walking of every lane is not the same as module walking fixtures; roof/sewer,
vent/rope/crate paths have module fixtures but not equivalent exhaustive native
screenshots. Mobile controls occupy substantial viewport area. Both media themes
intentionally share the same dark shell. Software WebGL is not target-hardware
performance acceptance. Full-game B-H and integration remain separate.

## Safe iteration

Trace descriptor consumers in all teams before changing coordinates, IDs or
collision. Tower IDs now end in west/east/top. Keep JSON export equal to current
data and add regressions at shared movement boundaries, not just viewer inputs.
Do not modify immutable vendor bytes to hide upstream whitespace. Preserve
historical failed-run evidence and distinguish it from current receipts. Use
system Chromium, bounded servers and no overlapping browser gates. Check disk
before writes; stage explicit owned paths, never sibling work. Mockup changes
must precede UI implementation and include a labeled runtime comparison.

## Verification

`node Games/Jankolock3D/world-test.mjs`: 491 assertions passed after collision
repairs, including exact spawn JSON equality; these are module fixtures.
Authored module syntax and diff checks passed. The vendor retains one original
space-before-tab warning, documented in WORLD.md.

Fresh command: `TMPDIR=/dev/shm timeout --signal=TERM --kill-after=15s 540s
python3 -B Games/Jankolock3D/world-qa.py --native --port 8941`, exit 0.
`docs/maintenance/audits/jankolock-3d-qa/world-evidence.json` records completed
native traversal, 13 captures, three zip endpoints, three grounded arrival
walks, 29 HTTP 200 responses and zero recorded errors. Images are nonblank;
normal captures are 1280x720, comparison is labeled 2560x752, mobile is genuine
390x720 content padded to 1280x720. The Foldwild reference is its real start
screen served read-only from sparse Git source. Previous interrupted/timeout
runs remain historical failures, not clean passes. No full-fleet gate or push.

Maintenance inventory validation must be repeated after shared source commits;
active sibling source changes can correctly block the checker. Do not stage
or reset them to manufacture a clean result.

Hero checks: `node Games/Jankolock3D/heroes/player-controller-test.mjs` (808
assertions), `hero-visuals-test.mjs` (four characters, sixteen kit FX and seven
movement/weapon FX), and `hero-runtime-test.mjs` (sixteen casts, expiry, cover,
headshots, tether, slide ammo, turret, grenade bounce and healing). These are
module evidence, not E grading. Run `python3 -B Games/Jankolock3D/heroes/hero-qa.py`
for current native observations and images. The script uses system Chromium,
port 8937, four HTTP 200 harness pages and no state grants. Earlier Escape and
lock-entry input failures were repaired; their history is retained in HEROES.md.
The generated design PNGs preceded UI source and have labeled runtime twins.
Mobile is genuinely 390px wide. Independent E grading and world/system assembly,
rotated ramp collision, hardware/performance and full-fleet gates remain held.

## Future outlook

Integrate world, heroes and gameplay through documented APIs, then obtain
fresh independent full-game acceptance. Obtain native traversal coverage of
secondary routes, actual target-device performance and real touch ergonomics.
A complete game, catalog rewrite, publication, third-party dependencies and
push are not authorized by a world-only test result.
