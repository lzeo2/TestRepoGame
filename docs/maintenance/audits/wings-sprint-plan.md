# Wings sprint plan: anatomy, weather/day cycle and multinational roster

Planning only, 2026-10-19. This file does not implement weather or new aircraft,
approve a model, waive a test, authorize dependencies, or claim a push. The current boat run takes
precedence. The operator authorized its push without another confirmation ONLY
after the completed roof/driver/runtime work, interactive acceptance and fresh
125/125 full smoke gate. A failed gate means no push.

## Baseline, source map and handoff

Planning baseline: main `5c55e33`. Served Wings still has seven selectable kinds;
the boat runtime is in a private source repository, not delivered yet. Do not
mistake private source commits or raw model previews for deployed gameplay.

- Authored recovery root, a concrete repository-relative directory:
  `.tmp/wings-speedboat-source/games/wings/`.
- Its Git root is `.tmp/wings-speedboat-source/`; upstream source pin is
  `bf5f6277e38ee52e9bfa4ae4a01337b46175c181`. The recovery receipt records verified
  Git blobs. `.tmp` is ignored, so this is a local working copy, not durable main
  source history. After boat integration, recover from the pin plus the newly
  reviewed `Games/Wings/port.patch`, not an old private HEAD.
- Durable integration artifacts: `Games/Wings/port.patch`, `Games/Wings/index.html`,
  `Games/Wings/assets/`, `Games/Wings/verification/`, `scripts/build_wings.mjs`.
  Assets are generated: review every authored diff and rebuild reproducibly;
  never hand-edit minified output or pretend to review it instead of its source.
- Evidence: `docs/wings-speedboat-study.md`,
  `docs/maintenance/audits/wings-speedboat-reroll.md`,
  `docs/maintenance/audits/wings-v2-resume.md`,
  `Games/Wings/docs/previews-v2/` and its `speedboat-reroll/` files.
- Rules: `docs/CODE_QUALITY.md`, `docs/maintenance/README.md`,
  `docs/maintenance/games/232-wings.md`,
  `Games/Wings/docs/aircraft-quality-contract.md`,
  `Games/Wings/docs/models.md`, `docs/wings-jets-v2-brief.md`.

Current worker state at planning time, not a completed review:

| Lane | State to preserve | Next action |
| --- | --- | --- |
| #27 input | Private `67051e0`, one input file | Orchestrator reads the complete diff; wire both water flags in controller and retest |
| #28 camera | Private `ff81291`, one camera file | Complete diff review and actual cockpit/chase/passenger screenshots |
| #30 roof/driver | Dirty main generator, interrupted by operator message | Resume same scope; diagnose old geometry, finish closed roof/glazing and occupied-seat helmsman; return prepared diff before commit |
| #31 audio | Prepared private `src/audio/engine.ts`, reported +12/-1; no commit | Read every line and mock receipt; explicit approval before worker commits |
| #32 sweep | Dirty main `check-speedboat-browser.py`, interrupted | Resume same scope; old-model failure/new-model success, low/banked heading sweep, preserve assertions |
| Parent | Private `src/sim/vehicles.ts` order correction remains dirty | Review and commit explicitly; finish controller, bot map, events, delivery and current tests |

The interrupted lanes were not rejected quality rolls. Do not discard their work
or label the prepared tests as whole-game passes. Existing model does not yet
contain the newly requested driver/roof fix. Current full gate remains unrun.

## Dependency map and stop rules

```text
roof/glazing diagnosis + deterministic closed geometry + seated pilot_1
    -> raw low/banked/heading sweeps + independent challenge
    -> complete controller/input/camera/audio/seat integration
    -> every authored worker diff reviewed line by line, fixes and CPU regressions
    -> clean-pin patch/build delivery + manual/inventory check
    -> interactive boat: spawn, motion, BOTH weapons, state changes,
       driver occupancy, solid roof at all required headings, menu/restart
    -> unchanged full catalog smoke, all 125 visits, release between batches
    -> if all required gates green: push main, verify deployed games.json ID set
    -> freeze actual pushed source/artifact/evidence SHA
    -> Phase 0 execution and independent anatomy verdict
    -> operator/orchestrator accepts transferable checklist and Phase 1 parameters
    -> Phase 1 implementation, exhaustive agreed acceptance matrix, new full gate
    -> Phase 2 multinational roster: rights/reference freeze, three serial models,
       reviewed integration, per-jet receipts and its OWN full release gate
```

Planning and reading may happen now. Phase 1 source edits, shader experiments,
new environment APIs, seeded-state wiring, HUD changes and weather fixtures MUST
NOT start before the boat push/deploy receipt and stable baseline. Phase 0 lane
execution/acceptance also waits for that baseline; today's source reading is not
its acceptance. An exception needs an explicit operator order, not a worker's
convenience. If the boat cannot pass, report its actual blocker and keep future
phases held; do not start weather to hide a failed boat run.

Check exact `df` before every checkout and projected growth, not just rounded
free space. Strict floor: 2,147,483,648 bytes. Add approximately 15 games per
planned batch, run the unchanged scoped smoke visits, RELEASE to the saved coding
sparse selection, verify release, then add the next batch. Split a batch further
if its predicted payload does not fit. Never materialize all Games together.
No concurrent Git commands/commits during sparse transitions; read-only parallel
reviews use `GIT_OPTIONAL_LOCKS=0`. No outside-repository deletion by agents.
No installs, repository node_modules, remote runtime loads, secrets or host paths.

## Phase 0: source-grounded quality anatomy

### Concrete read manifests

Every lane reads the rules/evidence above and the full relevant source, then
traces callers and consumers. Paths below are current local files; the matching
`games/wings/...` entries must be recovered from the final port patch after push.
Historical generated filenames are not a future source allocator.

**P0-A, model/converter/camera anatomy:**

- `.tmp/wings-speedboat-source/games/wings/src/render/aircraft.ts`
- `.tmp/wings-speedboat-source/games/wings/src/render/toon.ts`
- `.tmp/wings-speedboat-source/games/wings/src/render/aircraft-shadow.ts`
- `.tmp/wings-speedboat-source/games/wings/src/render/camera.ts`
- `.tmp/wings-speedboat-source/games/wings/src/render/scene.ts`
- `.tmp/wings-speedboat-source/games/wings/src/render/aircraft-preview/main.ts`
- `.tmp/wings-speedboat-source/games/wings/src/sim/vehicles.ts`
- `Games/Wings/verification/generate-models.py`, `check-models.py`,
  `check-models-browser.py`, `model-preview.html`, `check-speedboat-browser.py`
- All eight final selectable GLBs, final descriptors and final raw/native images.

**P0-B, gameplay/water/audio/HUD anatomy:**

