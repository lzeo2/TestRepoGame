# JANKOLOCK integrated page

`index.html` loads `game.mjs`: one world scene, renderer, third-person camera and
animation loop. It attaches the existing hero runtime, trooper/orb layer, systems
simulation and five bots. It does not replace the lane engines or training pages.
Catalog ID 240 now points here; no new game or ID was added. No push authorized.

## State and boundaries

- `world-scene.mjs` now exposes its `scene`, `camera`, `renderCamera()` and
  `syncStructures(structures)`. Structure groups stay dynamic instead of being
  flattened into static instance batches. Dead objectives disappear, the shared
  Patron moves/changes height in phase 2, and redundant side-lane Patrons hide.
  The standalone viewer's existing render API is unchanged.
- `game.mjs` owns input, selection/start, lifecycle, camera, collision resolution,
  one RAF and event presentation. Blur/hidden clears held input; hidden time is
  discarded. Pagehide disposes components. Pause and restart use native dialogs.
  No match save, remote backend, analytics, runtime third-party loads or sockets.
- Runtime controls kit ammunition/cooldowns. Systems controls HP, healing,
  statuses, damage/item/level scaling, objective locks, rewards and match outcome.
  `configureHeroKit` is called once per hero; `applyHeroEffect` consumes validated
  kit intents without a second magazine or fire timer. Remote impacts include
  their real origin. Controller speed reads systems-derived statuses once.
- `shootOrb(id,orb,{kitShot:true})` is restricted to configured heroes whose
  runtime already checks/consumes the shot. The two-argument standalone API keeps
  its own ammo/timer. Both enforce live source, range, match state and one claim.
  The human's covered reticle/muzzle trace includes souls only during weapon fire.
- World ramps are supplied to the repaired hero controller for slab collision,
  top support and camera obstruction. E delegates zip/portal/vent/rope/crate
  interactions to the original traveler. Active item dash requests use capsule
  collision before reconciling the visible hero. Respawn/recall are authorized
  teleports and reconcile immediately when their systems events are drained.
- `bots.mjs`: two Carbon allies (Graft/Greenhedge), three Ivory enemies (one per
  lane), kit aiming/cover checks, cooldown abilities, wave-following lane routes,
  low-health/base-heal retreat, affordable passive item buys and soul shots.
  Linear scans are bounded for this six-hero mode, not a general crowd engine.
- `integration-ui.mjs` reuses the existing shop/resources/active slots, rather
  than maintaining a second economy HUD. Adds minimap structures/hero blips,
  objective status, K/D, runtime ammo, stamina, four ability buttons, hero lobby,
  theme, controls, pause and touch controls. CSS uses local fonts, flat panels,
  black buttons, 4px corners, no gradients/shadows/glow and visible focus.
- `portrait.js` verifies the approved local derived GLB before attaching it to
  this same scene. Room cabinets, plinth, frame and transparent glass surround
  the Patron effigy. See `CREDITS.md`, `portrait-receipt.json` and independent
  `PORTRAIT-REVIEW.md`; it is a photo-derived relief, not a full scan.

## Controls

WASD moves; mouse/drag or arrows look. LMB fires, RMB aims. Ctrl sprint, Shift
dash, Space double jump, C slide (free ammo during the actual slide). Q melee,
F parry, R reload, 1-4 abilities, E interact, B shop, hold X on an own retreat
ring. Escape releases mouse capture/closes the shop; Pause freezes the match.
Touch buttons provide movement/look/fire/abilities and the same actions.

## Regressions and browser evidence

```sh
node Games/Jankolock3D/integration-test.mjs
node Games/Jankolock3D/integration-ui.mjs --self-test
node Games/Jankolock3D/bots-test.mjs
node Games/Jankolock3D/systems-test.mjs --no-evidence
node Games/Jankolock3D/world-test.mjs
node Games/Jankolock3D/heroes/player-controller-test.mjs
node Games/Jankolock3D/heroes/hero-runtime-test.mjs
node Games/Jankolock3D/heroes/hero-visuals-test.mjs
TMPDIR=/dev/shm SMOKE_PORT=8947 timeout --signal=TERM --kill-after=15s 420s python3 -B Games/Jankolock3D/integration-qa.py
```

Integration regression runs both 600-second chain directions with the actual
six configured heroes, including a fractional browser start clock, 19 objective
falls, both base guards before shrines, all six shrines before Patron phase 2,
and a later P2 death before victory. It verifies runtime orb accounting,
portrait pins/parser/corruption rejection and catalog size/schema/unique IDs.
These are scripted public-API fixtures, not native wins or balance evidence.

`?qa=...` enables labeled test policies only on loopback. The fixture module is
not loaded for a normal visit. QA repositioning and seeded shop funds are
explicit; no HP/locks/winner assignment. Traversal uses fresh simulations and
passive hero bots to isolate movement from combat, with normal structure fire.
Chain fixtures use logged raw damage/reposition assists and passive hero bots.
Screenshots and reports live under the authorized integration audit directory.
They distinguish native buttons/keys/shots from setup/API clock advances.

Browser attempts 1/2 failed on retained fixture cooldown and a combat death
respectively. The fixture now resets travel cooldown and isolates each ride;
production invulnerability/HP is not granted. Attempt 3 reached all three
arrivals and B before user interruption; another attempt was interrupted at H.
Partial reports are not clean passes. The final browser result is recorded in
`integration-evidence.json`; independent full-game grading remains separate.

## Known limits and release holds

- World camps, Mid-Boss and crates are still largely world/traversal markers,
  not a complete neutral AI/rejuvenator/reward loop. Crate interaction removes
  cover/geometry; it does not fabricate an economy reward.
- Structure models are combat hit targets, not full physical colliders. Bots
  follow lane routes, not general city pathfinding or coordinated human tactics.
- Match pacing (10-15 minutes), fun/balance, supported GPU performance, real
  handheld ergonomics and full cold-offline behavior need independent play.
- QA aerial view/clock advances do not establish native full-lane walking.
  Existing independent world A evidence is qualified: 770m stations within a
  900m district, not district-edge-to-edge cable coverage.
- Software Chromium, screenshot variance and parser checks do not establish
  subjective UI fidelity or hardware acceptance. Builder checks are not grades.
- The unchanged full 127-game browser smoke is required before any future push;
  targeted integration checks cannot replace it. No push/full-fleet gate here.
