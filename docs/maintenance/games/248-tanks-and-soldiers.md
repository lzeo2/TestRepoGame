# Tanks and Soldiers (248) - original combined-arms preview

<!-- maintenance-game: Games/Tanks and Soldiers -->

## Identity and status

Registered portal entry `Games/Tanks and Soldiers/index.html`, catalog id 248,
category simulation, ASCII icon TS, unfeatured, one player. This registers the
owner-ordered existing original game from the staging prototype
(`~/tanks-and-soldiers`, staging commit `7b02ddc`); it is a registration of an
existing owner-authorized project, not a new ingestion and not a claim of
finished production quality. The catalog description identifies it as a
preview with delivered GLB models and procedural fallbacks.

## Implementation map

Files: `index.html`, `style.css`, `src/` (core, battlefield, infantry,
vehicles, presentation, input, touch, models, feedback, main), `vendor/`
(Three.js r186 engine, MIT license, provenance note, patched-import GLB
addons), `assets/models/` (four delivered GLBs: soldier, tank, jet, patrol
boat). Staging lane structure preserved (infantry/vehicles/battlefield) with
coordinator-owned entry. The portal copy drops staging-only text; no test
tools, logs or screenshots were copied.

## Gameplay and controls

Offline single-player vs AI on a 2.1 x 2.4 km coast. One embodied soldier
captures three posts (Harbor, Relay, Depot); held posts drain enemy tickets.
Board a tank, jet or patrol ship with E; unsafe moving or airborne exits are
denied. Q orders up to three allied infantry to the nearest unheld post.
Mouse+keyboard capture mode and no-capture Touch mode (independent move/look/
fire pointers) are both offered in the deployment menu. Population presets
(6/12/18 AI), ticket length (180/45) and drawing resolution (100%/50%) are
player choices. Restart resets the battle. No multiplayer, backend or saves.

## State and persistence

All state is local and per-session. No storage, accounts or network beyond
the hosting page. A fresh reload rebuilds the battlefield from the deployment
menu.

## Dependencies and provenance

Engine: locally vendored Three.js r186 (`three.module.js`, `three.core.js`)
with complete MIT license text and provenance notes. Addons (GLTFLoader,
BufferGeometryUtils, SkeletonUtils) are the matching r186 versions with only
bare engine imports patched for this local vendor; engine files are
unchanged. Models: four GLBs delivered for this project (soldier 13 meshes,
tank 57, jet 24, boat 32; independent 22-joint soldier skeletons), loaded
locally with procedural blockout fallbacks for scenery and failed loads.
Authored game code and procedural scenery are original work; no CDN, remote
fonts, external fetches, sockets or install step.

## Audit findings

House UI alignment carried over from staging: flat dark shell, black 4px
buttons, no gradients or neon, text labels, 44px touch targets, reduced
motion default, focusable canvas with aria labels. Known holds that remain
open: rendered appearance on physical GPUs unverified (CPU model-load checks
and a SwiftShader 50% native pass are the evidence so far); the touch slice
is CPU-verified but not actual-device admitted; portal iframe embedding, the
light theme and the Escape/focus lifecycle between portal and game are
integration items, not accepted checks. The catalog description carries no
finished-model or hardware claims.

## Safe iteration

Simulation changes belong in the lane files (infantry, vehicles, battlefield)
with shared contracts in `src/core.js`; presentation changes stay in
`presentation.js`/`touch.js`. Keep `vendor/` pinned to r186. After edits run
`node --check` on touched modules and the targeted suites; do not add
external assets, networked features or backend pieces. Staging remains the
development source of truth for large changes; portal copies move through
reviewed commits with regenerated inventory.

## Verification

- `node --check` passes on all copied `src/*.js`; all HTML references
  resolve locally; catalog validated (unique id 248, schema complete, URL
  resolves to tracked files).
- Staging CPU suites pass (simulation, battlefield, infantry, vehicles,
  squad, feedback, input, touch, gameplay, role transitions, player fight,
  audit, flight); staged native receipt: XTest/SwiftShader 50% run passed on
  staging `20c06b1`, with sustained sea, jet landing, capture and operation
  end previews preserved in staging docs.
- Full-fleet `smoke_test_games.py` runs only on an owner-ordered push or
  release; targeted runs for this game are allowed anytime.

## Future outlook

Open items, not blockers for the preview: rendered appearance on physical
GPUs, actual-device touch admission, supplied audio, long-session balance
and deeper vehicle stations. Registration does not change those holds.
