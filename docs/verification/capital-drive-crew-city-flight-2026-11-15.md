# Capital Drive: crew, city, flight and touch verification

15 November 2026. Existing original game245 only;134catalog entries and140game
manuals remain. No game, package, external runtime service, shared car asset,
font, proxy/backend or protected Character AI file was added or changed.

## Scope and source

The [contract](../capital-drive-crew-and-city-contract.md) records controls,
authority, caps and limitations. The [airport source record](../capital-drive-airport-sources.md)
pins nine official OSM responses and distinguishes actual source outlines from
estimated terrain/architecture. No new Street View inspection is claimed.

The runtime milestone is `2c030bfd`; its generated cache version is
`ab4de4ae619b5347bba1838ea636a563eb9227f72268183d587d6358d1eab83c`.
The closure has112files/17,080,881bytes. The game tree has111files/16,904,147bytes,
an increase of1,410,574bytes from the preceding release. The original map
snapshots are retained; the new airport sidecar supplies the geographic growth.

The principal implementation milestones are:

| Commits | Work |
| --- | --- |
| `6f3cdbaa`, `bede58d1` | Captured analog joysticks and the76.811m Signed for arrival correction. |
| `9e914aae`, `8fe33a43`, `525acbd5`, `01cc04c7` | Seated crew/window fire, live body exchanges and safe mission-stage switching. |
| `5a76e6a7`, `9eab0beb` | Street-pedestrian vehicle ragdolls and player-car deformation/fire. |
| `2e2d25eb`, `e935e076`, `ff00cc38`, `0f4933d3` | Guarded garage tiers, throwable stock, supplied-time ordnance and radial adult-pool damage. |
| `23926e63`, `ab841281` | Three hero powers and three appended shared mission chains. |
| `8f712df6`, `e34b300a` | Pooled weather/daylight and streamed physical backyards. |
| `75d7f9cd`, `95e67560` | Airport roads/buildings/airfield and corrected eastern ground coverage. |
| `3833a66e`, `20b2e0f4` | Stealable jets, flight controls, altitude-aware police/camera and wreck rescue. |
| `b397fcbc`, `35ba6b6f`, `57d299c1`, `842e61b2` | Controller/UI, checked jet-stand parking, local cache, source-runner, attribution and workflow integration. |

Workers used disjoint ownership and exclusive index windows. Browser/large CPU
work used one explicit lease. Worker commits were inspected; the root retained
UI/prose/release judgment. No persistent development server is part of release.

## Source checks

`python3 -B scripts/check_capital_drive.py` passed **325/325** commands against
`842e61b2`. The subsequent43byte CSS-only cleanup hides a duplicated flight hint;
the generated cache regression/check and a fresh27check native flight run pass
after that cleanup. Game JavaScript, data and shared assets are unchanged. It checks92game JavaScript modules,115Node suites,13JSON
files, generated-cache checks and diff hygiene. The source log SHA256 is
`709295834ff9c27b3cf3bcc7d4f824752b40f1da367c72ce1e332e78bc9ee0d7`.
Maintenance inventory, all134Git-backed catalog URLs and sitemap checks passed.
This is targeted authored verification, not a new all-games fleet certificate.

Important checks include actual-map Signed for GPS arrival/body clearance;
separate real mission receipts and once-only rewards; stock-trajectory equality;
actual upgraded braking/acceleration/steering; live foot/jump/weapon modifiers;
impact fan-out without losing player contacts; body/ammo/health switching without
clearing police; radial blast range/LOS/room guards; all16car/cockpit models;
bounded garden geometry and actual adult gate clearance; streamed disposal;
airport routes and123eastern vehicle-body poses; and aircraft theft/flight/landing.

The airport-ground regression proves64actual eastern coverage probes, including
Terminal Avenue, and192vertices matching the supplied sampler. Original base
and northern ground buffers remain byte-identical. The previous north-only
tile condition had left the new eastern ground invisible; native inspection
found it and release remained held until the geometry fix and visual recheck.

Earlier source attempts remain retained. They exposed old fixture assumptions:
the controller LOS signature/dependency, new optional input owners in isolated
controller tests, the exterior pending-queue binding, and legacy gear defaults.
Their original negative assertions remain. New smoke/physical-blast and indoor
queue assertions were added instead of removing the old boundaries.

## Native evidence and limits

The pre-flight touch run passed68checks with seven captures and stable runtime
hashes. The pre-flight extension run passed29checks, including real aiming,
grenade/smoke fuses, powers, garage routing, a live ally transfer and car boarding.
Its airport screenshot exposed the ground void and is retained as visual HOLD,
not final acceptance. It also established the wanted/police/crew snapshots used
by two additional explicit guards in the final harness.