- `.tmp/wings-speedboat-source/games/wings/src/sim/types.ts`
- `.tmp/wings-speedboat-source/games/wings/src/sim/vehicles.ts`
- `.tmp/wings-speedboat-source/games/wings/src/sim/flight.ts`
- `.tmp/wings-speedboat-source/games/wings/src/sim/geography.ts`
- `.tmp/wings-speedboat-source/games/wings/src/sim/fleet.ts`
- `.tmp/wings-speedboat-source/games/wings/src/sim/combat.ts`
- `.tmp/wings-speedboat-source/games/wings/src/sim/room-engine.ts`
- `.tmp/wings-speedboat-source/games/wings/src/sim/bots.ts`
- `.tmp/wings-speedboat-source/games/wings/src/sim/protocol.ts`
- `.tmp/wings-speedboat-source/games/wings/src/sim/loopback.ts`
- `.tmp/wings-speedboat-source/games/wings/src/input.ts`
- `.tmp/wings-speedboat-source/games/wings/src/ui/game.ts`
- `.tmp/wings-speedboat-source/games/wings/src/ui/aircraft-input.ts`
- `.tmp/wings-speedboat-source/games/wings/src/ui/spawn.ts`
- `.tmp/wings-speedboat-source/games/wings/src/ui/lobby.ts`
- `.tmp/wings-speedboat-source/games/wings/src/ui/settings.ts`
- `.tmp/wings-speedboat-source/games/wings/src/render/hud.ts`
- `.tmp/wings-speedboat-source/games/wings/src/render/effects.ts`
- `.tmp/wings-speedboat-source/games/wings/src/style.css`
- `.tmp/wings-speedboat-source/games/wings/src/audio.ts`
- `.tmp/wings-speedboat-source/games/wings/src/audio/engine.ts`
- `.tmp/wings-speedboat-source/games/wings/src/audio/engines.ts`
- `.tmp/wings-speedboat-source/games/wings/src/audio/core.ts`
- `.tmp/wings-speedboat-source/games/wings/src/audio/sfx.ts`
- `.tmp/wings-speedboat-source/games/wings/src/audio/ambience.ts`
- `.tmp/wings-speedboat-source/games/wings/src/audio/buffers.ts`

**P0-C, independent challenge:** reads BOTH complete manifests above, the actual
final patch, all failed and passing pixel/gameplay receipts and all required
regressions. It first records its own failure hypotheses without the lead's
verdict, then reads the lead checklist and challenges every claim/evidence link.
It does not sample a convenient subset of files or vehicles.

**P0-D, environment/lighting/budget baseline:**

- `.tmp/wings-speedboat-source/games/wings/src/render/scene.ts`
- `.tmp/wings-speedboat-source/games/wings/src/render/world-view.ts`
- `.tmp/wings-speedboat-source/games/wings/src/render/world/atmosphere.ts`
- `.tmp/wings-speedboat-source/games/wings/src/render/world/palette.ts`
- `.tmp/wings-speedboat-source/games/wings/src/render/world/settings.ts`
- `.tmp/wings-speedboat-source/games/wings/src/render/world/sky.ts`
- `.tmp/wings-speedboat-source/games/wings/src/render/world/rain.ts`
- `.tmp/wings-speedboat-source/games/wings/src/render/world/water.ts`
- `.tmp/wings-speedboat-source/games/wings/src/render/world/ships.ts`
- `.tmp/wings-speedboat-source/games/wings/src/render/world/streamer.ts`
- `.tmp/wings-speedboat-source/games/wings/src/render/world/terrain-worker.ts`
- `.tmp/wings-speedboat-source/games/wings/src/render/world/tile-gen.ts`
- `.tmp/wings-speedboat-source/games/wings/src/render/world/preview.ts`
- The P0-B HUD/style/audio/controller/clock files, plus `src/main.ts` under the
  same concrete source root and `scripts/build_wings.mjs`.

### Transferable checklist: mechanisms, pixels and play must agree

For every item record source/caller anchors, exact artifact hash, command exit,
pixels/input sequence, measurement, limitation and verdict. Separate inspection,
CPU/render-state fixtures, raw GLB views, actual native rendering and physical
hardware/listening. No percentages or self-scores substituted for evidence.

1. **Identity and anatomical fidelity:** recognizable class, real proportions,
   coordinate convention, supplied/generated provenance, geometry-derived camera,
   gun, store, exhaust, wake and helm anchors. A boat must float/turn/reverse as a
   watercraft, not a slow jet. No unsupported realism or copied-mesh claim.
2. **Complete geometry:** closed opaque volumes; winding, face normals, mirrored
   transforms, transparent glass/depth-write semantics and camera clipping.
   Front/rear/side/top/belly plus full prescribed heading, low and banked sweeps.
   Specifically reproduce the old roof disappearance, show the root fix, and
   show the roof solid without a blanket double-sided-material workaround.
3. **Crew/rig anatomy:** occupied `pilot_1` has real visible seated geometry;
   vacancy and seat changes use the actual shared mechanism. No floating helmet,
   roof/seat clipping, static decorative crew or empty pivots counted as features.
4. **Materials/light:** correct linear sRGB, dark family base, useful authored
   accents, wet/dry/non-skid/glass/metal/clearcoat separation, meaningful material
   use, AO and roughness retained through conversion. Challenge flat swatches,
   blown highlights and surfaces only readable under flattering studio lights.
5. **Weapons/action semantics:** every required vehicle, seat and weapon gets its
   own normal-input receipt: aim/limits, own ammo, authoritative projectile/owner,
   fuse/impact/damage, stores, sounds, cooldown/refill and cleanup. No representative
   weapon substituted; a CPU-positioned target is labeled, not native lock proof.
6. **Lifecycle/input:** spawn selection, water/deck exclusion, both steering modes,
   reverse/brake/coast, pause, pointer-lock fallback, seat change, death, respawn,
   ordinary menu return and fresh restart. No stale firing or driver/wake state.
7. **World/HUD/audio:** waterline/shore/ship collision, real view and reticle/muzzle
   agreement, legible radar/ammo/warnings, audio-event correspondence and disposed
   sources/listeners. Context/PCM/mocks do not prove listening or speaker output.
8. **Cost and safety:** measured full visible scene triangles, draws, frame time,
   load behavior and allocation/disposal on recorded hosts/qualities. Include
   terrain, fleet, rain, wake, weapons and crew. Raw asset sums are not the 120k
   scene gate. Preserve first-draw/shader errors, offline closure, licenses and
   protected content; never alter filters or failure checks to make a PASS.
9. **Transfer rules:** explain why a pattern works and its limits. Original-five
   pale/olive materials, the inherited YF-12 empty-slot mapping and fixed storm
   lighting are findings, not permission to clone incorrect behavior or recolor
   unrelated aircraft. Every unexplored case remains unverified, not inferred.

