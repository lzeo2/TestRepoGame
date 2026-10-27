# Hero-team integration receipt

## Ribbon HOLD repair atop `3bff8dee`

Independent QA `02a6418f` reproduced stale Catchline targets, linked slow surviving
reset/death, doubled ORM factors and outdated browser roster assumptions. The
runtime now resolves each tether target by ID from current records every update,
breaks on disappearance/death/team/range/cover/expiry, and revokes the old linked
slow on reset, disposal or replacement (including a missed new cast). Systems
accepts only validated tether cleanup from inactive casters; dead-source damage
and unconfigured/incorrect abilities remain rejected. Cleanup removes only that
source/ability status. Embedded-PBR clones retain authored GLB material factors;
untextured original-model palette/procedural-surface handling is unchanged.

Current integrated browser checks require all eight hero IDs and ten model IDs.
Native E selection covers all eight kits/32 slots; its contact sheet fits eight
rows. Historical original-four range/before-after/concept comparisons remain
four-hero comparisons, not evidence for supplied models without those fixtures.

Targeted commands: `node heroes/ribbon-seraph-test.mjs`, `node heroes/trio-test.mjs`,
`node heroes/hero-runtime-test.mjs`, `node systems-test.mjs --no-evidence` (from
this game's directory), and `python3 -B qa-roster-test.py`. Ribbon checks real
replacement-record motion (8m to 58m), moving FX, range/removal/death/team break,
reset/recast/caster-death slow cleanup and GLB ORM multipliers. Bitmap/DOM remain
mocked: no native input, rendering, art, balance, hardware or release acceptance.
Syntax and scoped whitespace checks are required. The global maintenance checker
is blocked by uncommitted concurrent game edits; shared inventory/manual files
are deliberately not changed under this Jankolock3D-only order. No browser,
installation, asset edits, full fleet or push. Text-only waiver: <=7 MB growth,
TMPDIR=/dev/shm, halt below 1,420,000,000 free bytes.

## Trio gameplay follow-up (integrated entry only)

The integrated lobby now has eight selectable kits: the original four, Ribbon
Seraph, Spoollash, Checkmate Regent and Prism Warden. The standalone ranges still
use only their original four. The trio adds native four-slot kit adaptations at
`docs/jank3d-trio-kits.json`, verified PBR loads, bounded rigid poses and cosmetic
weapon sockets without modifying Ribbon's kit or pose branch. Standard capsule,
covered authoritative rays and systems damage/status ownership are unchanged.

Run `node Games/Jankolock3D/heroes/trio-test.mjs`: independently pinned asset
presence, actual loader/60 embedded PNG streams, 630 poses, CPU fire/melee/12
casts/collision/lifecycle and actual lobby card/select/start callbacks in a VM.
DOM and bot startup are mocked in that selection check; this is not native
browser/input, GPU, art or full-match balance acceptance. See the
[trio receipt](../models/TRIO.md) for actual abilities and remaining gaps.
The earlier Ribbon-only receipt below describes its own scope at that time.

## Ribbon Seraph follow-up (3D integrated entry only)

The four standalone ranges below are unchanged. The integrated `../game.mjs`
now also loads the optimized Ribbon Seraph with its separate schema-v1 kit at
`docs/jank3d-ribbon-seraph-kit.json`. It reuses HeroRuntime and systems, not the
archive's unsupported proposed effect schema. The fifth real lobby card creates
its verified GLB body, bounded rigid pose adapter and standard grounded controller.
Shared authoritative origins/hit volumes are unchanged; wings are cosmetic.
See [asset/kit qualifications](../models/ribbon-seraph/README.md). Trio definitions,
Monk and the original four-hero JSON remain untouched. The supplied archive has
no Monk model. Run `node Games/Jankolock3D/heroes/ribbon-seraph-test.mjs` for real
GLB/PNG-stream/controller/systems checks with mocked bitmap creation; no fresh
native/browser interaction or visual acceptance is claimed for this addition.

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
- `hero-visuals.mjs`: an expiring geometry FX manager and a re-export of the
  existing `hero-model.mjs` factory for the four verified external GLBs. The
  model/prop integration is separately documented; this resume does not alter
  meshes or rig poses. No sprites substitute for ability geometry. Only the
  reveal effect ignores depth. All resources have disposal paths.
- `hero-runtime.mjs`: cooldowns, range/cover queries, deployed geometry, turret
  acquisition, bouncing projectiles, buffs, weapon/ability intents and FX.
  It does not own match health or shop scaling.
- `docs/jank3d-hero-kits.json`: baseline definitions, all 16 abilities, weapon
  and melee values, damage channel and spirit coefficients. JSON is the shared
  source, loaded locally by the range. There are no remote runtime requests.

## Systems boundary

Construct `HeroRuntime({scene,controller,kit,targets,boxes,team,source,onEffect})`.
Targets have `{id,team,position,alive,radius?,height?}`. Positions are feet,
metres, Y-up, forward -Z. Replace `runtime.targets` when the entity set changes;
records and position objects may also be replaced. Active reveal reads the
current live enemy set in kit range every FX update, including the caster's
current position/team. Deaths, removal, team changes and range exits hide cages;
new entrants appear without extending the original cast lifetime. Cage meshes
and materials are reused up to peak simultaneous membership, not accumulated
per identity or frame. Reset/expiry/disposal clears the whole effect.

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
Leading capsule clearance also checks steep solid terrain across the body radius,
while the step allowance preserves ramps. The shoulder-camera sweep rejects
higher solid terrain across its radius rather than exposing the terrain's back
side; it still respects legitimate bridge/roof headroom. Two API-positioned,
native-keyboard edge probes and final camera captures supplement the fixtures,
not full native lane traversal. See the canonical manual for pinned receipts.

Fall-through follow-up: controller 1,396 assertions, world 505 assertions, bots
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
Historical captures remain under `docs/maintenance/audits/jankolock-3d-qa/heroes-*`.
The current runner writes a separate `heroes-resume/` directory there, retaining
native-image hashes, source/resource hashes before/after, HTTP/console/request
errors and explicit COMPLETE/FAILED status. It refuses a sibling browser and
checks both desktop/mobile contexts. No browser/server is left running.

Historical pre-model native run after camera/muzzle tuning reported:
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
No browser or screenshots were used for that bounded continuation. The resumed
hero-range run below is fresh native evidence for current hero modules, but
still does not establish exhaustive native movement on the integrated map.

Two earlier native attempts failed: synthetic Escape did not release pointer
lock, then movement keys could be cleared by a late lock-entry event. The real
Escape handler now explicitly exits lock, and entering lock no longer clears
held keys (losing lock still does). Hermes advice informed read-only diagnosis;
it did not waive native gates. A fresh full run is required after changes.

## Restored-contract hero resume

The repository-root `jank3d-spec.md` was read first and matched the relayed MD5
`aaa75071e498f6ca977db0e06fad2641`. Earlier temporary spec/hero-brief reads had
returned ENOENT; no missing clauses were invented. A later filesystem probe no
longer found that root copy, but this work uses the already-read verified text,
not a reconstructed contract. The no-Blender order remains in effect.

The shared reveal bug is fixed in `15f31e9`/`825533b`: current targets are read
through a live point supplier and existing cage pairs are reused. Regression
coverage includes replacement records/positions, empty initial sets, new
entrants, death/removal/team/range transitions, caster movement, exact original
expiry, cooldown, unchanged health and geometry/material identity reuse. Direct
point-array FX callers remain compatible. No kit values, damage rules, models,
UI styling, camera framing or other abilities changed.

Fresh current-model runner output:
`hero-qa: 4 hero pages HTTP 200; 37 screenshots; 24 observations; 0 retained errors; source hashes stable. Reviewer acceptance pending.`
The packet includes 270 HTTP200 responses, 106 stable source/resource hashes,
all sixteen ability captures, movement/camera/native touch checks, and native
Snipeoff dummy death/respawn during one reveal followed by expiry. The two mockup
twins and contact sheet bring the packet to 40 PNGs. The death/respawn sequence
uses ordinary damage inputs and the existing range respawn rule, not QA grants.
The new images retain the current externally supplied models and dark default;
light-theme captures use the normal toggle. Historical imagery is untouched.

Limitations: software WebGL is not supported-GPU performance acceptance. Real
handheld ergonomics and full-match balance are unverified. The current rigid
slide pose still looks comparatively upright despite the controller's observed
slide/free-ammo state; this resume does not change supplied art or rig posing.
Range fixtures do not establish exhaustive integrated world traversal. There
is no full-fleet smoke or push in this hero-only task. Maintain these holds until
the independent reviewer verifies the assembled game.
