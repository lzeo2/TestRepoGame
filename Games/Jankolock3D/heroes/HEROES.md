# Hero-team integration receipt

Scope: original hero characters, controller, shoulder camera, ability geometry,
and isolated training ranges. This is not the full match, registration, or an
acceptance grade. The reviewer owns criterion E. The previous 2D game supplied
postroom/stamp/folder tone only; none of its gameplay was ported.

## Files and launch

Serve the repository root over HTTP, then open `heroes/devhero-1.html` through
`devhero-4.html` under `Games/Jankolock3D/`: Stampead, Turretina, Snipeoff, Gooey
Sticky, respectively. They share `devhero.mjs` and `devhero.css`, use real 3D
filing-cabinet targets, and expose only observational `window.heroSnapshot()`.
The ranges have no win condition, inventory or match economy. Counterfire,
target respawn and the deliberately wounded ally are range fixtures, not match
balance. Reset range clears abilities, targets, ammo, movement and health.

- `player-controller.mjs`: feet-position controller; input/camera API documented
  in its module header. WASD, Ctrl sprint, Space twice, Shift dash, C slide,
  RMB aim. Slide requires forward momentum and lasts at most 0.9 seconds;
  firing consumes no ammunition only while `infiniteAmmo` is true. Low mantle
  and a hook use the same collision path. Input edges belong to the caller.
- `hero-visuals.mjs`: four original primitive character meshes and an expiring,
  bounded geometry FX manager. No sprites substitute for ability geometry.
  Only the reveal effect ignores depth. All resources have disposal paths.
- `hero-runtime.mjs`: cooldowns, range/cover queries, deployed geometry, turret
  acquisition, bouncing projectiles, buffs, weapon/ability intents and FX.
  It does not own match health or shop scaling.
- `docs/jank3d-hero-kits.json`: baseline definitions, all 16 abilities, weapon
  and melee values, damage channel and spirit coefficients. JSON is the shared
  source, loaded locally by the range. There are no remote runtime requests.

## Systems boundary

Construct `HeroRuntime({scene,controller,kit,targets,boxes,team,source,onEffect})`.
Use persistent targets with `{id,team,position,alive,radius?,height?}`. Positions
are feet, metres, Y-up, forward -Z. Update position fields in place; the active
reveal geometry follows those positions. Replace `runtime.targets` when the
entity set changes; targets captured by an existing reveal remain visible for
that reveal's lifetime. This is a known corpse/new-spawn reveal limitation.

Per frame: feed normal input to `controller.update`, then
`controller.updateCamera(camera,dt)`, `runtime.aim(camera)`, `runtime.fire()` or
`runtime.cast(1..4)`, and `runtime.update(dt)`. Discard hidden-tab time.
`runtime.melee()`, `parry()`, `startReload()`, `reset()` and `dispose()` are public.
Read `snapshot()` for diagnostics; it is not a state setter. Dispose/reset removes
only this instance's temporary walls, not world-owned colliders.

`onEffect(event)` emits `kind` (damage, heal, buff, buff-end, parry, tether-end),
`source` and `target` IDs, `ability` ID/name, `baseDamage`, `baseHeal`,
`damageType`, `spiritScale`, `slow`, `duration`, and applicable `headshot`,
`headshotMultiplier`, `invulnerable`, `speedMultiplier`. Area impacts and turret
shots also emit `origin: {x,y,z}`, a plain coordinate snapshot. Puddle healing
and grenade/missionbomb damage use the deployment or explosion center; turret
damage uses its muzzle (deployment + 0.9m Y), never the caster's later position.
Apply team checks, health/healing, armor, slow/parry/invulnerability and item scaling in systems.
**Do not multiply item damage in this module and again in systems.**
Set derived rate/movement values with
`setModifiers({cooldown:1,fire:1,reload:1,magazine:12,move:1})`; omitted fields
remain unchanged. Rates are multipliers, magazine is a positive integer.

Systems now exposes `configureHeroKit(sourceId, kit)` and
`applyHeroEffect(event)` for validated kit values, remote impact ranges, healing
and timed statuses. Configure the source before forwarding events. Runtime
owns kit ammunition and cooldowns; systems owns health and item scaling. Wiring
events straight to generic `damage()` is **not** sufficient, and runtime never
writes system HP fields. Hero-team did not modify `systems.mjs`, world traversal,
catalog or match UI. World zipline/teleporter/vent traversal remains a separate
integration owner; controller exposes feet position and `warp()` for a validated
traversal arrival.

World collisions: `PlayerController({position, boxes, ramps = [], floorHeight})`
accepts flat AABBs or `THREE.Box3`, plus optional world rotated-slab descriptors.
The host must pass `ramps: world.ramps` and
`floorHeight: (x,z,maxY) => surfaceHeight(world,x,z,maxY)`. Both arrays stay live.
The floor callback owns top support, including ascent and descent. Slab sides,
jump/hook undersides and crouch clearance reuse traversal's `capsuleIntersects`;
the camera sphere tests the same rendered slab transform along its boom and
reclamps after smoothing. Omitted/empty ramps retain AABB-only behavior and its
regressions. Solid terrain returned above `maxY` blocks horizontal entry rather
than disappearing from collision. Movement/warps use the existing world `LIMIT`
(448m), including standalone ranges, not an invented range-sized arena. Invalid
position/velocity or feet below -32m reset to the last clear grounded pose,
clearing motion/actions; before one exists the controller uses `{x:0,y:0,z:8}`.
Traveler recovery uses its last grounded pose or `world.start`, preserving crate
state. Sewer -10m, plaza -6m, roof/ramp support and bridge undersides remain valid.
Controller/world regressions cover terrain-edge walk/dash, recovery and bounds.
This module evidence does not establish assembled native traversal.

