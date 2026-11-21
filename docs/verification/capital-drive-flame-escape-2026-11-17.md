# Capital Drive: flamegraphs, escape objectives and residential yards

17 November 2026, Australia/Sydney. Existing game 245 only. Baseline is merged
5e1b05444b14cc1cca4a02acce6bd03331429097. The runtime retains one clock,
local assets, source geography, collision, forty traffic cars and bounded pools.

## What changed

Static whole-car feasibility collects candidates from one conservatively padded
body envelope instead of querying three spatial grids for every longitudinal
circle. Original sample positions, inclusive per-circle query bounds, live
geometry and bridge checks remain. Nearby-car SAT uses scalar axes with the
original arithmetic/order and strict contact test. No collision shape or traffic
count is reduced and no per-position result cache is introduced.

Eleven campaign escape stages record genuine healthy exterior arrival for the
current attempt. After that, losing police elsewhere completes the escape; GPS,
yellow road guidance and the floating world marker no longer request a return.
Foot/stopped-car arrival guards, meaningful deliveries, first-search requirements,
pause/recovery rules and once-only rewards remain. Fresh stages/retries reset
arrival. A pure controller adapter uses the actual controller functions and real
Campaign/MissionGuide owners; it is not a native mission playthrough.

High-wanted fast vehicle targets trigger bounded police interceptor handling.
Three/four/five-star major-road speed caps are 34/38/42 m/s and residential caps
26/28/30 m/s. Next-edge bend preview commands braking. Hidden targets retain
search-position guidance without live target velocity. Low wanted behavior and
six-officer cap remain. The real-simulation chase fixture reaches 42 m/s and closes
a 34 m/s target while a bend fixture brakes and remains physical. It does not prove
all real Canberra intersections or native pursuit difficulty.

Rear gardens trim around source buildings, road setbacks, driveways, parks and
other gardens. Fences retain shared render/collision corners and a 1.8 m rear gate.
Red Hill's restrained pale masonry follows the previously pinned Pelsart Street
observation; other timber fences are original inferred treatments. These are not
surveyed parcel boundaries or observed private-yard reconstructions. All 4,200
entrance descriptors/order and 12,600 approach probes remain unchanged. The paired
base+north detail fixture admits 439 yards rather than 433, with 134 fewer yard
triangles and 7,236 fewer buffer bytes. An uncontrolled single constructor timing
increased from 2.22 to 3.04 seconds; no loading-speed improvement is claimed. Runtime
counts vary with the normal landmark/airport/source-replacement assembly.

No new geographic extent or imagery is bundled. Expansion remains conditional:
CPU work is lower, but cloud software graphics cannot establish acceptable Intel
N100/8 GB performance. This release improves the existing inner-south/lake/Civic/
airport footprint before increasing its size.

## Measurement method

The fresh baseline browser run uses exact 5e1b game/shared cars/fonts/favicon.
Its short stationary Telopea/Commonwealth/Kings/return windows identify repeated
collision work. It completes 94.76 wall seconds and 78.75 supplied simulation seconds;
that is not five minutes of natural driving. `(program)` dominates total sample
width and cannot be assigned to a JavaScript caller.

The long deterministic comparison runs 18,000 frames (300 supplied seconds) from
each of three actual public-road origins: Telopea, tagged Commonwealth Bridge and
Civic. The only changed dependency is simulation.js. All geography, inferred
baseline gardens, terrain, parked cars,40 traffic cars,36 fixed adult collision
bodies, seed, supplied 1/60 dt and controls are identical. Fixed bodies are not NPC
AI. Canonical simulation recovery may occur; no manual mid-run reset is applied.
This is a scripted physics workload, not native continuous driving or GPU FPS.
The full gameplay release has intended yard/police changes and is measured
separately. All-car scalar states/edge IDs are hashed initially, every 60 frames
and finally; final/initial states, recorded positions and origins are compared.

Allocation sampling runs a separate 600-frame/10-supplied-second continuation after
CPU/timing/checksum capture, interval 32,768 bytes, with collected-object flags
accepted by Inspector. Cumulative sampled bytes include short-lived allocations;
they are neither live heap nor retained RAM. GC diagnostics run outside measured
phases. Inspector profiles themselves affect memory, so small probe-after heap
differences are not leak evidence.

The local analyzer weights flame widths with timeDeltas and reports bottom-up
self time separately from overlapping inclusive times. A real intermediate V8
profile had one 2-microsecond backward delta: bounded explicit debt correction
preserves raw duration exactly and records the correction in JSON/HTML. Large
or unrecoverable reversals remain errors. Sampling and wall-time observations
have no flaky speed pass threshold.

