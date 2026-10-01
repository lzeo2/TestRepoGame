# Circuit Ward: approval proposal

Status: concept only, awaiting the operator's direct approval. Catalog id 222
is free. No game implementation, dependency vendoring or registration yet.
This is the proposed one-run self-made exception, not ingested content.

## Art

Four rendered static illustrations, not gameplay screenshots, are available
in the external `shooter-concepts` artwork workspace:

1. `01-start.png`: bay, weapon silhouette, start screen and controls.
2. `02-combat.png`: walker/drone silhouettes, pulse shot, shield/wave/score HUD.
3. `03-touch.png`: 390×844 portrait, left movement pad, right aim area,
   separate 100×56 Fire and 96×48 Pause controls.
4. `04-result.png`: failure score, wave reached, retry and menu.

Steel-blue maintenance bay; amber/cream robots; faceted, matte surfaces.
Local Bungee/Atkinson type, solid high-contrast panels, 6px panels and 4px
buttons. No gore, recognizable franchise assets, gradients or glow effects.
These illustrations demonstrate direction, not measured runtime performance.

## One small shooter

A first-person arena shooter, not a runner. Six escalating waves of
malfunctioning training bots in one compact bay. Strafe around four cover
consoles, aim and fire an unlimited-ammo coil blaster, collect repair cells,
and score for disabling bots. Walkers pursue; drones approach from above.
Clear wave six to win; shield depletion ends the run. Retry resets everything.

- WASD/arrows move; mouse aims; click fires.
- IJKL aims and Space fires for a full keyboard alternative.
- Esc/P pauses and releases pointer lock; resume needs an intentional click.
- Touch: left pad moves, right drag aims, separate held Fire button.
- Native focusable Start, Pause, Resume, Retry and Menu controls; 44px minimum.
  Pause on hidden tab or lost focus; a plain WebGL-unavailable message.

## Performance and scope

Locally vendored three.js r160 (MIT, pinned source revision before ingestion),
which still supports WebGL1. No WebGL2-only features, physics engine, framework,
postprocessing, dynamic shadows, CDN, telemetry or runtime third-party fetch.
Shared primitive geometry/materials and instancing for repeated parts first.

Targets, not benchmark claims: 60fps on school Chromebooks, 24 active enemies,
under 80 draw calls / 120k visible triangles, DPR capped at 1 and render size
capped at 1280×720. Start with one hemisphere and one directional light and
untextured materials. Profile before claiming the device target is met.
Models are optional visual replacements, not prerequisites or collision data.

Proposed files: `Games/Circuit Ward/{index.html,style.css,script.js}`,
`vendor/{three.module.js,LICENSE}`, source/QA notes in `docs/`, one small
browser regression under `scripts/`, and one catalog entry (222).
Only add a matching local GLTFLoader and its required local utility when
actual models are supplied. No empty asset scaffolding or general loader API.
No multiplayer, procedural maps, inventory, weapon tree or extra modes.

## Model wishlist for Dot

Six exact deliveries under `Games/Circuit Ward/models/`, after approval:

| File | Mesh and dimensions | Triangle ceiling |
| --- | --- | --- |
| `arena-wall.glb` | Repeatable 4m wide × 5m high × 0.35m deep steel wall panel; inset seams, base rail, simple top beam | 2,000 |
| `cover-console.glb` | 2.4m wide × 1.05m high × 1.2m deep low cover console; chamfered corners and cream end brackets | 2,000 |
| `sentry-walker.glb` | 1.95m tall, 1.3m wide orange/cream two-legged service bot; dark visor, broad readable torso, block feet | 2,500 |
| `buzzer-drone.glb` | 1.5m wide × 0.4m high hovering service drone; compact cream core, two amber ducted rotors, dark underside | 1,500 |
| `coil-blaster.glb` | 0.55m long non-realistic energy emitter; cream/blue faceted casing, amber coil strip, rectangular muzzle; no hands | 2,000 |
| `repair-cell.glb` | 0.4m tall × 0.36m diameter faceted blue/cream repair canister with a cream cross-shaped panel | 600 |

Delivery constraints: original low-poly art matching the concept colors;
GLB (binary glTF 2.0), one joined static mesh per file, at most two materials,
prefer vertex colors. Matte/non-metallic, no transparency, textures, baked
lighting, rig, animations, external buffers, Draco/KTX decoders or required
extensions. Include normals; apply transforms; meters, Y-up, front/muzzle -Z.
Origin centered on the floor footprint (drone centered on its body; weapon
at grip). Robot limbs can be static; whole-body bobbing is sufficient.
Provide a small provenance/usage-permission note with the generated assets.

Use primitives if models are delayed. Keep movement, hit volumes and scoring
independent of art; replace only the corresponding visual geometry once
models arrive. Respect the operator's 30MB workspace growth/capture cap.

## Gate

Ask the operator to approve this exact name, core loop, controls, rendered
art and six-model wishlist before any game coding. Generic acknowledgment or
a timeout is not approval. After approval, record the dated id-222 exception
in `AGENTS.md`, expiring at the end of this run; all other additions remain
port-only. Portal commit `91317b3` is complete and local only. Full registered-
game smoke QA and separate operator permission remain required before push.
