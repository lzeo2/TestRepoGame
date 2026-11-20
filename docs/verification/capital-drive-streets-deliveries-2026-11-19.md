# Capital Drive: streets, deliveries and terrain

19–20 November 2026, Australia/Sydney. The baseline is
`a037806d0773424e1a65bf245b24152d0d98ef8f`. Local assets, source geography,
forty traffic cars and the existing sole world clock remain.

## Playable changes

Phone food and weapon orders reserve the catalogue price plus $50 and dispatch
one physical NPC-driven van on the directed public-road graph. A real stopped,
reachable exterior E-handover grants the item once. Cancellation or failure
refunds escrow. Pending transport is transient; serialized cash includes escrow
so an abandoned order refunds on reload without granting an item. The van joins
physical vehicle, shot-cover and damage registries. Its seated driver uses the
shared person rig.

House burglary now has distinct furniture search stations, visible memory cues,
carried loot, noise and a one-shot alarm. Indoor searches never bank cash. The
actual nearby door exit consumes a fresh terminal receipt and saves the bounded
reward/cooldown. Repeated searches, fabricated/stale receipts and interrupted
recovery cannot replay payment. Eight safehouse offers preserve the original two
IDs, order and prices. At a real owned/story safehouse bed, an injured player can
complete a released-then-held X session and pay $80 for full health.

Four appended jobs differ in play: food freshness changes pay, documents use
stopped exchanges, medical cargo requires a sound vehicle and a short deadline,
and equipment can be damaged and requires returning cases. Fragile cargo binds
the actual loaded vehicle and retains cumulative damage through repairs. Legacy
jobs and work-while-wanted rules remain.

Player stride and ordinary joint poses blend using supplied dt and a fixed
240-byte angle buffer. Root position, live aim pitch/recoil and ragdoll authority
remain immediate. No new geometry or animation clock is introduced.

Four fictional park stunt ramps share rendered vertices and support with
vehicle ascent, airtime, gravity and landing. Placement caps at six before
source clearance checks. These are
authored gameplay equipment, not real Canberra facilities. Flight state is
transient; ordinary no-ramp simulation trajectories retain exact parity.

C switches between chase and the existing fleet cabin while manually driving.
Camera position follows the actual seat and vehicle pitch, including ramp flight.
Steering and Space trigger a measured slide at speed. Shift consumes the refillable
nitro tank. U starts or lands the personal jetpack outside between jobs, and
Space/Shift change height. Jetpack motion uses shared body sweeps, a finite lift
limit and three pooled backpack meshes. All four controls use the existing clock.

## Terrain research

