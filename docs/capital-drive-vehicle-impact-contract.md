# Capital Drive: vehicle knockback and player ragdoll

15 November 2026. The owner requested visible launches from fast car hits and
ragdoll reactions. This extends the existing player/vehicle collision system;
it adds no physics dependency, second loop, extra crowd or external asset.
The [indoor pursuit continuation](capital-drive-indoor-pursuit-contract.md) and
[verification receipt](verification/capital-drive-indoor-pursuit-2026-11-15.md)
record the other changes in this release.

## Contact authority

`simulation.js` already blocks moving full vehicle bodies against the indexed
on-foot player body. Previously that sweep returned only blocked movement, so
the car stopped without transferring any force to Gameplay. An actual approaching
`moveVehicle` contact now records the vehicle's pre-stop velocity, closing speed,
vehicle ID, player-body ID and outdoor space. The same path serves traffic,
buses, Yoober, patrols and the player car. Ordinary `canOccupy` probes, stationary
or departing cars and non-player adults do not create player-impact events.
The queue is capped at32, deduplicates each vehicle/target until drained and
clears on world reset. Existing car/people blocking is retained.

`gameplay.js` consumes those events in its supplied-dt step before braking can
erase their speed. Only a live on-foot non-passenger in the same logical space
can be hit. The strongest eligible contact wins; a0.8s cooldown and equal/weaker
active-hit guard prevent repeated blocked sweeps from stacking a launch. A car
outside cannot hit a generated room's overlapping coordinates. Being hit does
not report the victim to police.

## Launch, landing and recovery

Closing speeds below8m/s cause a short grounded nudge. At8m/s and above, a bounded
horizontal impulse and the existing gravity/jump-height owner launch the player.
Accepted severity clamps at34m/s: horizontal impulse2.5–14m/s and initial vertical
speed3.5–8m/s. These are original arcade tuning, not a biomechanics simulation.
Horizontal motion uses the same swept actor movement as normal play, including
walls, water, vehicles and the controller's adult clipping. Airborne visual
height does not disable those colliders or permit wall tunnelling.

Launch reactions last2.6active seconds; small bumps last0.3s. Normal walking,
jumping, aiming, attacking, reloading and E interactions are denied through the
reaction, then resume. Existing pause/dt clamping remains. Reset, passenger
attachment and medical recovery clear transient momentum/pose. These fields
are not added to career saves or dormant-character checkpoints.

Career damage starts at5m/s and caps at36per accepted contact. Free roam shows
the physical reaction while retaining its health protection. A lethal vehicle
hit keeps the health-zero body falling for the bounded reaction before the
existing medical recovery begins; it cannot heal, attack or be arrested during
that fall. Other knockouts keep their existing medical transition. Recovery
still belongs to Gameplay and its existing career penalty callback.

## Articulated presentation

`actor-view.js` reuses the player's existing torso, head, hips, knees, shoulders
and elbows. Its bounded joint solver receives Gameplay's impact serial, direction,
strength, duration and jump height. It does not grant damage, change world pose,
move a car, advance a mission or run a second animation clock. It is limited to
the visible player, with no ragdoll simulation for every distant NPC.

The view blends out ordinary walking/aim/punch poses during the fall and restores
them after recovery. Ground correction uses the same supplied ground sampler.
An already launched health-zero player stays fallen through the medical fade;
an unrelated ordinary knockout does not independently start a vehicle ragdoll.
Vehicle root travel remains authoritative swept Gameplay motion; joint motion
is a lightweight constrained presentation rather than a general rigid-body
physics engine. Hardware acceptance cannot be inferred from a small joint count.

## Reproduce

```sh
node scripts/test_capital_vehicle_contacts.mjs
node scripts/test_capital_vehicle_impacts.mjs
node scripts/test_capital_ragdoll.mjs
node scripts/test_capital_gameplay.mjs
node scripts/test_capital_actors.mjs
node scripts/test_capital_character_switching.mjs
python3 -B scripts/build_capital_cache.py --write
python3 -B scripts/check_capital_drive.py
timeout 180s python3 -B scripts/test_capital_vehicle_impact_browser.py --output <fresh-external-component-directory>
```

The browser component fixture uses actual checked-in modules, an explicit test
road/vehicle contact and supplied steps. Its captures establish software-WebGL
rendering of that reaction, not an unmodified native career collision, target
hardware FPS or a fully simulated whole-body/vehicle wreck. Preserve failed
component attempts and source/pose measurements alongside the accepted result.
