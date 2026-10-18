# Wings v2 Phase 3: exhaust verification

## Result and scope

2026-10-18, baseline `311f57e`, initially clean. **CPU PASS; native HOLD.**
Verification only, within the ten-minute cap. Only this receipt changes tracked
content. No source, model, runtime, bundle, dependency, sparse selection or
catalog change; no new game, speedboat work or push. Parent owns maintenance
summary and subjective pixel acceptance. Catalog remains 125 registered games.

Read AGENTS, CODE_QUALITY, maintenance README, manual232, resume audit, v2 brief,
and Wings quality/model/study/acceptance contracts. The brief's empty exhaust
arrays are historical, not the current implementation. The maintenance checker
confirmed current inventory. Inspected HEAD Wings tree
`99037d4c28dc37dbafee9db8f0104751f704995f`, entry blob
`2d7f08aa3ca94c87da2921c7916bec48d28e13aa`.

## Current descriptors and converter

Parsed balanced, bounded descriptor substrings from
`Games/Wings/assets/aircraft-BIwDLCoz.js`, rather than treating minified lines as
readable source. Compared the actual entries with `port.patch`.

| Kind / file | Configured pivots | Exhaust names | Stretch axis / cone direction / sign | Cone length |
| --- | ---: | --- | --- | --- |
| fighter / fa18 | 12 | afterburner_L, afterburner_R | y / y / -1 | 1.5 each |
| blackbird / yf12 | 10 | afterburner_L, afterburner_R | z / z / +1 | 2.4 each |
| f15 / f15 | 6 | afterburner_L, afterburner_R | z / z / +1 | 1.5 each |
| f35 / f35 | 7 | afterburner | z / z / +1 | 1.8 |

All four have empty spinner arrays. Jet store groups each contain four real
stores, grouped by pilot secondary and officer primary. F-35 also has two door
pivots. Placeholder length/span is 19.44/13 for F-15 and 15.7/10.7 for F-35;
reference fighter is 17.5/13 and blackbird 31/17. Exhaust anchors are distinct
from the animated nozzle pivots, not substitutes for attached geometry.

Serialized jet nodes confirm F-15 nozzle translations
`(+/-1.3, -0.16, 8.826810810810812)` and exhaust anchors at
`(+/-1.3, -0.16, 8.879351351351351)`. F-35 nozzle is
`(0, 0.01, 7.274333333333333)` and exhaust anchor
`(0, 0.01, 7.326666666666666)`. Each nozzle has an actual disc mesh child.
These are serialized local coordinates, not newly measured native world poses.

The patch adds descriptors and preserves the existing converter. Its unchanged
cone-generation body is not reproduced in the patch; inspected bounded built
browser and CPU-bundle substrings for that body. The converter finds the nozzle
bone and its source subtree, measures root-space bounds, derives radius as
`max(X extent, Y extent) * 0.5 * 0.7` (0.4 fallback), and generates outer/inner
open cones. Outer radial segments are 16; inner 12, with four height segments.
Inner radius is 0.55 of outer and length 0.6 of configured length. Axis/sign
rotation and translation precede rigid skin attachment to the nozzle bone.
The two cones contribute 196 triangles per nozzle and merge into one flame
batch. No GLB animation clips are required.

Built animation applies throttle above 0.7 and boost through the existing
smoothed state. With flicker factor F, throttle A and boost B, exhaust-disc
glow multiplier is `(0.5 + 2.5*A + 4*B)*F`. Flame multiplier is
`(1.2*T + 1.6*B)*F`, visible above 0.03; longitudinal scale is
`(0.35 + 0.35*T + 0.6*B)*F`, transverse scale `0.85 + 0.15*T`.
T combines the high-throttle response and boost. The patch also clears stale
boost/firing hints when local ownership ends. No replacement renderer or
weakened gate was used.

## Fresh CPU execution

Exact invocation from repository root, with stdout/stderr retained:

```sh
set -o pipefail
{ node Games/Wings/verification/astra-check.mjs; echo "astra exit=$?";
  node Games/Wings/verification/solo-check.mjs; echo "solo exit=$?";
} 2>&1 | tee .swarmforge-logs/wings-v2-phase3.log \
  | tee -a .swarmforge-logs/worker-20261018-110805.log
```

Both individual exits were **0**. Exact full JSON and PASS text are in the log.
The final solo line was:

```text
PASS: offline takeoff, fresh session, ordinary-input crash and respawn; rendering not tested
```

Actual cold-template CPU measurements, including local I/O, GLTF parse,
conversion and view setup:

| Kind | Source meshes / materials | Bones | Converted batches | Converted triangles | Flame triangles | Disc triangles | Load/conversion/view ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| fighter | 151 / 151 | 13 | 8 | 17,288 | 392 | 64 | 486.924117 |
| blackbird | 123 / 123 | 11 | 8 | 18,420 | 392 | 240 | 272.930369 |
| f15 | 142 / 12 | 7 | 6 | 41,744 | 392 | 184 | 296.688413 |
| f35 | 143 / 12 | 8 | 6 | 41,008 | 196 | 92 | 246.423353 |

