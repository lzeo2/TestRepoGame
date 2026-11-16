# Capital Drive: sustained bridge, recovery and retry verification

16 November 2026. Existing original game 245. No new game, dependency, geographic
snapshot, external runtime load or shared car/font/portal/proxy/Character AI edit.
The [cache/performance contract](../capital-drive-cache-and-performance-contract.md)
defines exact water contacts, profiling boundaries and recovery/retry behavior.
The [all-mission audit](capital-drive-campaign-playability-2026-11-16.md) covers
the separate normal objective-chain checks and estimated difficulty of all 20 missions.

## Confirmed cause and implementation

The old water collision path repeatedly searched Lake Burley Griffin's 2,491-vertex
outer shoreline near bridge/shore cells, including a hypot per edge per contact.
Baseline native CPU profiles attributed most sampled script work to
`polygonContact` and `physicalContact` even with fewer rendered triangles than at
Telopea. This establishes a location-dependent collision bottleneck; it does not
establish a general memory leak.

`water-contact.js` prepares segment trees over immutable source water rings.
Filtered parity and nearest-edge traversal keep the old projection/hypot,
source-order tie, winding, normal/depth and bridge-opening decisions. Buildings
and barriers retain their live original contact path. The deterministic suite
checks 30,644 exact contact/parity cases, 15,093 actual shore/island/bridge probes and
a 360-frame, 40-car repeated bridge replay. Nearest-edge evaluations fall from
7,443,436 to 177,294 (97.6% fewer). Worker-observed Node contact time was 548.9→73.4 ms
and repeated-bridge replay 8,829.2→1,050.4 ms. These are observations, not timing
assertions or whole-game FPS guarantees.

Expired seated-occupant pose entries, including retired police IDs, are now
pruned from the controller's reusable map after live descriptors are collected.
This corrects a small retention path, not the primary shoreline CPU cost. Full
world metadata remains resident; nearby geometry still uses existing bounded
chunk eviction and actual disposal. A separate source construction probe found
water triangulation only 5.45% of measured chunk-building time, so it was not
treated as the demonstrated main lag cause.

## Matched cloud browser profiles

Exact baseline export: merged `73c8335c388ae985504b905f354404bc71bb29bb`.
Exact measured candidate: `83eba080689b5d7b5e21c72cc9565d9c313139b2`.
All 138 baseline / 139 candidate game/shared/font/favicon files match their Git blobs.
The profiler script SHA256 is
`d08ba9468cd0edda2fcd1ede9cd516f7e9f6bd73667312c91a60272f8a16948a`.

Sequential Chromium/SwiftShader Low3D runs use 1280×800 viewports, blocked service
workers, local-only requests and exact matching player/camera poses. Official
Free-roam map clicks deliberately stress streaming; these are not natural
cross-city drives. Requested 8-second RAF windows can overrun while the main
thread stalls. The table uses actual Performance metric windows and actual render
counter differences, with script duration normalized by renders.

| Stationary sample | Baseline renders / actual window | Candidate renders / actual window | Script ms/render, before → after | RAF p95, before → after |
| --- | --- | --- | --- | --- |
| Telopea initial | 72 /9.26s | 72 /9.39s | 18.86→18.68 | 183.3→183.3ms |
| Commonwealth first | 32 /10.87s | 71 /9.05s | 253.07→18.62 | 899.9→183.4ms |
| Kings first | 30 /11.00s | 79 /8.91s | 289.49→18.60 | 1033.3→150.1ms |
| Telopea return | 74 /9.03s | 78 /9.05s | 26.57→17.68 | 216.6→166.7ms |

Bridge script cost per render falls about 92.6% / 93.6% in these single matched runs.
Stochastic traffic and queue timing can still differ. SwiftShader native/GPU
work remains costly; these results do not certify hardware FPS, overall 100% CPU
elimination or N100 performance. `(program)` is unattributed/native work, not a
JavaScript function. Raw profiles, transition profiles, source/load hashes and
logical GL create/delete/live counters are retained externally.

Short baseline report SHA256:
`91369f30bdfa77df51dcba478d244ecb7efd790b9fd812e6e973a4f03d65bd31`.
Short candidate report SHA256:
`d380027e8e96c2769719a9f77e598904aa9bee077db613d048893c5b4c71f411`.
Comparison JSON SHA256:
`fd22d32f1f025d6ac93cc88b039350c9a83c987c96cffb56ce500121dd5c9960`.
Both complete without page errors, failed/HTTP requests or external requests;
runtime files and loaded resource hashes remain unchanged.

The earlier sustained baseline a1 is retained separately. It ran about 430 wall
seconds, but its previous observer ordering included keyup/snapshot work before
final metrics. It also lacked a supplied simulation-clock measurement. Its raw
CPU stacks establish the same hot path, but raw script totals are not compared
as if every window lasted eight seconds. Paused GC measurements and map/UI/
construction transitions are never counted as steady driving samples.

The candidate sustained run completed **422.57 wall seconds**, with **205.32 s of
supplied simulation time**, ten bridge-position cycles and an identical-position /
heading return to Telopea. This exceeds six minutes of wall-time stress but is
not five minutes of unpaused driving. At Commonwealth/Kings the first samples
used 17.36/19.19 script ms per render; repeated samples used 23.76/22.56 ms and the
post-five-wall-minute Kings sample 23.22 ms. Telopea used 18.44 initial and 21.02 return
ms per render. No return of the old 253–289 ms bridge spike was observed.