### Second-lane challenge design

P0-C must maintain a claim/counterexample/evidence/result table, not echo P0-A/B.
Try interior/low/behind/banked roof views, mirrored winding, glass ordering, empty
and occupied seats, off-axis cannon aim, own-versus-bot missiles, charge fuse at
water entry versus expiry, pause/switch ownership while firing, restart disposal,
bright sea behind pale HUD, dark hull at night, and emitter/triangle budget peaks.
Repeat the exact failing case after a fix and compare old/new hashes and pixels.
Do not introduce state grants as normal play, or change the camera only to hide
an exposed defect. Reviewer disagreements go to the orchestrator with both raw
receipts; the orchestrator owns the checklist wording, visual verdict and scope.

## Phase 1: draft deterministic weather/day-cycle approach

### Existing mechanisms to reuse, and current limits

Inspected during this planning pass: world-view already owns the key/hemi light,
procedural reflection DataTexture, sky/cloud/lightning/rain/spray and restoration
on disposal. `atmosphere.ts` owns shared STORM uniforms and an existing seeded
noise DataTexture. `water.ts` shares sky/fog but freezes key-light uniforms at
construction. `rain.ts` already has `setVisibility`; its geometry seeds currently
use Math.random. `sky.ts` schedules/constructs lightning with Math.random.
`audio/ambience.ts` also schedules independent random thunder. `ui/game.ts`
hardcodes rain=1 at entry/cockpit transitions. `scene.ts` passes local frame time
to world.update and owns post/flash exposure. None is already a deterministic
room-wide day/weather state. These are source facts, not runtime weather tests.

The ocean is visually displaced but authoritative physics water remains Y=0.
Do not secretly add storm forces, wave-following buoyancy, handling or targeting
changes. The future weather work is initially visual/audio only; existing boat
waterline and no-airlift/collision invariants remain tests and documented limits.

Budget risk before implementation: high ocean radial geometry alone has
`288 * (2 * 180 - 1) = 103,392` triangles from the current grid constructor;
14,000 rain quads add 28,000 before boat/fleet/terrain. This source arithmetic
already warns against claiming a 120k scene PASS. P0-D must measure actual draws,
visibility and quality states; report any baseline violation before proposing a
separately reviewed bounded budget fix. Do not raise the contract to fit it.

### State/clock contract

Propose one small pure sampler in `src/sim/environment.ts`, no Three/DOM/audio:
`seed + authoritative match tick -> finite clamped environment values`.
Use existing snapshot time/tick/matchStartedAt to derive elapsed match ticks, not
Date.now, requestAnimationFrame count or an accumulated local random walk.
Derive a stable seed from the existing world seed plus the authoritative match
start tick; no backend, wall-clock seed, signaling or protocol field is needed
for the initial fixed policy. If per-room custom seeds are later explicitly
requested, validate an optional uint32 config field and round-trip it; do not
build that option speculatively now. No weather persistence/localStorage key.

A stateless integer hash of seed and weather-segment index produces bounded
cloud/rain/fog/wind targets. Interpolate between adjacent targets with a smooth
bounded curve. Day phase is wrapped elapsedTicks/cycleTicks plus a fixed reviewed
start phase. Rejoining, skipped frames, different render rates and pause/resume
must sample the same state at the same authoritative tick; state must not reset
when a model is respawned. Clamp/reject invalid seed/time at the proper boundary;
return no NaN, negative fog or unbounded wind. Exact cycle duration and starting
phase are tuning decisions after Phase 0 pixel review, not frozen by this plan.

Share the same authoritative time with visual shader clocks where needed. Keep
camera-relative cosmetic positioning separate from deterministic weather state.
For an idle menu, a clearly separate local preview clock may drive atmosphere;
entering/leaving a session switches clock ownership without resetting room state.
Do not disable the first real scene draw or create a HUD-only success path.

### Lighting and rig parameters

Draft four reviewed anchors, interpolated continuously in linear working space:

| Time anchor | Key direction/color | Ambient/reflections | Exposure/emissive rules |
| --- | --- | --- | --- |
| Dawn | Low sun, restrained warm key, no painted orange hull | Cool sky fill, low-intensity horizon | Bounded lift; canopy and dark bow readable |
| Day | Higher neutral-warm sun | Neutral hemisphere and reflected sky | No blown chrome/non-skid; preserve source PBR |
| Dusk | Opposite low sun, muted warm key | Cool fill and falling reflected brightness | Do not crush driver/weapon silhouette |
| Night | Very weak cool directional fill, not a second bright sun | Nonzero readable sky/sea separation | Nav lights, HUD and exhaust retain controlled HDR, no bloom whiteout |

World-view applies the sampled key/hemi parameters once, and updates existing
reflection buffer/uniforms only when needed. Sky, fog and water consume the same
state so sea/horizon/key do not disagree. Expose water key/ambient uniforms through
a small setter; do not rebuild the ocean or shader program every frame.
Atmosphere/cloud coverage uses uniforms in existing TSL graphs, not new shaders
per preset. Scene post exposure and lightning compose once with existing finite
HDR protection. Low stays a real no-post path; do not use a hidden forced quality
or unlit material replacement to make tests pass. Preserve model material colors,
roughness and AO, the seated driver, and geometry-derived camera rigs.

No new image, font, HDRI, skybox, texture resource, third-party script or fetch.
Reuse only the already-procedural noise, shore and reflection buffers in place;
no additional texture allocation is planned. Real 3D light falloff is not a CSS
UI gradient. Shell/HUD backgrounds remain flat solids.

### Rain, fog, overcast, water and sound

- Clear/overcast/rain/storm are testable parameter anchors of the same sampler,
  not independent systems with competing clocks. Thresholds and maximum values
  are explicit reviewed constants with smooth transitions.
- Reuse particle quads and `setVisibility`. Seed buffers deterministically;
  quality changes use the same seed/prefix and dispose old resources correctly.
  Weather transitions must not allocate geometry, change topology or refill pools
  every frame. Clear hides rain/spray work; rain never becomes a bright HUD veil.
- Drive existing height-fog density/colors and cloud coverage/wind uniforms.
  Maintain finite horizontal-ray behavior and near-helm visibility. Never conceal
  coastline/ship collision or an unclosed roof with fog, and do not turn overcast
  into uniform flat black materials.
- Water consumes matching wind/color/light state. Do not increase geometric wave
  amplitude or change the flat physics surface in this phase. Test the perceived
  hull waterline and wake continuity under all anchor states.
- Make visual lightning scheduling seeded. Reuse `onLightning`, `lightningSource`
  and `GameAudio.thunder` for distance-delayed thunder. Eliminate duplicate
  independently scheduled visible-strike thunder; optional ambient far thunder
  must be explicitly distinguished and seeded if its schedule is shared.
