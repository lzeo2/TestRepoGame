# Capital Drive: crew, city and mobile continuation

15 November 2026. This continues existing game245. The controller retains one
world clock, input owner and career writer. There are no new dependencies,
runtime services, game registrations or external downloads.

## Input and crew

`touch-joystick.js` captures one pointer per fixed circular base. Independent
movement and camera sticks use a radial dead zone, clamped analog travel and
44px thumbs. A second finger cannot release another control. Up accelerates;
down brakes/reverses; foot motion follows camera yaw. Pointer cancellation,
capture loss, pause, blur, resize and mode changes clear input. The existing
loop supplies camera time. Keyboard/mouse remain available, including Z to aim.
The mobile guide names the sticks and USE button. Both themes reserve space
above the thumb area for maps, feedback and the tutorial.

Living campaign companions board free passenger seats in a stopped manual car
through checked local approaches. Original fleet seating estimates allow one
companion in sports cars and small utility cabins, two in the other supported
cars. This does not change the shared fleet ABI. Seated identities follow the
actual car after physics, leave the pedestrian collision index, and use the
shared seated person rig. Exit positions use the same world/vehicle sweeps and
bounded retries. Wounds, cooldowns and identities survive entry and exit;
downed companions cannot board or respawn.

Armed passengers fire only through the exposed right-side window, within the
existing range/cooldown/event limits and actual line of sight. The opposite
side of the car and buildings block shots. Return fire uses the exposed window.
No car seat creates an invisible standing adult or remote melee body.

Campaign's character menu permits a live ally transfer only during compatible
shared exterior foot, driving-approach or escape stages. The player must be on
foot; a live ally must have a clear location within80m and be out of the car.
Introductions, theft challenges, scripted receipts, interiors, cutscenes,
activities, passengers, recovery and mission previews remain locked. A transfer
exchanges the real bodies: it preserves the mission stage/time/receipts, police,
wanted level, wallet and car; selected health comes from the live ally and ammo
from that hero's checkpoint. The former leader retains their actual wounded
body and the third ally is unchanged. It does not restore a distant checkpoint,
refill equipment, clear pursuit or replay rewards.

## Gameplay owners

| Owner | Behavior and authority |
| --- | --- |
| `campaign.js` | Signed for's Kingston arrival now matches its public Jardine Street GPS endpoint, formerly76.811m outside the objective. Three appended shared chapters use actual stock/noodle shifts, two independent till robberies, packing, a getaway car, bridge travel and escape. Existing save prefixes remain valid. |
| `hero-powers.js` | Kit's Adrenaline increases foot speed/jump; Rowan's Focus shortens gun/reload timing; Milo's Redline increases engine/grip while manually driving. L or POWER activates8seconds, with independent40second cooldowns. Supplied time, interrupted actions and hero changes cannot reset cooldowns. No health/ammo grants. |
| `progression.js` | Owned legal cars have two paid tiers each of engine, brakes and handling. Purchases require the existing garage, a stopped healthy current car, ownership and cash. Old saves receive stock tiers. Damage and paint remain intact. |
| `simulation.js` / `gameplay.js` | Tiered acceleration, braking and steering and active hero modifiers affect the actual simulation. Stock trajectories remain equal to the pinned pre-extension implementation. Physical sweeps and contact authority remain unchanged. |
| `ordnance.js` | V throws a grenade, C smoke; shops sell bounded stock. Preflight precedes exactly one inventory debit. At most4projectiles/3smoke clouds; supplied-time fuses emit once. Grenades have8m physical-LOS falloff, including self/car risk. Smoke has a finite10second sight-blocking cylinder, confined to its room. |
| Adult pools | Blast damage is radial, with linear falloff, physical obstruction, dead/cooldown guards and bounded victims. Existing gun cones and melee behavior remain. |
| `pedestrians.js` | Actual approaching vehicle contacts at8m/s or above launch street pedestrians into a bounded2.8second articulated fall/get-up. Roots retain swept collision and indexed body positions. Mild bumps remain grounded. This addition does not ragdoll officers, crew or occupants. |
| `vehicle-damage.js` / view | The full player car crumples with actual condition. Private geometry copies preserve shared models. Engine fire below25condition requests2condition/second; repairs above30 extinguish it. Wreck effects expire after10seconds. Instanced traffic does not deform. |

