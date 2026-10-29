# Jankolock playability overhaul

Scope: repair the existing game, not add another game or claim forty complete
heroes. Keep the supplied originals, ready apex/camera/notice/turn fixes and
all failed native evidence. Source integration stays in this lane; main
integration remains with owner74. No push or browser admission is implied.

## First playable slice and file ownership

1. Simulation combat: `systems.mjs`, its existing regression and a focused
   fairness regression. Real world-unit range/cover checks, short visible
   automatic-attack preparation, and release-time target revalidation.
2. Rails: `traversal.mjs`, focused repeated-use regression. Both endpoints,
   detach, cooldown, safe exit and reset. The integration owner wires free-mode
   cooldown progression in `game.mjs` rather than starting a second loop.
3. Hero AI: `bots.mjs` and its regression. Existing supported hero kits,
   bounded perception, aim preparation, cover/target-loss checks, sensible
   objective advancement and retreat. Exactly SIX AI teammates accompany the
   human, seven friendly members total; three existing enemies stay unchanged.
   Preserve that count at start/respawn/restart, reject duplicate construction,
   and test actual ally damage/objective contribution, not just spawned bodies.
   Minions remain distinct.
4. Parent integration: mutable shared cover wiring, arena/world descriptors,
   objective/identity/health/attack telegraphs, HUD, manual and inventory.

Workers have disjoint paths. Their explicit-path source commits serialize
through one index lock. The integration owner preserves the mixed dirty manual
and two failed diagnostic drafts. No worker stages those paths.

## Map flow before layout changes

The first arena is the existing Midway approach, not a destructive replacement
of the900m district. Preserve the bridge, sewer, side lanes and objective chain.
Prototype boundary: x=-50..50, z=-125..125. Existing approach platforms and
ramps remain measured collision, not scenery-only cover.

```text
                       NORTH / IVORY
               [existing enemy Midway guardian]
                   / covered approach \
        [west flank]   [open court]   [east flank]
             |       sightline baffle      |
             |--- existing raised bridge--|
             |    two clear bypasses      |
        [west return]  [open court]  [east return]
                   \ covered entry /
               [friendly guardian / re-entry]
                    SOUTH / CARBON
```

Design contract: open courts support readable strafing and silhouettes; short
solid baffles break long shots without making a maze. Two flanks prevent a
single camped doorway. Spawn/re-entry is behind solid cover with at least two
exits, not facing an enemy firing line. Keep paths at least6m wide and the
camera boom clear. Lane-squad routes must go around new solids. One immutable
descriptor supplies render/collision/LOS bounds. Preserve rail boarding space
and reuse; no tall decorative blocker inside an apparently open route.

The first active objective is the actual vulnerable enemy Midway guardian:
show its identity, world direction and real HP/progress, then the next legal
objective in the existing chain. Do not invent a competing capture mode or
rewards. Existing Patron win/loss/restart remains authoritative. HUD explains
how this action advances the match, rather than listing every feature.

## Added core acceptance: teammates, camera and objectives

Six AI teammates means six alongside the human, not six including the human.
They actively fight, advance/defend the same legal objectives, regroup and
recover from stuck navigation using normal perception, LOS, health, cooldown
and friendly-fire rules. Ally/enemy identity needs shape/silhouette markers as
well as color. Enemy count is not increased by this instruction.

Subtle voluntary camera bob is now core acceptance. It must follow grounded
horizontal movement/gait, settle smoothly to a stable rest, remain stable when
aiming, and add no gait bob while airborne or riding. Bound amplitude and test
30/60/120Hz movement/rest with no cumulative drift. Provide a persistent bob-off
and reduced-motion option. Keep the logical aiming camera and all shot/hit
calculations unchanged; a separate render pose must retain the same center
sightpoint. This is not permission to mask jitter with shake.

World-space objectives need one clear current goal, shape/label/distance,
progress and a restrained completion sound/visual cue, honoring mute and reduced
motion. Offscreen direction must not imply
a wall-blocked target is directly reachable. Keep enemies and reticle clear.
The simple initial UI mockup is:

```text
WORLD:       diamond + MIDWAY GUARDIAN
             [real HP/progress bar]  45 m
             anchored above its actual structure

OFFSCREEN:   small edge arrow + goal name/distance
CENTER:      existing unobstructed reticle
COMPLETION:  short existing notice + restrained cue, no particle burst
```

Native before/after must judge this implemented view. Renderer doubles and
sampler/AI contribution tests cannot certify actual visual feel.

## Next stages, after core correctness

- Readable hero identity/health and attack preparation first; distinguish hero
  models from minions. Native observation must judge clarity and response.
- Actual model/animation detail uses the standing Astra modeling lane only
  after the core loop is safe. Keep authored rigs/hitboxes and original bytes;
  document derivatives and budget primitives, draws, textures and triangles.
- Earned-resource exchanges reuse existing souls/items/shop authority. Initial
  small choice set: health sustain, magazine utility and traversal. Show exact
  cost/effect and confirmation at marked safe stations. Test affordability,
  deduction/application, replacement/refund policy and restart/save behavior
  before enabling anything. No real money, loot boxes or unchecked bonuses.

## Core implementation checkpoint

Source lanes landed locally: rail `1574dda8`, hero perception/objective advance
`e8825d5b`, physical-cover/wind-up `f67fd738`, exact six-allies roster
`2d90ee90`. The parent integration connects the same mutable collision boxes,
free-mode rail cooldown, motion-preserving traversal handoff, late reset and
world-space team/HP/attack-warning geometry. In-match resets preserve collected
crate sets rather than granting fresh loot.

The `c4259e25` camera-bob sampler has six numeric movement/rest/suppression/drift
groups. It is a building block, not yet live camera integration or persisted
settings. Do not describe camera bob as shipped or visually accepted.

Review gates: 160 actual callback groups, 40 systems groups, 8 fairness groups,
8 rail groups, 26 bot groups, 25 team groups, controller1396 checks, actor-view
and combat-input suites, both600s scripted chains and catalog129. The latter
complete CPU gate took99s before a conservative LOS broad phase and51s after;
this is not a controlled native FPS benchmark. Exact geometry/range assertions
remain in place. Earlier failed rail integration fixtures crossed a sewer under
a flat controller floor and then moved only the controller outside the actual
game tick; the corrected case uses flat ground and real key handlers/tick.
No assertions were dropped to make those setups pass.

Remaining owned stages: actual arena/layout implementation after the sketch,
world-goal labels/progress/offscreen/completion cues, camera bob rendering and
persistent accessibility setting, differentiated animation/model detail, and
earned-resource exchanges. They are not covered by the core-source handoff.

## Gates and remaining limits

Each lane supplies a real causal regression, syntax and targeted checks. Parent
checks integration and exact served entry when browser admission is available.
CPU and renderer doubles are not native playability/animation acceptance.
Native before/after, frame distribution, real rail controls and actual objective
readability remain required observations where a responsive browser is admitted.
Do not retry unchanged failing GPU runs or weaken the60,000-byte aggregate
native diagnostic cap. That separate blocker is not a reason to avoid safely
testable runtime repairs. No blanket inventory refresh or whole-branch merge.