Fall-through follow-up: controller 1,392 assertions, world 505 assertions, bots
8 groups and hero-runtime checks pass in Node. Integration passes both 600s
chains and portrait integrity, then fails its stale 127-entry assertion against
the current 128-entry catalog. No assertion was weakened. Syntax/diff checks
pass. No browser/native acceptance is claimed; parent owns manual/inventory.

## Design and provenance

The live Foldwild start screen was served from sparse Git without a checkout,
then captured as `heroes-foldwild-reference.png` in the QA directory. Before
any hero HTML/CSS was written, codex-imagen generated
`docs/jank3d-design/ui-mockup-heroes.png` and `ui-mockup-heroes-mobile.png`.
The runtime follows their flat paper/ink palette, one blue UI accent, black
buttons, 4px corners, local Bungee/Atkinson, Arcade header, hero row and
viewport/control-panel layout. Dark theme changes paper/ink tokens, not layout.
Generated raster lettering/shading is approximate; authored UI uses actual
local fonts and solid fills, not baked mockup pixels. Original hero geometry is
intentionally lower-detail than the generated illustration. Comparison images
retain both sides; they are not claims of pixel identity.

No copied reference-game heroes, assets, text, audio or code. Mechanics research
references (not redistribution sources):
- https://deadlock.wiki/Movement
- https://deadlock.wiki/Abilities
- https://deadlock.wiki/Health

three.js r186 and MIT notices are shared from `../vendor/`, supplied by the
world team. Existing font notices remain unchanged. Mockups use the
operator-authorized subscription image tool; no ComfyUI/fallback mockups were
used by this team and no generated images are loaded at runtime.

## Verification and limits

Run from repository root:

```
node Games/Jankolock3D/heroes/player-controller-test.mjs
node Games/Jankolock3D/heroes/hero-visuals-test.mjs
node Games/Jankolock3D/heroes/hero-runtime-test.mjs
python3 -B Games/Jankolock3D/heroes/hero-qa.py
python3 -B scripts/check_maintenance_docs.py
```

QA uses only `/usr/bin/chromium`, a bounded local server on port 8937, normal
keyboard/mouse/touch input, no simulation grants, and read-only observations.
Assets are checked against the disk guard before every screenshot/comparison.
Desktop images are 1280x720; mobile captures preserve genuine 390x844 layout
and optional full-page height. Labeled side-by-side images are wider/taller.
All are under `docs/maintenance/audits/jankolock-3d-qa/heroes-*` with a JSON
observation report. No browser instances/servers are left running by the test.

Latest completed native run after camera/muzzle tuning reported:
`hero-qa: 4 hero pages HTTP 200; 34 screenshots; 23 observations; 0 retained errors. Reviewer acceptance pending.`
Those 34 captures include each ability, every hero in both desktop themes,
pointer look, aim, double jump, dash, slide, camera-wall clamp and both mobile
themes (viewport/full-page). Additional files retain the Foldwild reference,
two labeled comparison twins and the 16-FX contact sheet. The camera now uses
a 1.1m right shoulder and 4m boom (2.8m while aiming); the matching module
regression and native collision limit were updated, not removed.

Interrupted-worker continuation, Node only: `player-controller-test` reports
1,365 assertions, including the actual roof-access side-entry probe, roof
landing, both slab axes/slopes, ascent/descent, jump/hook undersides, buffed dash
and independently transformed camera-sphere/boom checks. `hero-runtime-test`
reports 16 kit casts and five remote-origin damage/heal events accepted by the
real systems API while the caster is 100m away; origins remain snapshots after
deployment movement. Frozen target records reject direct health writes.
`hero-visuals-test` retains four heroes, 16 kit FX and seven generic FX checks.
These changes require a fresh native run; no browser or screenshots were used
for this bounded continuation. The outer maintenance manual/inventory refresh
belongs to the integration owner, outside this worker's five-file scope.

Two earlier native attempts failed: synthetic Escape did not release pointer
lock, then movement keys could be cleared by a late lock-entry event. The real
Escape handler now explicitly exits lock, and entering lock no longer clears
held keys (losing lock still does). Hermes advice informed read-only diagnosis;
it did not waive native gates. A fresh full run is required after changes.

Limitations: software WebGL is not supported-GPU performance acceptance. Real
handheld ergonomics and full-match balance are unverified. AABB movement and
range fixtures do not establish world traversal/zipline integration. There is
no full-fleet smoke or push in this hero-only task. Maintain these holds until
systems/integration and the independent reviewer verify the assembled game.
