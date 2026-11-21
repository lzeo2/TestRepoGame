# Canberra life and three-character campaign

Updated 15 November 2026. Existing original Capital Drive 245; this extends PR21's shared
people and vehicle contacts. All characters, businesses, dialogue and missions
are original fiction. Geographic source facts remain separate from authored
architecture, room layouts, landscaping and gameplay.

## Campaign and controller

Campaign offers Kit Vale (18, Telopea student), Rowan Pike (29, Civic analyst),
and Milo Finch (26, basement regular). Each has two different playable opening
missions. All six introductions lead to Three receipts, where the other two
characters appear at a collision-checked Kingston public approach. The retained
six shared chapters now have assigned protagonists and heist objectives; see the
[story and streaming contract](capital-drive-story-and-streaming-contract.md). Character palettes persist through foot, driving,
Yoober/bus passenger and workout views. Melee now has windup, extension, return
and alternating fists; the existing gameplay owner still applies damage.

| Protagonist | Opening missions | Link to the shared story |
| --- | --- | --- |
| Kit Vale | False start enters the after-hours school wing, triggers its alarm task and requires an outdoor escape; Extra credit covers a real Coals stock shift. | Delivery stickers carry Mara's fictional depot code. |
| Rowan Pike | Present tense plays the failed slideshow task; Lunch breakpoint visits the restaurant counter and resolves the booth dispute. | Disillusionment with the office leads to Mara's receipt-based courier work. |
| Milo Finch | Touch grass packs the ledger at Milo’s named enterable Jardine Street safehouse, then completes a stock shift; Signed for delivers a sealed parcel to Kingston. | The parcel receipt matches the other two depot clues. |

Three receipts brings the adults to the Kingston approach before a drive to the
Crescent starts their shared chapters. Short supplied-clock caption scenes now
introduce each chapter using the existing world and camera. Skip starts the actual
mission; Back to briefing cancels without reward. Work chapters disable attacks.

Rowan's first mission uses the actual Centre PowerPunt workstation. Three fresh
X/Y/X edits lead to an authored Microstall sync outage; only a validated terminal
activity event produces the presentation serial. Lunch then uses the actual
Lambzhou guest encounter: she throws noodles at Rowan, then attacks him. This
mission requires the actual fresh `noodle-fight` outcome; an ordinary apology or
confrontation cannot satisfy it. Work objectives likewise require a new completed shift
from the matching store. Starting a mission records serial baselines, so older
events, sandbox travel, repeated input and caller-shaped outcomes cannot earn it.

Campaign saves are strict v2: selected character, ordered prefix for each intro,
meeting flag, legacy flag and the retained six-chapter prefix. Existing v1 saves
migrate without replaying rewards or losing completed chapters. The same career
writer commits campaign progress and cash. Transient missions/encounters are not
saved. Denied/corrupt saves remain unwritten. Between any two missions, J opens
Campaign and permits switching to any of the three adults, even partway through
an introduction. Each ordered intro prefix is retained independently, and v2
saves accept multiple partial introductions. Active missions lock selection;
completion, cancellation or failure releases it. The later [cache/performance continuation](capital-drive-cache-and-performance-contract.md)
restores each hero’s separate saved pose, health, car and ammo on selection,
without granting cash. `character-start.js` prepares a hero’s first-visit
spawn, separately parks the car and checks a clear foot pose; all three starts
were tested against actual expanded geometry and parked cars.

## Active rooms, equipment and people

Room layouts now distinguish groceries, fast food, cafes and general retail.
MacDawdles has kitchen/pickup/booth forms; Coals has aisles/checkouts/fridges.
Every mapped shop's counter and task remain reachable. The Centre uses an
inscribed source-footprint wing with original Monaro-inspired stone portals,
coffers and patterned flooring. This is a **partial ground-floor interpretation**,
not a verified copy of the whole centre or its tenant floorplan.

Four gym activities use distinct controls: six bench reps with held X+Y and timed
ArrowUp, twelve alternating treadmill taps, six sustained alternating curls,
and six held X+Y rowing drives followed by releases. E or Q starts at equipment;
the panel displays the actual cues and price. Completed results can be dismissed
with Done, and old results clear when walking away. Equipment-linked participant
poses use the actual plan anchors and selected hero palette. The default gym is
retained and three source-backed parody gyms are added.

Paid workouts start the actual activity before Progression captures its frozen
room/station/session. Completion requires that same live terminal session,
reach, sight, career mode and respawn identity. Cost and fitness apply once on
success; leaving, cancelling, recovery, wrong session or caller booleans do not
pay. Level-three and Free-roam workouts are practice. Four-workout source tests
cover the real session, wallet and legacy-save owners.

