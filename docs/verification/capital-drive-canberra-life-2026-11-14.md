# Capital Drive city-life verification, 14 November 2026

Scope: the existing Capital Drive 245 after PR21 (`563df198`), three-character
campaign openings, differentiated rooms/workouts, restaurant characters and
source-backed street/suburb details. This is targeted evidence, not a fresh
full-catalog, whole-campaign, photorealism or target-device acceptance claim.
See the [contract](../capital-drive-canberra-life-contract.md) and
[source/reproduction record](../capital-drive-canberra-life-sources.md).

## Source checks

The current runner requires 67 modules, 76 suites and 12 data files; it plans
220 commands and checks 158 required files. The final full run passed **220/220**,
exit0, with 269.21 seconds summed command time. Its retained log SHA256 is
`c8dcc7a3a6cc335b91be359d30345ae03fc21c52de964b097c4a23a8440af3f7`.
Existing shared vendor assets are unchanged; no dependency
installation, remote runtime request or new animation loop was introduced.

The first full run stopped at 188/220: the service-sign test's data-URL loader
did not include services.js's new real street-assets dependency. Commit `9f9ca018`
loads that actual source dependency and preserves all original assertions.
An earlier extracted controller fixture also needed the actual interior sight
callback after beginMini began validating sight; its corrected work-job suite
passed. These failed attempts are retained separately, not counted as passes.

The second full run stopped at 189/220 because the store/precinct exports retained
the old road-profile input hash after lane/sidewalk tags were added. Two builds
from the pinned south/north caches produced byte-identical outputs. Only the
input digest changed in two JSON metadata records; all 21 store and five precinct
descriptors and both generated JavaScript modules stayed byte-identical. The
independent cached store rebuild regression also passed.

Review found one real controller retry race: an old workout cancellation could
clear a newly admitted paid session before the next event drain. The handoff now
matches room, station and session. Commit `4adef7fa` exercises the actual controller
branch across all four workout kinds: stale cancel/complete and wrong room/station
cannot mutate the replacement; its real current completion charges/saves once.

## Native input: 74 checks across four accepted cases

Each case used a fresh browser context, normal keys/mouse and read-only detached
snapshots. Campaign case earned its actual first corporate reward; no save,
money, actor, timer or mission grants were used. Free-roam map travel is identified
separately. All four accepted reports contain zero console/page errors, failed
requests, HTTP errors or attempted external runtime requests. Temporary servers
and browsers were closed.

| External artifact directory | Checks | Seconds | Results JSON SHA256 |
| --- | ---: | ---: | --- |
| `capital-life-campaign-first` | 22 | 188.41 | `b7a76b293193a0bc5851254e1dffd9c185f3cc2cf190a4d870c57f49642aba36` |
| `capital-life-restaurant-final` | 27 | 82.37 | `6ba21c2195b1dd21a51fe0f583a7f40066024146fcaa33a5d8efdf7d4802ef2a` |
| `capital-life-gym-final` | 16 | 194.69 | `3253534302028d2779a07aa93f2b1d431d29f33a31f2bb40208f7eff0a2581ad` |
| `capital-life-scenery-final` | 9 | 65.17 | `a7685ad8fd7a61c38b7cf9bf3371ad13e1bc5b7dc21b8fd07c6f79c57803270e` |

Reproducer: `scripts/test_capital_life_browser.py --scenario <campaign|restaurant|gym|scenery> --capture --output <fresh-external-directory>`,
under Python with `-B` and an outer 600-second watchdog. The script's own budget
is 560 seconds. The runner also exposes `--browser --life-browser --output`.
The four captured cases were run separately, not represented as a single timed
all-case run. Twelve gameplay/UI source hashes were stable during the final cases.

Campaign verified all three fresh choices and clear foot starts without rewards,
then actual Centre entry, PowerPunt X/Y/X, outage serial, outside objective,
$100 payment and reload of appearance/progress. It did **not** complete the other
introductions, the lunch chapter or shared meeting natively. Their ordering,
event baselines, recovery, legacy migration, replay and sandbox denial are source
regressions. The last UI polish removes repeated briefing/status text; native
captures precede that text-only change.