- Feed existing `setStorm` intensity/cockpit/enabled values when state changes,
  replacing hardcoded rain=1. Respect mute, gesture unlock, hidden-tab suspension,
  menu return and disposal. Do not create contexts or randomize weather in audio.
  Cosmetic timbre variance is separate from shared storm timing.

### HUD/readability and visual acceptance

Reticle, ammo, driver/seat state, radar, lock/fuse feedback and warnings must work
against bright sky, reflective sea, fog, lightning and night. Normal text target
contrast >=4.5:1; essential non-text indicators >=3:1. Team identity and critical
states must not depend on color alone. Existing text shadows are not proof of
contrast: inspect screenshots and measure actual composited foreground/background.
Use small local solid backing/strokes only where a demonstrated failure needs it;
no gradient overlay, theatrical animation or wholesale theme replacement.
Keep 44px controls/focus, desktop and 390/320px mobile containment, reduced-motion
behavior, and readable light/dark preferences. Flash bounds/frequency must be
reviewed for comfort; no high-frequency full-screen strobe.

Freeze an explicit matrix after Phase 0: all eight selectable vehicles, occupied
and vacant relevant seats, every weapon and full action lifecycle; all four time
anchors crossed with all four weather anchors, each quality, desktop/mobile and
both themes. Retain the boat low/banked/heading roof sweeps. Test normal transitions
and extremes, not only prettier intermediate settings. Every required cell gets
a receipt or an explicit incomplete/failure status. Work may be partitioned into
bounded sessions, but never silently reduced to a representative vehicle/weapon
or substituted by a parser/CPU fixture. Fixtures may select deterministic phases
for diagnostics; those are labeled and are not normal-input gameplay proof.

## Worker lanes: ready-to-paste briefs and disjoint scopes

All runtime, tests and review lanes below pin **openai-codex/gpt-6.1-sol**.
Review thinking: xhigh; runtime/test thinking: high. Astra is reserved ONLY for
an explicitly needed mesh lane, **openai-codex/gpt-6-astra**, high. Phase 1 as
planned needs no new meshes, so do not dispatch Astra for weather/runtime work.

Common brief envelope, prepend to every row's brief:

> Read AGENTS, CODE_QUALITY, maintenance README/manual232, this plan and the stated
> complete read manifest. Use the frozen pushed SHA and record hashes. Write only
> your assigned tracked file; ignored evidence under your own lane directory is
> allowed only after exact disk/projected-growth checks. Trace all callers. No
> installs, node_modules, external runtime assets, protected edits, outside-repo
> deletion or push. Tee output to .swarmforge-logs/worker-<timestamp>.log. Return
> the full prepared diff and actual checks WITHOUT COMMIT. Orchestrator reads
> EVERY authored diff line, relevant callees and all required pixels/receipts;
> then explicit approval lets you commit only your own path. Do not weaken a
> failed assertion. Quality shortfalls require iteration, not abandonment after
> two rolls; the two-fail abandon rule is for tooling failures. Continue depth
> across bounded task sessions with visible progress, not a rushed acceptance.

### Phase 0 lanes

| ID | Goal/model pin | Sole writable file | Brief skeleton after common envelope | Required acceptance evidence |
| --- | --- | --- | --- | --- |
| P0-A | Geometry/rig/material/camera anatomy; sol xhigh | `docs/maintenance/audits/wings-quality-anatomy.md` | Read P0-A in full; bind every anatomical claim to converter/source, actual GLB and multi-angle/native pixels; record counterexamples and transfer limits. Do not score your own art. | Complete per-vehicle claim/source/hash/pixel table, all roof/driver failures retained, measured budgets and unverified scopes |
| P0-B | Water/combat/audio/HUD anatomy; sol xhigh | `docs/maintenance/audits/wings-quality-behavior.md` | Read P0-B in full; trace every seat/weapon/input/lifecycle path; challenge screenshots against authoritative state/event/ownership evidence. | All vehicles/seats/weapons action matrix, native and CPU separated, sound/disposal/contrast evidence; no representative substitution |
| P0-D | Environment/budget baseline; sol xhigh | `docs/maintenance/audits/wings-weather-baseline.md` | Read P0-D plus shared consumers; capture the actual shipped storm, all qualities, all costs and existing clock/randomness boundaries before designing changes. | Shader/clock/dataflow map; actual scene triangles/draws/host timings; image/HUD baseline; known risks, no inferred 120k PASS |
| P0-C | Independent adversarial second review; sol xhigh | `docs/maintenance/audits/wings-quality-challenge.md` | Read both complete manifests and P0-D; record independent hypotheses first, then challenge every lead claim and required action with contrary views/receipts. | Old-failure/new-result comparisons, disputed-claim table, all gaps explicit; cannot accept its own implementation |
| P0-O | Orchestrator synthesis; sol | `docs/maintenance/audits/wings-quality-checklist.md` | Read every lane diff line and every required evidence set; resolve disputes, publish reusable checklist with scope ceilings and exact Phase 1 matrix. | Written source-grounded verdict, no unreviewed claims, stable baseline SHA and approved next-phase contract |

P0-C may collect independent evidence in parallel but cannot finalize before
A/B/D receipts exist. P0-O is orchestrator-owned, not a delegated visual decision.
An anatomical defect opens a separately scoped repair lane and a rerun; it is not
quietly included in a review note. If a mesh repair is needed, assign Astra only
one generator/model scope with a separate acceptance review, never runtime files.

### Phase 1 lanes and serialization

For brevity `S` below resolves exactly to the concrete repository-relative source
root `.tmp/wings-speedboat-source/games/wings/`, recovered afresh at the frozen
boat push SHA. A scope such as `S/src/render/world/sky.ts` is one private tracked
source file. Parent delivery through port.patch remains separate and serialized.
New files are proposals, not files created by this planning task.