Lambzhou's exterior window cook and lazy indoor cook pull bounded original
noodle strands. A fictional booth guest wears pink earmuffs and objects to a bag
on the floor. Live nearby dialogue can be resumed after Esc. Ordinary encounters permit a
peaceful apology or confrontation. During Rowan's lunch objective, both replies
lead to a 0.75-second windup, a 0.55-second bowl/noodle flight and then live melee.
The released bowl follows its captured trajectory if Rowan moves away. No timer
alone grants mission credit: a validated throw and actual emitted melee are both
required. Nonlethal interruption or calming down permits a fresh nearby retry
without stale throw credit. The effect adds 12 strands and five bowl instances
to the existing accessory batch (93 total capacity), retaining six room-person
draws and no new geometry per frame. Only the actual validated outcome increments
the encounter serial. Sight, health,
coercion, cooldown and pause guards remain authoritative. Free roam retains its
existing player-health protection. No allegation or likeness of a real patron
is represented.

## Streets, landscape and resource bounds

- Source lane/sidewalk tags drive major-road paint and pedestrian ribbons.
  Hindmarsh has actual two-, three- and four-lane source runs. Road widths remain
  unchanged. The existing **40-car** pool favours nearby major corridors; a test
  with all ground rails admits 17 Hindmarsh cars, 16 moving with clear full bodies.
- The hashed street-assets export contains 388 deduplicated stop facilities,
  13 fuel sites and 24 fitness venues. Furniture is omitted where roads/buildings
  obstruct it; shelters require source shelter evidence. No unsafe roof/body
  replacement is made: all six evaluated canopy matches fail 95% coverage.
  Visible petrol details are therefore conservative, not complete rebuilds.
- Two fictional bus circuits now physically serve exact source stops 2255/2376,
  brake, dwell seven active seconds and resume. These are not ACT timetables.
- Highway rails use 73 exact OSM ways: 998 evidence segments, 658 ground collision
  strips, including 49 by Hindmarsh. The 340 elevated/bridge segments are omitted
  from flat collision/rendering to avoid walls below bridges. Visual/collision
  strips share geometry; rail height is an authored 0.75m estimate.
- Actual ACT suburb attributes guide Red Hill/Narrabundah materials, gardens,
  verandas and rear shelters. Street furniture avoids driveway corridors. Twelve
  original kangaroos occupy a verified source Red Hill reserve boundary, with
  near-only grazing animation. They are not surveyed animal locations.
- Estimated Telopea gate-11 landscaping adds rocks, Australian/Aboriginal flags,
  a waratah planter and dates. Three original notices reference local history at
  Manuka/Kingston anchors. No official signs, murals or reference imagery are copied.

New views are pooled and use supplied clocks: street furniture one draw, wildlife
one, rails at most two/600 instances, story cast seven for two adults; indoor
people retain six batches/16 NPCs plus one workout participant. The cook adds two
near-only draws within40m. Interior geometry remains one lazy merged mesh; the
expanded Centre wing is 3,864 triangles. Static props cull locally and add no
lights, reflections, remote assets or animation loops. These bounds are not an
Intel N100 FPS measurement.

Exterior world and neighbourhood views now allocate nearby 350m chunks and evict
far geometry; full source geography, navigation, addresses and door metadata stay
loaded. Actual-map paired buffer measurements and the retained native limits are
in the [follow-up receipt](verification/capital-drive-campaign-followup-2026-11-15.md).
These are attribute-buffer measurements, not total browser memory or FPS.

## Reproduce and known limits

Run `python3 -B scripts/check_capital_drive.py`; use its `--life-browser` selector
for the native life suite, or the script's individual campaign/restaurant/gym/
scenery scenarios with a fresh external output directory. The runner installs
nothing. Source builders and limits are in the
[source record](capital-drive-canberra-life-sources.md), and actual results and
retained failures belong in the dated verification receipt.

New Street View inspection failed at the browser-control connection before any
panorama loaded. Earlier dated samples and official architectural/source records
remain evidence; no fresh panorama is claimed. The exact Centre floorplan remains
unverified. Highgate's source-tagged 2.2m building passage conflicts with a solid
ACT body; its opening is not fabricated or its building removed. A separately
checked public detour supports the gym approach. Airport coverage remains a later
expansion. Whole-city accuracy and N100/native GPU performance remain open.