Jet source totals are 41,352 and 40,812 triangles. Conversion adds exactly the
reported flame totals. These are per-model CPU batches, not native scene/frame
draw calls or a performance comparison. Single timing samples establish no
hardware or load-time acceptance.

Inspected `verification/astra-check.ts` descriptor/loader/bone/exhaust checks
and corresponding bounded `.mjs` assertion and converter substrings. Extracted
the added source from `port.patch`: exact text equality with tracked
`astra-check.ts` was **True**. An initial extraction used the wrong patch path
and raised `ValueError: substring not found`; correcting to the actual
`games/wings/astra-check.ts` section resolved it. No rebuild or complete
source-to-binary reproducibility claim is made.

The executed assertions use the real exported loader/template/view and actual
converted skeleton/materials. They require generated geometry beyond the raw
asset count and a flame batch; resolve every configured nozzle bone; and check
that converted skin indices attach geometry to each tested bone. For each jet,
120 update steps at idle require hidden flames. Another 120 at throttle 1 with
explicit boost false require visible flames and disc glow above twice idle.
Another 120 with boost true require visible flames, disc glow above three times
idle and 1.5 times throttle-only, and each nozzle Z scale above twice idle.
These thresholds passed; the runner does not print exact glow/scale samples.
They are CPU render-state assertions, not observed exhaust pixels. The broader
unchanged runner also passed combat/store fixtures; those do not establish
native missile or Phase 4 acceptance here.

## Single bounded native attempt: HOLD

Inspected existing `check-browser.py` menu selectors and `port.patch` debug and
first-draw hooks before probing. `window.__wings` exposes stats/game; the current
scene gate rejects shader errors, zero draws and a 20-second first-draw timeout.
The existing UI runner intentionally disables rendering, so it was not used as
positive native evidence.

Probe source and evidence are under `.tmp/wings-v2-resume/phase3/`:
`probe.py`, `probe.log`, `probe.json`. Exact command:

```sh
set -o pipefail
timeout --signal=TERM --kill-after=2s 88s \
  python3 -B .tmp/wings-v2-resume/phase3/probe.py 2>&1 \
  | tee .tmp/wings-v2-resume/phase3/probe.log \
  | tee -a .swarmforge-logs/worker-20261018-110805.log
```

The probe had an internal 85-second deadline and an owned loopback HTTP server.
Existing system Chromium launched headless with `--no-sandbox`, `--use-gl=angle`,
`--use-angle=swiftshader`, `--enable-unsafe-swiftshader`; actual Wings URL used
`?webgl`. Intended path was ordinary Settings input to Low, Escape, then Solo
flight, followed by real debug stats/error and screenshots. No state grants,
force clicks, localStorage settings injection or renderer bypass.

It ended after **9.25308087898884 seconds**, with:

```text
Locator.click: Timeout 5000ms exceeded.
Call log:
  - waiting for locator("#screen .mi .t").get_by_text("Settings", exact=True)
    - locator resolved to <span class="t">Settings</span>
  - attempting click action
    - waiting for element to be visible, enabled and stable
```

The cause beyond failed actionability is unproven. **Low and Solo were not
reached.** No renderer stats/error or screenshot was obtained, and no real scene
draw was observed. Page errors, console errors and external requests were empty
only for this short menu interval. Command exit 0 means the collector saved its
HOLD result, not a test pass. Browser close and server shutdown executed in
finally blocks; the post-run process check found no probe or owned Chromium
profile process. No second native attempt was made. This collector failure does
not prove a renderer defect, cure historical Pi failures, or accept exhaust
pixels. Parent must retain native/visual HOLD.

## Hygiene and remaining gates

`python3 -B scripts/check_maintenance_docs.py`, exit 0:

```text
PASS: 130 game documents cover 125 registered + 5 unregistered games; Git inventory current.
Coverage only: section presence does not certify documentation accuracy or gameplay.
```

Initial available bytes: **2,337,816,576** (`df -h`: 2.2G). After execution:
**2,337,452,032**, a filesystem decrease of 364,544 bytes, not exclusively
attributed to this worker. Both exceed the strict 2 GiB floor. No installs or
sparse changes. Worker output is tee-recorded at
`.swarmforge-logs/worker-20261018-110805.log`; CPU output has the dedicated log
above. Native screenshots are absent, not historical substitutes.

Only this new receipt is staged explicitly. Full fleet gate was not run in this
verification-only scope. CPU commands: 2/2 passed; native attempts: 0/1 accepted.
Native rendered exhaust, converted-family pixels, supported hardware, operator
approval, rights and publication remain separate open gates.