## Results

The final engine pair preserves all origins, initial/final states, periodic state
checksums and recorded positions exactly in a 54,000-frame replay. State is
recorded every 60 frames plus endpoints, not compared on every intermediate frame. Only simulation.js
differs in the 33-file dependency closure. These are observed single-pair timings,
not confidence intervals or pass/fail speed thresholds.

| Origin | Step sum, baseline → final | p95 step, baseline → final | Sampled allocation estimate reduction |
| --- | ---: | ---: | ---: |
| Telopea |33.130 →27.329s (17.51% less)|2.940 →2.519ms|22.86%|
| Commonwealth Bridge |38.406 →33.317s (13.25% less)|3.549 →2.860ms|23.09%|
| Civic |34.188 →28.740s (15.94% less)|2.973 →2.376ms|22.92%|

Pooled timed step work is 15.45% lower. Sampled grid-query self time falls from
4.59/5.20/5.07s to 2.66/3.07/2.93s; nearby-car SAT self time falls from
2.13/2.16/1.85s to 1.38/1.55/1.35s (same origin order). Polygon contact remains
the largest named hotspot; no universal narrow-phase speedup is claimed. Main
forced-GC heap is approximately 135–137 MB for both builds. This improvement lowers
CPU work and transient allocation; it is not a retained-RAM or N100-FPS claim.
The intermediate envelope-only run shows 10.66–12.83% less timed work and exact
state parity; retained raw artifacts distinguish it from the final scalar-SAT run.

The [machine-readable receipt](capital-drive-flame-escape-2026-11-17.json) records
exact source/harness hashes, parameters, metrics and raw artifact SHA256 values.
Raw standalone flamegraphs, cpuprofiles and heapprofiles remain in external
`capital-flame-node-{baseline,candidate,final}-20261117-a1` evidence directories.
Final profiles need no timestamp correction.

## Source and campaign checks

The final source gate passed **449/449 commands**: 108 game syntax checks,
166 Node-suite syntax checks, five support-script syntax checks, 166 Node suites,
the Python flamegraph-parser regression, two Python cache checks and whitespace.
`/tmp/capital-flame-source-gate-20261117-a5.log` retains the final result, after
the first-person drone presentation correction. The earlier a4 gate also passed. Failed
and interrupted a1/a2/a3 attempts remain retained: two old test expectations still
named departure stages `foot`; the updated tests check `escape` plus its retained
on-foot rule. Runtime completion/collision guards were not relaxed.

A fresh saved audit completes all 22 normal owner chains /65 stages, with
explicit fixture travel and police clearing. Its SHA256 is
`a5b99b0f80b3c802d5304f10bea7f799a173d10006789b1d46dc999d41bbab18`.
This is not 22 native wins: driving endpoint reach remains held for Borrowed
wheels, Bridge score and Split the score in the fixture's route report. Every per-stage route object in those three chapters exactly matches the retained
16 November a5 audit, so these holds predate this change. Bridge routes pass
through their objective discs even where their final graph vertex is outside.
Borrowed wheels needs an unverified manual Kingston service-road approach
(closest routed point 76.81 m vs 26 m radius); Split the score's graph endpoint is
0.77 m outside its 26 m park radius, with a nearer source road. Neither report proves
impossibility or swept native travel. Domain completion does not erase route or
human-survival holds.

The new focused suites exercise 11 escape owners, actual controller GPS/world
marker clearing, 2,222 pinned occupancy probes/80 sweeps, 26,540 SAT pair probes,
fast pursuit and inferred yard fit. Actual-source extensions also compare
467 road/bridge probes/350 sweeps, 180 traffic/bus frames, 180 Yoober frames,
240 traffic replay frames and 1,000 nearby-car pairs. These owner/source tests
are distinct from native play, full travel and target-device difficulty.

## Full-release native city check

The export before the drone-camera correction passes **37 native checks** in 100.43 wall seconds:
actual keyboard/mouse house purchase and entry, hireable guard body, drone
launch/motion/recall, stash conservation/persistence and normal grenade input.
No page errors or source changes occurred. Initial prior wealth/equipment and
hero checkpoint are explicit setup, not earned progress; no production setter or
private code is used. This selected case is not native campaign/pursuit acceptance.
Retained `capital-flame-native-city-20261117-a1/results.json` SHA256 is
`5a8bad52b78217682da8ea38b2a22f8c73fe36aa3ba5e0de26674745b60566ed`.