| ID | Goal/model pin | Sole writable file | Brief skeleton after common envelope | Required acceptance evidence |
| --- | --- | --- | --- | --- |
| P1-A | Pure deterministic sampler; sol high | `S/src/sim/environment.ts` (new) | Implement the approved seed/tick sampler only; no DOM/Three/random walk/protocol expansion. Return bounded values and deterministic segment/phase behavior. | Seed/tick vectors, wraps/rejoin/frame-rate invariance, invalid-input boundary checks, finite ranges |
| P1-T | One runnable state regression; sol high | `S/environment-check.ts` (new) | Independently test P1-A transitions/seeds/clock ownership and agreed invariants with stdlib asserts; no framework or copied implementation oracle. | Fails known clock/seed defects, deterministic replay, zero weather influence on original handling |
| P1-B | Shared atmosphere uniforms; sol high | `S/src/render/world/atmosphere.ts` | Add the minimal approved state setters/uniforms for sky/fog/coverage; reuse existing noise buffer and preserve finite fog math. No renderer/material replacement. | Boundary and shader compile checks, same horizon/sky/fog state, no new texture allocations |
| P1-C | Sky/cloud/lightning; sol high | `S/src/render/world/sky.ts` | Consume approved uniforms and seeded strike schedule; no Math.random weather clock, no per-frame cloud rebuild or duplicate flash scheduling. | Repeatable strike IDs/times, clear/overcast/cloud transitions, low/banked sky views, disposal |
| P1-D | Rain/spray; sol high | `S/src/render/world/rain.ts` | Keep existing topology/pools; deterministic seed prefix and intensity setter, clear disables work, no allocation per transition. | Fixed seeds across quality changes, count/visibility bounds, no emitter leak, depth/HUD screenshots |
| P1-E | Water lighting/weather bridge; sol high | `S/src/render/world/water.ts` | Expose minimal setters for existing lighting/wind/color uniforms; same clock as sky, no physics or wave-amplitude expansion. | Sea/horizon match, finite reflection normals, source PBR retained, boat waterline/wake receipts, triangle ledger |
| P1-F | World owner integration; sol high | `S/src/render/world-view.ts` | Wire approved sampler consumers, lights and reused reflection buffer; restore everything on disposal and quality changes. Do not own audio/HUD/controller. | All-anchor images, no duplicate light/exposure, zero new texture resources, resource lifetime/quality tests |
| P1-G | Scene clock/post bridge; sol high | `S/src/render/scene.ts` | Consume the explicit clock/state API without weakening first draw; compose post and lightning once and keep Low no-post behavior. | Real first draw/shader failures preserved, Low/Balanced/High parity, finite bounded HDR/flash and context-sequence checks |
| P1-H | Ambience state scheduling; sol high | `S/src/audio/ambience.ts` | Replace only conflicting weather scheduling under the approved contract; keep timbre versus shared-state distinction and disposal/mute rules. | Seeded timing/duplicate-thunder checks, graph lifetime/mute/unlock, labeled PCM/listening evidence |
| P1-I | Controller clock/audio bridge; sol high | `S/src/ui/game.ts` | Pass authoritative match tick/seed to world and setStorm only on changes; remove hardcoded rain=1 without changing input, combat or seat semantics. | Rejoin/pause/respawn/menu clock continuity, every weapon/seat input still correct, no audio/context leak |
| P1-J | HUD backing only if demonstrated; sol high | `S/src/style.css` | Fix only measured contrast failures using small solid backing/strokes; preserve layout/focus/reduced motion and house style. No speculative recolor. | Composited contrast measurements and desktop/390/320 screenshots for full agreed state matrix |
| P1-V | Real environment capture regression; sol high | `Games/Wings/verification/check-environment-browser.py` (new) | Exercise the actual shipped scene/state API and all agreed matrix cells; bind poses/seed/tick to images, errors, resources and frame budgets. Never pass on an absent API or use a raw fixture as native proof. | Before storm baseline and after complete matrix, own-server cleanup, exact failures, no external loads, no hidden quality overrides |
| P1-R | Independent final challenge; sol xhigh | `docs/maintenance/audits/wings-weather-challenge.md` | Read every authored Phase 1 diff and actual before/after gameplay/pixels; replay adverse cases and challenge determinism, readability, budgets and missing cells. | Line-by-line review record, all regressions/interactive cells, defects resolved or release HOLD |

P1-A's reviewed interface must land before B/C/D/E. B must land before C and E;
A/B/C/D/E must settle before F; F's clock API before G/I. H and I agree the
existing audio contract before either changes call semantics. T is independent
of A's author, and V/R are independent of implementation authors. J is not run
unless the measured HUD defect exists. Separate worker paths do not authorize
concurrent commits/index refresh during checkout or parent integration.

If the current GameAudio interface needs a signature change, use a separate
serialized owner for `S/src/audio.ts`, followed by `S/src/audio/engine.ts`, each
sol high and one file only. Do not let H or I silently expand their scope.
Likewise palette/settings changes require a separately approved one-file owner;
no simultaneous lane may modify them through a helper, script or generated copy.

## Exact regression and acceptance gates before and after Phase 1

Use the delivered, source-built baseline after the boat push, not today's old
seven-kind bundles. Preserve raw stdout/stderr, exit status, artifact hashes and
screenshots. The following files already exist; their checks are not weather
acceptance by themselves and none may be weakened for the new feature:

```sh
python3 -B Games/Wings/verification/check-models.py
node Games/Wings/verification/astra-check.mjs
node Games/Wings/verification/solo-check.mjs
python3 -B Games/Wings/verification/check-models-browser.py \
  --three-root "$HOME/.hermes/cache/tools/three-0.186.0/package" \
  --out .tmp/wings-sprint-before/raw-jets
python3 -B Games/Wings/verification/check-speedboat-browser.py \
  --model Games/Wings/models/speedboat.glb \
  --three-root "$HOME/.hermes/cache/tools/three-0.186.0/package" \
  --out .tmp/wings-sprint-before/raw-boat
python3 -B Games/Wings/verification/check-browser.py \
  --url http://127.0.0.1:8938/Games/Wings/ \
  --out .tmp/wings-sprint-before/ui
python3 -B Games/Wings/verification/check-context-sequence.py --port 8982
python3 -B scripts/check_maintenance_docs.py
```

Repeat with fresh `after` evidence directories after implementation. UI check
requires an owned bounded repository HTTP server, closed in finally; its
unavailable-GPU cases remain failure/fixture evidence, not successful flight.
Context-sequence also requires narrow materialization of Server Survival/Astray;
check projected disk first and release afterward. No persistent server.

Recovered source's six existing test files must all run before and after, not a
representative suite:

```sh
"$HOME/.bun/bin/bun" test .tmp/wings-speedboat-source/games/wings/tests
```

This includes bots, combat, flight, geography, pilot and room tests. Use the
already-present tool only; no install to reproduce. Record actual versions and
current totals rather than copying historical pass counts. Build baseline and
after using `scripts/build_wings.mjs` with explicit source, existing Three and
existing esbuild package paths. Rebuild the node regressions from the same source,
validate local HTML/chunk/worker/font/model links, clean-pin patch applicability,
all touched JS with `node --check`, catalog JSON/schema/unique IDs/Git-backed URLs,
and `git diff --check` on the authored/full new range. Retain legal notices.