Free roam can practice equipment without spending or earning career cash.
Protected jobs/tutorials keep their attack lock. Ordinary wanted jobs and legal
purchases retain their established rules. None of these modules owns storage.

## Environment and geography

The [airport source record](capital-drive-airport-sources.md) distinguishes OSM
roads, footprints and airfield surfaces from estimated architecture and terrain.
The new seventh local map sidecar connects Pialligo and Terminal avenues to the
original network. The terminal exterior and two runway axes are represented;
there are no airline services or enterable terminal rooms in this continuation.
Airport geometry streams in500m cells, at most28resident/two builds per update.
Its queue cannot keep a paused interior rendering. Existing source tiles and
their heights remain intact; the eastern apron and terrain transition are marked
estimates. No new Street View observation is claimed.

The existing footprint-derived rear-garden planner now shows terrain-draped
lawns and deterministic clotheslines in Low, with the existing Standard props.
Rendered fences and immutable collision polygons share their corners and a1.8m
rear gate. Low and Standard admit the same lots. Existing front doors remain;
gardens stream and dispose with their existing chunks.

`atmosphere.js` advances a12minute day from15:00 and a deterministic
clear/overcast/rain cycle with smooth transitions. Its view adjusts the existing
sky/fog and two lights. Rain is one fixed local line batch:160segments in
Performance,320otherwise, hidden indoors. There are no weather textures,
postprocessing, added light grids or shadows. Night has a playable ambient floor.
These resource bounds do not establish N100 frame rates.

## Stealable jets

Two original unbranded jets occupy fictional checked stands inside the sourced
apron polygons. Search for a jet stand, approach its actual door on foot and
complete the existing eight-cue vehicle challenge. Career theft reports an
offence; Free roam practices without writing progression. No click awards cash
or skips a mission. Active work, missions and other rides prevent admission.

Flight uses the same supplied world time. W/S adjusts throttle, A/D turns,
Space climbs and Shift descends; mobile uses the movement stick and explicit
CLIMB/DESCEND buttons. The pilot seat supplies actual altitude to the camera.
The old car remains parked, attacks and unrelated transport are blocked, and
flight cannot advance ground jobs or mission stages. Ground and wing probes,
source-building heights, terrain and bounds constrain movement; this is a
simplified arcade flight model. Land and stop before a swept, checked exit.
An unexitable wreck offers medical rescue through the existing recovery owner.
Police use physical altitude for sight, arrest and gun range rather than
shooting a distant airborne pilot as though they were on the pavement.

The view retains two original meshes, two draws and292triangles. No flight
services, external aircraft assets, weapons, real-world aircraft schedules or
unbounded effects are added. Native theft/takeoff/landing/exit checks complement
the source physics, collision and controller regressions.

## Reproduction

Run the source runner, then the bounded native flows on a stable source tree:

```sh
python3 -B scripts/check_capital_drive.py
python3 -B scripts/test_capital_touch_browser.py --capture --output <fresh-external-dir>
python3 -B scripts/test_capital_extension_browser.py --capture --crew --output <another-fresh-external-dir>
python3 -B scripts/test_capital_aircraft_browser.py --capture --output <third-fresh-external-dir>
```

The extension harness labels seeded campaign progress as a fixture; subsequent
inputs use ordinary controls. Native touch tests use actual CDP multi-touch.
Headless OS blur delivery remains unverified; its synthetic blur-event negative
fixture is explicitly labeled. There are no production state setters or private
developer inputs in these flows. Temporary servers/browsers must terminate.

After final runtime edits rebuild and check the content-versioned asset closure.
The seven-file startup allowlist, boot request, stored-map tests and offline
evidence must agree. Reconcile the maintenance inventory only after committing
the source. Preserve failed attempts and distinguish pure, native and device
performance evidence.