Restaurant verified the exterior window cook and pink guest, normal E dialogue,
apology then a fresh confrontation, actual encounter/attack serial and active
punch timer, pause freeze and a 390-pixel dialogue with two 44px controls. This
case uses Free roam: unchanged health100/cash1000 is intentional sandbox protection,
not proof of career combat damage or campaign lunch credit. The accepted snapshot
stream SHA256 is `356cc0bff304fd6e3d7592a95d126d54ffc5204b8694aa8cf6982a9d2e285410`.

Gym verified all complete sets without mistakes: bench6, treadmill12, rower6,
curls6, normal E admission, Done dismissal and clear-aisle exit disposing the
active plan, activity and room people. It uses Free roam and does not establish
paid career workouts. Scenery verified source stop furniture, a source ground
guardrail within two draws, Telopea's bounded flags/rocks and Red Hill wildlife.
Parliament is an additional forecourt frame, not a new whole-landmark acceptance.

Root visually inspected campaign openings, the restaurant cook/dialogue/fight,
bench participant and all four source-stop/rail/wildlife/school frames. Flags are
seen from behind, so the capture does not establish front markings; Parliament's
mast top is cropped. Guest visibility is partly obscured by player/dialogue.
These are stylised procedural models, not photorealistic reconstructions.

## Retained failures and holds

- Earlier restaurant approaches targeted an overly precise point across actual
  furniture. The corrected normal-input harness uses the real nearby E hint and
  permitted dialogue distance. No collision was disabled. Another assertion
  incorrectly expected Free-roam health loss; the accepted case instead checks
  the actual emitted punch serial/timer and pause while preserving sandbox health.
- An earlier all-machine run completed every set but hit furniture on a diagonal
  exit. The accepted full rerun follows the clear aisle and verifies disposal.
  An older living harness still assumed six rentals and is not this acceptance.
- **Paid-career native workout acceptance is HELD.** Two bounded verified public
  detour attempts reached `(420,-108)` but not gym admission before their outer
  watchdogs. Last retained low-resolution waypoint was 460.09 seconds; cash stayed
  $1000 and fitness0. Lower resolution did not improve travel pace. No inference
  about a pixel bottleneck or N100 frame rate follows. The strict real-session
  payment/completion regressions pass for all four workout kinds.
- The optional `test_capital_paid_gym_browser.py` diagnostic is outside the default
  runner. Its final monotonic-deadline/cleanup change was syntax/help checked,
  not rerun natively. Held artifacts are
  `capital-life-paid-gym-verified/watchdog-results.json` and
  `capital-life-paid-gym-verified-lowres/watchdog-results.json`.
- Highgate's 2.2m source building passage overlaps ACT body `act-88781-0`.
  Its opening was not fabricated or body deleted. The separately swept public
  detour passes the narrow corners natively, but complete gym arrival is unproven.
- New Street View control failed before loading a panorama. Official architectural
  text and pinned data support the current work; exact Centre tenant adjacency,
  whole-centre plan and fresh street comparison remain unverified. Airport is later.
- Software WebGL evidence and bounded buffers/draws do not measure Intel N100/8GB,
  native GPU frame time, total device RAM or whole-city fidelity. The historical
  full-catalog host/certificate hold remains separate from this targeted release.

## Release record

Current tracked game tree: 85 files, 15,312,359 bytes, compared with 74 files and
12,922,867 bytes after PR21, an increase of 2,389,492 uncompressed bytes. The
JS/JSON/HTML/CSS subset checked live is 82 files/15,286,681 bytes, previously
71 files/12,897,606 bytes. Most added bytes are source sidecars and generated data
modules. These are repository sizes, not measured transfer totals or RAM use.
Merged SHA, hosting run and all-file live hashes belong in the external release
facts after publication; they are not inferred from local screenshots.