The private existing `boat-check.ts` is not yet a delivered main regression.
Boat integration must first deliver its reviewed source-built runnable equivalent
and update stale model-node/hash assumptions, input/driver/roof/seat checks without
removing coverage. Its exact shipped command belongs in the boat acceptance
receipt and becomes mandatory before/after Phase 1. New `environment-check.ts`
and `check-environment-browser.py` are additional planned checks, not claimed
existing passes. The unbuilt world/aircraft preview TS files are useful diagnostic
fixtures only after explicit reproducible local builds; do not navigate raw TS
in a static server or deploy dev controls accidentally.

Interactive acceptance is a separate full matrix: all required vehicles, seats
and weapons; actual input, own ammo/projectiles/targets/fuses/damage, driver
visibility and seat transition, roof low/banked/all headings, ordinary return,
death/respawn where appropriate and fresh restart. Measure actual frame triangle
peaks including weather. Verify HUD contrast on the rendered backgrounds and
listen to synchronized weather/weapon/engine behavior; mocks and PCM remain
separately scoped. No single vehicle, representative weapon or flattering camera
can close the matrix. Unavailable hardware gets an honest host-specific receipt,
not fabricated functional acceptance or a waived required test.

Before each separately authorized release, run the unchanged mandatory
`xvfb-run python3 scripts/smoke_test_games.py` across all 125 catalog entries
using the disk-safe batch/release procedure. Default waits and failure filtering
remain unchanged. Enumerate all visits and duplicate/missing IDs in aggregate;
report inherited exclusions separately from retained errors. Re-run a load-related
goto timeout quietly before classifying it, preserving the original failure
receipt. Never add a real defect to an allowlist. Any failed required gate blocks
push. Following an authorized green push, compare the live GitHub Pages
`games.json` ID set with local; record pushed SHA, response evidence and deployment
status. A stuck Pages build follows the existing approved workflow, not another
source push or weaker gate.

## Phase 2: multinational jet roster expansion, queued only

Direct operator addition, 2026-10-19. Add several selectable aircraft to existing
Wings, not new portal games, catalog IDs or a new engine. **Do not start this
phase before the current boat gate/push and live verification land.** Today's
only action is this plan update and read-only registry/rights-context inspection.
The current push authorization does not make a historical gate cover this batch.

### Chosen first batch and registry evidence

Choose THREE airframes for genuine multinational coverage, not more US types:

| Candidate | National/design lineage represented | Recognition and class distinctions to study before specification |
| --- | --- | --- |
| MiG-29 | Soviet-origin design; Soviet/Russian family representation | Conventional wing, broad blended wing roots, separated twin engines/nozzles and twin fins; verify exact variant, intakes, gun location, pylons and tail geometry from references |
| Dassault Rafale | France | Close-coupled canard/delta, twin engines and single fin; verify canopy variant, intake contours, internal cannon and actual store/rail layout |
| Chengdu J-10 | China | Canard/delta with one engine and one fin; verify variant-specific chin/ventral intake, forebody, gun and underwing/belly stations rather than shrinking a Rafale |

These are the selected subjects, not frozen variants or dimensional constants.
The study must pin one exact variant per subject before any generator work.
Do not mix a trainer canopy, later intake and earlier wing into a fictitious
hybrid, or invent a second physical cockpit for a single-seat variant. If the
game retains an abstract second weapon seat, describe/test that arcade convention
honestly; it must not become false operational-aircraft documentation.

At main `f2bda9f`, a balanced-boundary pattern read of the actual built aircraft
registry found `f15,f35,fa18,apache,a10,yf12,b2`. The private tuning table has
`fighter,apache,warthog,blackbird,bomber,f15,f35,speedboat`. None of the three
chosen subjects is selectable in either inspected set. Tracked Wings mention
search also found no selected subject. This is a dated absence check, not a
reservation of future kind names or slots. Recheck the ACTUAL served registry,
source descriptors, model paths, caller maps and pending commits after the boat
push; current private staging is not the final allocator.

Proposed kind labels `mig29`, `rafale`, `j10` are provisional until that recheck.
Append after the existing roster without shifting existing keys or selection.
For more than nine entries, use the existing scrollable MenuNav/Enter/touch path;
there is no `Digit10` browser key. Test every entry's visibility, keyboard focus,
44px controls and mobile scrolling instead of introducing a speculative menu
framework or silently removing old shortcuts.

Reserve, NOT part of this first batch: Eurofighter Typhoon (multinational European
programme, not purely UK), Su-27/Su-34 (another Soviet/Russian family), Harrier
(British-origin VTOL family with variant-specific international development),
Mirage and historical US F-4. Three different national/design families give a
clearer first result than multiple US aircraft or two near-duplicate Russian
families. Harrier requires honest hover/transition/vertical-landing physics and
its own acceptance contract; do not fake VTOL with an ordinary jet or a hidden
heli flag. No optional reserve is an automatic extra addition.

The operator's examples are not hardware specifications: do not invent a Typhoon
cannon pod from the example text, or label a Su-27 layout a generic twin-stinger.
Verify each variant's internal cannon, engines/nozzles, tail/stinger and stores
from the reference study. National origin alone does not prove unique gameplay.

### Phase 2 study and rights gate before modeling

Read the complete P0-A/B/D manifests and the independent challenge/checklist,
current F/A-18/F-15/F-35 receipts, all final family GLBs and the exact selected
variant references. Repeat family measurements: source/converted bounds,
triangles/vertices/bytes, assignments versus unique materials, paint/PBR colors,
pivots, occupied pilots, stores/slot order, exhaust, gear, shadows and cameras.
Trace actual consumers through spawn, simulation, combat, bots, UI, audio,
snapshots and build. No generator edit before this study is reviewed and lands.

For every candidate record at least two complementary authoritative or otherwise
well-supported reference sources, revision/access date, variant identity,
specifications and front/side/top/rear/belly contour observations. Prefer
manufacturer/museum/official fact sheets plus legally accessible photographs.
Reference sources have NOT been fetched or rights-verified by this planning edit.
Photographs are study references only: no copied mesh, tracing-derived texture,
image sampling, decals, downloaded GLB or disguised remote asset.

Review `Games/Wings/CREDITS.md` and the F-15/F-35 provenance posture first. That
file explicitly records a missing upstream LICENSE and owner-directed ingestion;
Three MIT and font OFL notices do not license Wings, named airframe designs,
photographs or national emblems. Procedural generation is not a blanket rights
clearance, and an aircraft name/model subject is not an official endorsement.
For each jet preserve actual generator authorship/provider/model, reference use,
source/build revision and all qualifications. Do not invent licenses or assert
that every military design/roundel is public domain.

The operator specifically requested national livery accents. Use vertex-color
material splits only, with small restrained roundels/fin flashes where the
particular insignia's use is reviewed and justified. This is not standing
permission to copy any country's protected insignia. If the actual emblem cannot
be justified, record the issue and propose plain national-color bands or clearly
generic markings; do not claim they are authentic roundels or silently publish
a close counterfeit. Escalate an unresolved requirement rather than fabricate
permission. Dark #1d1f20-#2c2f30 family base remains, with limited colored accents,
not white airframes, flag emojis or textures. Update CREDITS and per-jet docs at
integration with this same honest distinction.