Retained harness failures are separate from game defects. Early touch attempts
used the wrong CDP touchEnd list and assumed a headless tab switch delivered
native OS blur. The corrected flow retains cancellation/ownership assertions;
OS blur delivery is still unverified and its synthetic blur-event fixture is
clearly labeled. An extension attempt sampled its pause baseline before the
Pause click actionability delay; the corrected test samples after the actual
dialog is visible and still requires exact frozen time.

Final native flight/city/touch runs, stored-map/offline results and deployment
hashes are appended after observation. Profiles are software-WebGL observations;
they cannot establish Intel N100 performance. Source geometry is an original
arcade interpretation: airport terrain/massing and house lot boundaries are
estimates, terminal rooms/airline services are absent, and traffic cars retain
their existing instanced geometry.


The final city/touch batch on `35ba6b6f` passed68touch checks in80.62seconds and
31extension checks in94.73seconds, with unchanged runtime hashes, no console/page
errors, no failed requests and no external runtime requests. Nine captures cover
both themes/orientations, the guided UI, airport ground and Campaign's nine
mobile action buttons. Ordinary UI input switches to a live ally, retains wanted3
and the exact police array, changes the two-person crew correctly, and boards an
ally into the player's car. Seeded introduction/shared prefixes are labeled
fixtures; the test does not claim those missions were earned natively.

| Evidence run | Result SHA256 |
| --- | --- |
| `capital-final-touch-20261115-a1` | `9f314577ce1a1ceb0cd063953cf2dda31690c343b378a722e035e3668df907ab` |
| `capital-final-extension-20261115-a1` | `1a33d0316fb5893e44b808671df90a5184d253471da74d425802d7b221a5297d` |

The first aircraft attempt required an unnecessarily precise walking waypoint
inside the arriving car's footprint; the corrected harness uses the actual3.5m
entry rule. The second proved a real blocker: the search marker parked the car
under the jet wing, and physical clearance correctly prevented taxiing. It passed
16checks, including all eight visible theft cues and actual pause/cancellation,
but flight acceptance remained held. Its result SHA256 is
`00b91de767bbff3b69fd04c5dc514a4520f8c5b8dbd00b0423755d8630e97e91`.

`57d299c1` moves only the fictional stand's map-arrival parking marker, not its
actual door or flight controls. Fixed local queries reject static bodies and both
full jet spans. Actual-map regressions check both stands, six fleet bodies, four
arrival headings, ordinary car exits, short swept foot approaches and twelve
real takeoffs with the parked car unchanged. The final flight rerun below verifies this
fix natively. The already verified touch and city input paths are unchanged.


## Final flight, caching and profiling

The final aircraft run `capital-final-aircraft-20261115-a4` passed27checks in
52.1seconds on immutable `2c030bfd` bytes, with no browser/console/request errors
or external runtime requests. Real input completed the eight-cue lock, pause and
held-input reset, takeoff above10m, camera elevation, gentle landing, braking and
checked exit. The old car stayed parked and no career rewards were granted.
Three actual Performance screenshots are retained. Result SHA256:
`3e0a8f5060dcff21ac752fccd6f939cc2c112f2f789d1f0dc205c3a08e492979`.
The preceding successful27check flight run remains separately retained.

`capital-final-cache-20261115-a1` passed19native checks in64.5seconds, including
all seven stored map files, zero warm page map fetches/origin module/map bodies,
actual offline W/D driving, and byte-preserved native career state. Result SHA256:
`79b7dac9b09e7b6c899bd2e6bf8debc476a3cb4bad6ee9fb158e8226b72b2747`.
It ran on `842e61b2`; only the43byte presentation rule and generated cache digest
changed afterward. Cache client, worker and seven-file loading bytes did not.
The final generated112file closure was rebuilt and its seven regressions and
content check passed after that presentation change.

The final CPU profile uses an exact `2c030bfd` export, 3D Performance,1280×800CSS,
576×360canvas, blocked service workers and three8second normal-input windows.
It is SwiftShader software WebGL, not N100 hardware. Startup was20.60seconds in
that cold local context; this does not promise instant warm GPU reconstruction.
Profile result SHA256:
`55c9e275c00081b00dc213a4352fe2befdcc8866e33f29f7bea203722dd2dcfd`.

| Observation | Idle | Driving | Paused |
| --- | ---: | ---: | ---: |
| Renderer ScriptDuration, seconds | 1.727 | 1.555 | 0.027 |
| Actual rendered frames | 146 | 162 | 0 |
| Layout / style recalculations | 40 /144 | 42 /162 | 0 /0 |
| Software GPU process CPU-seconds | 28.78 | 28.61 | 0.03 |

RAF callbacks are not rendered frames. Process CPU-seconds are separate from
renderer script time and can span several cores. Active software graphics remains
the main cost. There is no new broad FPS or N100 performance claim. Runtime
modules retain one supplied world clock and bounded views; no temporary browser
or HTTP server remained after native/profile runs.