The final post-camera-fix export passes **38/38 native checks** in 101.22 wall
seconds, including hidden own-hull checks after actual drone movement. Source
hashes remain unchanged and page errors are empty. Final retained report
`capital-flame-native-city-20261117-a2/results.json` SHA256:
`0bd3426cd268dd9f96c1862a14864e64b9e91c6a8cbd9587b6fa73bbe4df8b0d`.
The correction keeps the pooled third-person model and all flight/body/collision
rules; it only suppresses drawing the hull from its own first-person camera.

## Full-release sustained browser run

The collision/pursuit/yard candidate completes **387.11 wall seconds /358.45 supplied
simulation seconds**, Performance quality, with 15 bridge-visit iterations and
a post-five-minute Telopea return. Source/load hashes remain unchanged; no page,
request, HTTP or external-load errors occur. Telopea position, heading and camera
match exactly. This is official Free-roam map streaming stress, not continuous
natural road driving or an N100 test. Service workers are blocked for measurement. This export precedes the later
first-person drone-hull presentation fix; drones are inactive throughout the run.
The isolated drone branch is checked separately on the final release export.
The source-hashed old export remains unchanged for reproduction.

Paused forced-GC used heap rises 249,869,044→251,142,280 bytes (+1,273,236;
0.51%). Backing storage rises 44,709,856→45,287,410 bytes. The occupant-pose cache
remains 41. Streaming performs 221 world loads/202 evictions and 117 neighbourhood
loads/100 evictions. Resident world chunks 18→19 and neighbourhood chunks 15→17
show retained hysteresis; logical live buffers 520→643, VAOs 97→110, programs 21→23
and textures 9→9 are reported honestly, not labelled identical or GPU bytes.
Renderer RSS 490.7→497.7 MB and software-GPU RSS 126.5→144.3 MB are separate process
observations, not JavaScript retained ownership or VRAM.

Telopea ScriptDuration per actual render is 9.97 ms initially and 10.56 ms after the
return. RAF p50/p95 is 66.7/83.4 ms then 66.6/66.8 ms. Rendered triangles differ
223,390→157,376 despite the matched camera, so no full-game FPS gain is attributed
to the engine patch. The seven active windows and raw profiles remain retained.
Two GC probes and this bounded stress run cannot rule out every long-session
leak, city route, combat load or hardware bottleneck.

Retained report: `capital-flame-browser-sustained-20261117-a1/report.json`, SHA256
`37e7c3cf913a3379897134258c24eaa34fc698309ae8acde0f219ad9f670c945`.
All 12 CPU profiles (active and transition windows) produce local flamegraphs;
raw samples remain authoritative. Reproduce sequentially with:

```sh
timeout --signal=INT --kill-after=15s 570s python3 -B scripts/profile_capital_sustained.py --root <final-exact-export> --output <fresh-external-dir> --scenario sustained --mode streaming-stress --quality performance --seconds 360 --minimum-active-seconds 305
```

A timeout is incomplete evidence, never a passing duration. CPU sampling, paused
GC and transition construction remain separate measurement phases.

## Reproduce and interpret

Use the [development skill](../../.agents/skills/capital-drive-development/SKILL.md)
and its workflow for exact exports, sequential CPU leases and commands. Keep raw
cpuprofile/heapprofile/summary files and source hashes outside the repository.
`scripts/analyse_capital_profile.py` generates standalone searchable HTML and JSON
without runtime network dependencies. `scripts/test_analyse_capital_profile.py`
checks weighting, correction limits, escaping and malformed data.

Official references checked 17 November 2026:

- [Chrome Performance reference](https://developer.chrome.com/docs/devtools/performance/reference): compare equal active windows and self time; inclusive totals overlap.
- [Chrome allocation profiler](https://developer.chrome.com/docs/devtools/memory-problems/allocation-profiler): distinguish transient allocations from retained ownership.
- [MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices): batch work; avoid synchronous readback/finish timing probes.
- [Three Object3D](https://threejs.org/docs/pages/Object3D.html) and [renderer diagnostics](https://threejs.org/docs/pages/WebGLRenderer.html): static transforms and bounded draw statistics need correct ownership; draw counts are not VRAM or GPU duration.
- [Asynchronous timer queries](https://developer.mozilla.org/en-US/docs/Web/API/EXT_disjoint_timer_query): require support, later availability and a non-disjoint result before calling a value GPU time.

No new synchronous WebGL timing probes, global culling switches, dependencies,
remote runtime downloads, source regeneration or state setters were introduced.