### Per-jet implementation and non-cloning contract

- Extend the existing Python-stdlib deterministic generator, existing Model
  primitives and reproducible `scripts/build_wings.mjs` path. No new runtime
  dependency or separate engine. Each model is original local geometry, not
  another jet scaled/recolored or a downloaded substitute.
- Default band **12,000-18,000 asset triangles per new jet**, including visible
  pilots, stores, fittings and any gear. Any different band requires a reviewed
  concept document before work, with explicit reason and operator acceptance;
  an over-budget output is not its own exception. Measure converted exhaust
  additions separately and include them in scene totals.
- At least **40 meaningful material/primitive assignments**; aim around the
  F/A-18's 151 assignment density where anatomy/detail warrants it. Distinguish
  assignment count from unique material values. Do not pad empty meshes or
  duplicate material definitions to hit a number, and do not assume the boat's
  92 PBR definitions are required on every aircraft. Every definition must be used.
- Recognizable silhouettes require independent reference comparisons and parent
  pixel judgment. MiG-29 wing/root/intake/twin-tail anatomy, Rafale canards/delta/
  twin nozzles and J-10 canards/intake/single nozzle must remain distinguishable
  without labels, camouflage or a flattering camera. No '-style' disclaimer as
  cover for the wrong shape. Preserve finite indexed geometry, valid root/units,
  watertight opaque volumes, correct winding, intentional glass and no resources.
- Stores/pivots/afterburners must be non-empty and attached to actual geometry,
  class-true for the frozen variant. MiG and Rafale twin exhaust arrangements
  cannot be replaced by one shared J-10 nozzle; rails, gun muzzle and pylon layout
  come from their own anatomy. Canards/control surfaces animate only if wired to
  a real supported mechanism, not decorative empty nodes.
- Derive launch origins, articulated limits where relevant, cockpit/crew, chase,
  shadow and placeholder dimensions from each GLB's composed geometry. Reuse
  proven runtime mechanisms, not another aircraft's constants. Occupied pilot
  pivots must really show/hide with seat transitions; no phantom second canopy.
- Design distinct justified arcade fits/handling per airframe after studying the
  actual weapon/flight tables. Reusing a shared gun or seeker physics category
  can be legitimate; cloning every tuning row or falsely claiming US-named
  missiles are the real national equipment is not. Separate generic arcade IDs
  from any researched visual-store identity. New weapon IDs/mechanics require
  explicit source semantics, fixtures, audio/HUD and wire compatibility, not an
  unknown-ID fallback to missiles. No new weapon system merely for a checklist.
- Trace ALL kind-dependent maps: types, VEHICLES, render CONFIG, flight handling,
  armor/class multipliers, spawn/validation, bot weights, audio, cameras, HUD and
  UI/thumbnail shortcuts. Preserve every existing slot/loadout/state transition;
  default new bot spawn weights to zero until a separate measured balance choice.
- Keep a ledger of actual total visible scene triangles and draws for every new
  jet, existing-plus-new mixed encounters and weapon/effect peaks, all required
  weather/day and quality states. **Full scene stays below 120,000 visible
  triangles**, including world/fleet/rain/exhaust/crew. Raw asset sums or isolated
  preview scenes do not pass. The P1 high-water/rain warning is still relevant.
  If the baseline already violates the budget, report measured evidence and
  seek a separately reviewed fix; never raise the cap, hide selected aircraft
  for a benchmark or exclude the expensive roster cell to claim acceptance.

### True-angle, CPU and interactive receipts for EACH jet

Each jet gets its own durable study/rights, generator/hash/stats, raw views,
converted/native views, CPU checks and normal-input gameplay receipt, plus a
batch summary. A batch PASS cannot cover an untested member. Record build/register
commits as Wings vehicle integration, not portal-game registration.

Required raw and converted views: true front, side, top, rear, lit belly, both
quarters, plus low/banked camera sweeps across the frozen full heading set.
Record camera position/up/view/projection and actual model transform, lighting,
backend, viewport/theme and GLB hash. Store PNG files and their MD5 checksums;
MD5 is only a distinctness check, with SHA-256 for artifact binding. Require
MD5-distinct views within a fixed jet/theme/viewport set, DIFFERENT camera poses
and model foreground/projection evidence too: headers, random noise or theme
changes alone must not manufacture distinctness. Do not weaken a failed mask,
normal or clipping assertion. Parent reviews at least two opposed angles AND
belly/low views before any model acceptance; the full prescribed image set and
independent lane remain mandatory, not a two-image shortcut.

The second lane independently challenges silhouette against source references,
canopy/roof invisibility, glass/backface/depth behavior, mirrored normals,
gear/store clearance, crew clipping, exhaust/cone direction and real station
positions. Preserve before/failure images and iterate until the quality contract
passes. No two-roll cutoff for quality; tooling failure rules remain.

CPU regressions must cover deterministic committed bytes, budgets/material use,
composed identity/rotated hardpoints and cameras, every pivot's geometry, actual
ammo/store depletion and regeneration, exhaust throttle/boost, crew/seat cleanup,
valid/invalid spawn, ordinary input flight, snapshots and original roster parity.
Rebuild source tests, do not compare against a stale binary. Add the three exact
new kinds to the expected roster without relaxing preservation of old entries.

Interactive, per jet and per weapon/seat: normal menu selection/spawn, takeoff,
climb/turn/boost, chase/cockpit/gunner views as supported, aiming/acquisition,
each own weapon firing with ammo/authoritative projectile/owner/target and
impact/fuse/damage evidence, correct visible store/exhaust response, pause/seat
switch, death/respawn, ordinary menu exit and fresh restart. Bot projectiles are
not player fire. CPU-positioned targets or an isolated rig fixture are labeled
and cannot close this normal-input matrix. Capture screenshots with the actual
new national-accent model in the native game, including low/rear headings and
occupied cockpit geometry. Preserve hardware limits without inventing a PASS.

### Phase 2 lane queue and file leases

Use the common prepared-diff/no-commit envelope. Orchestrator reviews EVERY
line before explicit commit approval. Runtime/review pin is
**openai-codex/gpt-6.1-sol** (high for runtime, xhigh for independent review).
Mesh generation pin is **openai-codex/gpt-6-astra**, high. The operator's
quality-over-speed rule applies: modeling iterates until the contract genuinely
passes, across transparent bounded work sessions without rushed first-roll
acceptance. No worker pushes.