The [ACTmapi elevation page](https://www.actmapi.act.gov.au/access-imagery-and-elevation)
and [official LiDAR record](https://www.planning.act.gov.au/professionals/survey-spatial/spatial-information/lidar-data)
document open ACT elevation coverage and requested attribution. The airport now
uses a bundled 89×122 grid derived from the pinned official ACT2020 two-metre
contours, © Australian Capital Territory and Aerometrex Limited, CC BY4.0, AHD
with a550m local offset. Its approximately50m cells add62,096bytes. No runtime
elevation requests are introduced.

The source archive SHA256 is
`b8090f3ab023c2821747a760470eb8e53173c6d1b7a35dbb2a306885da7981b9`.
The builder records106,718 contour samples,9,190 finite held-out checks
(p95 absolute residual0.590m; maximum8.388m) and three out-of-hull misses.
These are numerical interpolation checks, not independent survey accuracy.
The final grid has no missing cells or nearest fill. Old base/north samples
and exact western seam ownership are preserved; runway grading and350m edge
blending remain authored. Small cuts and kerbs are unresolved.

Runway/taxiway surfaces sample terrain in strips no longer than25m. Up to96
source-aligned decorative approach posts are merged into streamed geometry.
They are estimated roadside detail, not observed equipment or collision barriers.
See the [airport source record](../capital-drive-airport-sources.md) for
reproduction, datum, source and representation limits.

## Controlled performance comparison

The occupancy fast path avoids constructing a full contact result for plain
static building/barrier feasibility tests. It retains live geometry, strict
contact thresholds and the existing physical response; water and courtyard
contact retain their original paths. No traffic or collider is removed.

A fresh baseline/candidate pair runs18,000frames from each of Telopea,
Commonwealth Bridge and Civic (54,000frames;900supplied seconds total). Only
`simulation.js` differs in the isolated comparison. The same source data,40traffic
cars,1,405parked descriptors,36fixed adult collision bodies, seed and1/60dt
controls are used. Fixed bodies are not NPC AI. Initial/final states, origins,
recorded positions and checksums at60-frame intervals match exactly.

| Origin | Step sum, baseline → candidate | p95 step, baseline → candidate | Sampled allocation reduction |
| --- | ---: | ---: | ---: |
| Telopea |33.288 →28.556s (14.22% lower)|3.312 →2.847ms|1.67%|
| Commonwealth Bridge |36.243 →33.246s (8.27% lower)|3.446 →3.173ms|0.40%|
| Civic |33.863 →27.531s (18.70% lower)|3.088 →2.776ms|2.10%|

Allocation sampling is a separate600-frame continuation per origin. Sampled
bytes include short-lived allocations and are not retained memory. These are
one observed pair, without a speed pass threshold or confidence interval.
Raw V8 CPU/heap profiles and standalone flamegraphs are retained externally
in `capital-streets-node-{baseline,candidate}-20261119-a1`; their hashes are
recorded in the companion receipt. This physics workload does not establish
rendering FPS, natural driving, NPC AI or Intel N100 performance.

## Verification

The native burglary fixture used prior wealth and an injured body checkpoint.
It completed the real lock cues, two distinct furniture searches and actual exit.
The wallet and cooldown updated on exit. Purchasing that house enabled real
bed rest, which charged $80 once and saved the restored health. All 30 checks
passed. The first run exposed the nearby TV being selected after a search. The
second completed gameplay and reached the capture limit. Both attempts remain
in the external evidence directories.

The Free-roam controls run passed seven checks through actual keyboard and
menu input. It switched to the seated cockpit, consumed nitro, stepped back to
chase view on foot, lifted 1.26 m with the jetpack, then landed. Its bounded
spawn route did not exercise a drift. The dedicated driving suite checks actual
slip, countersteer recovery, fuel gates and identical ordinary motion.

The Free-roam terrain run used official map controls to position the car, then
held real throttle through the first park ramp. It observed unsupported upward
flight at 14.46 m/s, a descending sample and physical landing. The airport view
settled with one terminal footprint, 120 source surfaces and 96 decorative
posts. The preceding failure pulsed throttle between samples and did not
reach takeoff speed. The successful run uses continuous keyboard input.

These browser runs use Chromium software WebGL. They establish the exercised
flows and captures. Intel N100 frame rate and natural city-wide driving remain
unmeasured. The isolated engine pair does not include the new gameplay features.


Native courier verification passed 65 checks for Belloucies food ($85) and a
fictional Morrow Vale weapon order ($523). Both cases started from explicitly
prepared injured customer checkpoints and prior wealth. Normal phone buttons
dispatched the real courier, cancellation restored the full HUD balance, and a
fresh van drove the directed route and stopped for physical E handover. The
meal heal and delivered inventory persisted through reload. The first run
exposed the stale wallet display while paused. The authoritative wallet had
already refunded correctly. The controller now refreshes it on settlement.

The [machine-readable receipt](capital-drive-streets-deliveries-2026-11-19.json)
records the measured browser and component workloads, exact source revisions
and retained artifact digests.

The final source run passed all 492 commands, including 119 runtime module
syntax checks, 182 Node suites and their syntax checks, five support script
checks, the profile parser, offline cache validation and whitespace. Earlier
runs caught outdated controller fixtures and a regenerated cache manifest.
The final comparison hooks retain the original physical assertions. The local
cache closure contains 140 files and 17,418,693 bytes.

The repository's targeted catalog smoke passed Capital Drive with zero retained
console errors or failed requests. The separate all-catalog gate stopped after
Ovo failed four requests. Nineteen pages had reported results, including 18
passes, and the twentieth had started. A targeted run on the published baseline
reproduced Ovo load failures, including certificate errors on its external
Google Docs and GameAnalytics requests. The Ovo tree, shared assets, catalog
and smoke script match the published baseline. The incomplete catalog run
remains a publication hold under `AGENTS.md`. The isolated sparse checkout was
restored after terminating the interrupted runner.