Paused forced-GC used heap was 224.26→225.08 MiB at the two Telopea observations.
The return initially exceeded its 20 s queue-drain bound, then settled after the
separate paused-GC/resume check. World residency was 18→17 chunks; neighbourhood
resident attributes stayed 1,222,656 bytes. Textures stayed 9, programs 21→22,
occupant poses 41 and logical live GL buffers 520→603 (after 1,150 buffer deletions).
Counts vary with residency and lazy warmup; this is not proof of zero leaks or a
total GPU/RAM bound. No page/request/HTTP/external errors occurred and source/load
hashes stayed unchanged. Sustained candidate report SHA256:
`ea7d42f7b6945aedad8f694d24ef8b5c149efc9c48e2a7373a0a95f09cbff9dc`.

The differential collision fixtures retain historical polygon/grid/water math
but explicitly inject the current graph builder and Centre routing guard into
both sides. This isolates contact changes from the separately intentional route
change; it is not a claim that the two full revisions use identical graphs.

## Local medical recovery and automatic retry

All-mission testing also found and corrected missing shop staff and a blocked
Centre/Bunda GPS route. Those source-scoped fixes and detour checks are recorded
in the separate all-mission audit. Source roads and building collision stay intact;
the graph avoids eight proven blocked travel arcs. Both detour directions pass
static centreline and actual lane-offset whole-car probes every≤0.5m. The first
Petrie failure was traced to a fixture that omitted production's existing
replacement-building IDs; that failure and the corrected test remain explicit.

Medical recovery captures the actual exterior/seat/body origin before callbacks
dispose an interior or ride. It now asks the checked nearby public-road placement
path instead of the fixed Woden coordinate. Actual expanded-map regressions cover
inner south, Civic, bridge, interior and aircraft-seat origins, with local results
within 180 m in those cases. Existing 3.4-second recovery, single $250 cost, completed
jobs, reset/ammo/health rules, pause and sandbox behavior remain tested. Arrest
retains its existing station location. This is local recovery, not real hospital
mapping.

Campaign timeout or recovery retains the failed normal chapter transiently.
Automatic retry starts stage zero with a new deadline and fresh receipt baselines,
after recovery finishes and the player is alive/unpaused in Campaign. It clears
old activity/recon/input/crew state and skips the repeated cutscene. It preserves
the player's current place, timeout health/ammo, world/economy state, completed
prefixes and the actual controlled shared-crew hero. Cancel, successful manual
starts, hero selection and mode changes clear pending retries. Developer previews
never queue normal retries and pending attempts are not serialized.

The real Campaign-owner tests and extracted actual controller helper cover
repeated failure, recovery/pause/mode/flight/preview guards, stale receipt rejection,
single restart, interior owner reset, route update and unchanged serialized
completed progress. These are source/controller regressions, not native
KO-to-hospital-to-automatic-retry acceptance.

## Source gate and final integration

`python3 -B scripts/check_capital_drive.py` passed **369/369 commands** against the
final runtime and test integration committed as `d6d40da6`. The runner requires
97 game JS files, 133 Node suites, three support-script syntax entries, two Python
cache checks and diff hygiene. Log SHA256:
`ad9e83bd6c29bdc3cb14e55ca68ee67e285ede78e307cd09b3aad3036b04b5a9`.
An initial invocation with the browser-only output flag was rejected before tests
ran; the corrected non-browser command above passed. The earlier 351-command
receipt is historical, not this gate.

The final local cache closure contains 117 files /17,151,956 bytes, version
`759491948a6ad377d45ee93bcad75a3da942d358a8d68cded338e4e0fcc24246`.
Worker milestones: local recovery `ae765018`, transient retry `b2312096`, exact
water contacts `a361815b`, shop staff `b8ad46a4`, campaign harness `9a35239d`,
controller integration `83eba080`, profiler `340ab662`, and Bunda route guard
`f6cc0930`. Review and implementation used bounded disjoint tasks and exclusive
index/CPU leases. This changes no catalog entry and adds no games.

A fresh final `d6d40da6` export (139 exact Git blobs) also completed the matched
short browser run after the routing fix and cache update. Its player and camera
poses match the baseline exactly. Initial/Commonwealth/Kings/return script costs
were 19.45/19.15/25.58/18.84 ms per render, with 67/67/68/69 renders over actual
9.28/9.08/9.28/9.44 s metric windows. Bridge reductions versus the same baseline are
92.4% /91.2%; the variation between candidate runs remains visible rather than
selecting only the fastest sample. No page/request/HTTP/external errors occurred;
source and loaded-resource hashes stayed unchanged. This 149.92 wall-second short
run is not an additional sustained soak. Final report SHA256:
`0dae9d2fa04124b4dc20d36ed40da09ea32860100d2a5f59a1f9842be2d3140b`.
Final comparison SHA256:
`6f152b79cc9c6b243893b0a0688eee59eaaacccefb904e40d53fff2b4f027d99`.
Maintenance coverage passed for140projects/134registered entries with only the
Capital Drive inventory row changed; sitemap validation passed for134game URLs
plus the portal. These are targeted/source checks, not a fresh full-fleet native
loading certificate. Existing dated fleet limits remain separate.

## Reproduce

Use the commands in the cache/performance contract and development workflow.
One CPU-heavy browser, full source runner or benchmark runs at a time. Keep
fresh external output directories, preserve failures and never insert private
developer inputs in reports or captures. A wall-time soak and its separately
reported supplied simulation time are different measurements. Actual intended
Intel N100 / 8 GB hardware and full native campaign completion remain open gates.