| Lane | Goal/model | Sole file scope | Paste-ready brief after common envelope | Required evidence |
| --- | --- | --- | --- | --- |
| P2-S | Registry/variant/rights/family study; sol xhigh | `docs/maintenance/audits/wings-multinational-study.md` | Recheck current registry and pending changes; freeze the three variants, trace every shared consumer, measure the whole family and qualify references/insignia rights before modeling. | Variant/reference and namespace table, GLB family measurements, class-specific rig/loadout design, explicit rights findings |
| P2-M1 | MiG-29 model; astra high | `Games/Wings/verification/generate-models.py`, SERIAL lease 1 | Extend only the reviewed variant's original generator using shared helpers; preserve all prior bytes; produce experimental GLB and true-angle evidence; iterate on independent findings, return prepared diff. | 12-18k, >=40 meaningful assignments, deterministic hash, recognizable referenced anatomy, real twin exhaust/stores/pilot |
| P2-M2 | Rafale model; astra high | Same generator, SERIAL lease 2 after M1 review/commit | Implement the frozen Rafale variant independently, no MiG/F-15 mesh/constant clone; preserve all previous generation; model-derived canard/intake/nozzle/store/camera facts. | Same full contract and unique per-jet anatomy/pixel/rig receipt |
| P2-M3 | J-10 model; astra high | Same generator, SERIAL lease 3 after M2 review/commit | Implement the frozen J-10 variant, especially real intake/forebody and single-engine anatomy; preserve every previous model and keep national markings qualified. | Same full contract, no resized Rafale, all reference/pixel/geometry evidence |
| P2-T | Kind/type contract; sol high | `S/src/sim/types.ts` | Add only reviewed kinds/needed fields; trace complete wire/decoder and caller closure, no speculative new network subsystem. | Strict roster/type/wire and original compatibility checks |
| P2-V | Tuning/weapon fits; sol high | `S/src/sim/vehicles.ts` | Append exact reviewed specs with geometry-derived coordinates and justified distinct arcade fits; preserve existing entries/order. | Per-jet tuning, launch-point/slot semantics and preserved old roster tests |
| P2-C | Descriptor/converter integration; sol high | `S/src/render/aircraft.ts` | Wire every real pivot/store/exhaust/pilot and authored material path; reuse existing mechanisms without copying wrong coordinates or globally remapping paint. | All three actual converted models, rig attachment/animation/PBR and original converter parity |
| P2-F | Handling; sol high | `S/src/sim/flight.ts` | Add only the justified handling rows for the reviewed conventional jets; no VTOL/airframe class invention. | Ordinary-input takeoff/turn/replay and original handling invariance |
| P2-K | Cameras; sol high | `S/src/render/camera.ts` | Use each GLB's composed crew/optical points and measured bounds; test all supported seats and views. | Identity/rotated camera math and real native view clearance |
| P2-A | Engine voice tables; sol high | `S/src/audio/engines.ts` | Map all kinds intentionally through the existing voice lifecycle; no recording/authentic-sound claim without evidence. | Finite parameters, audible event/engine review and disposal/parity checks |
| P2-U | Roster UI; sol high | `S/src/ui/spawn.ts` | Expose every new aircraft with truthful controls/role/crew/weapon copy and accessible scroll/focus; preserve old shortcuts and never invent Digit10. | Full roster keyboard/touch/mobile and every entry's actual spawn |
| P2-Q | Model regression; sol high | `Games/Wings/verification/check-models.py` | Add all three committed generators/hashes without removing old budgets, normal/closure/material assertions or deterministic checks. | Each model and entire old/new committed set pass against fresh generation |
| P2-R | Independent anatomy/gameplay challenge; sol xhigh | `docs/maintenance/audits/wings-multinational-challenge.md` | Read every prepared diff and per-jet receipt; challenge every chosen silhouette, national mark, rig/weapon/normal/pixel/budget claim. Do not accept its own implementation. | Resolved counterexamples, no missing jet/weapon/angle/matrix cell, explicit final HOLD/PASS |

The generator leases are deliberately sequential, never concurrent writes to
one file. Only one may be active; freeze its bytes/diff/evidence before assigning
the next. Parent delivers accepted GLBs, previews, per-jet receipts, CREDITS,
manual/inventory and the reviewed regenerated patch/bundles as separate explicit
milestones. Shared runtime paths overlap Phase 1: serialize those owners only
after weather interfaces and source baseline are frozen. Additional map owners
(combat armor, bots, lobby/controller, SFX or fixtures) get separate one-file sol
lanes only when the complete caller trace identifies a real required change;
existing owners must not silently expand scope.

Phase 2 references/rights study may be queued after the boat push and P0 verdict;
modeling requires that study's reviewed commit. Default sprint order is P0,
then P1, then P2 integration. No Phase 2 source branch is based on stale private
pre-boat work. Do not overlap its runtime edits with active weather owners.

### Own batch release gate and reporting

After all three per-jet contracts, exhaustive interactive matrix and independent
review pass: commit clean source/model/build/manual/inventory milestones, run all
existing/new static/CPU/browser regressions, then its OWN unchanged mandatory
full **125-game** smoke gate with disk checks and release-between-batches.
Neither the boat gate nor a Phase 1 weather gate can substitute. No filtering
real defects, representative-jet acceptance or inherited green report.

A failed per-jet, scene-budget, interactive or full-catalog gate means no batch
push and an evidence-based report. Preserve known rights/hardware qualifications;
ask the operator about an unresolved release exception rather than invent one.
After an authorized green batch push, report pushed SHA and verify the live
`games.json` ID set; catalog count remains 125 unless separately ordered otherwise.
Report per-jet source/model/build/selectable-registration commits, final hashes,
triangles/assignments/materials/batches, reference/rights note, all-angle files,
weapon/lifecycle matrix, scene peaks, review verdict, regressions, gate tally and
exclusions, storage delta and every remaining limitation. No Phase 2 implementation
or external acquisition is performed by this planning update.

## Completion contract and immediate next action

This plan has no Phase 0/1/2 execution PASS. Orchestrator must review every worker
diff line by line BEFORE its next commit, then pixels and gameplay receipts in
full; summaries/log-tail samples are operational monitoring, not code review.
Independent review must challenge, not rubber-stamp, the transferable checklist.
Quality iteration has no two-roll cutoff. Tooling failures get honest retries,
then escalation; advisory timeout alone does not stop safe zero-growth reading.

Immediate work after this planning-only commit: resume prepared #30/#32 without
discarding changes; read the full #31 audio diff before approval; review #27/#28
and every earlier private worker diff. Finish the roof/driver/controller/build and
actual boat tests, then full fleet gate and conditional push/live verification.
Do not dispatch any Phase 1 or Phase 2 implementation worker from this plan until
its stated dependencies land. The multinational phase does not delay, replace or
weaken the current boat roof/driver, interactive, full-gate and push conditions.
