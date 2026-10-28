# Citisten opt-in motion diagnostic: integration checkpoint

## Serial release integration (2026-10-28)

Sole release writer `74b61fa7` integrated the pinned source/docs handoff
`f2697fc0` / `9d959b73` onto fresh main `885cbb20`, not a whole-branch merge.
Source commit: `017e4a47e6235917ee21c46d221caa230855615f`.
The entire game tree and all **233 source-freeze hashes** match; newer Wings,
Jank, Foldwild, catalog, portal and backend bytes are preserved. Model/vendor/font
bytes are unchanged. The manual conflict retained main's newer release notes and
qualified source-lane history. The previously source-only save/resume regression
is included verbatim so the documented eight commands are available on main.

Independent read-only verification reproduced **8/8 targeted executables** and
**8/8 syntax checks**, all exit 0: recorder16, sampler25, native-hook14 off/on
checkpoints, save5/5, camera/world stability, native loop and Continue. Parent also
parsed the newly imported save/resume script: **9/9 syntax checks total**. Source
HEAD and all233 hashes stayed unchanged before/after. Full command stdout/stderr,
individual exit codes and timings are preserved verbatim in
[citisten-motion-independent-checks.log.gz](citisten-motion-independent-checks.log.gz)
(raw SHA256 `d22bcf5a3231cea430fac112d3398bfa2d442d113d403a2c339fcf06f97a9b2b`).
The [archived source freeze](citisten-motion-release-freeze.json) is byte-identical
to the owner's manifest, SHA256 `6f1e9460bd80692048064f9e311fe3f5bcf46c12844995d637448fba36bdf4a0`.

Official maintenance refresh changed **only Citisten's inventory row**.
`PASS: 135 game documents cover 129 registered + 6 unregistered games; Git inventory current.`
The missing-Brainrot findings below belong to the historical source lane; the
release base already contains the separately repaired manual. This is coverage,
not gameplay certification. Catalog stays129, games added0.

Published source/inventory main `da16004a0a27bbb7c11ff3e0961e2a74f14adb24`;
[Pages run40689333665](https://github.com/lzeo2/TestRepoGame/actions/runs/40689333665)
completed **success**. The initial bounded status observation ended in-progress,
not a failed deployment or an inferred success. Later exact-run status was verified.
Canonical [Citisten](https://lzeo2.github.io/TestRepoGame/Games/Citisten3D/) files
were checked at **2026-10-28 12:44:24–12:44:46 UTC**: **233/233 HTTP200 and exact
frozen SHA256 matches**, **80/80 JS/CSS/HTML MIME validations**, zero retries.
Both new modules are `text/javascript; charset=utf-8`; entry/native/controller/CSS,
namespace dependency and every other frozen asset match. Streamed35,246,216bytes;
no response bodies or model/font copies saved. Verbatim structured evidence:
[citisten-motion-public-freeze-check.json.gz](citisten-motion-public-freeze-check.json.gz).
This proves served identity, not execution, pixels or user resolution.

No browser, screenshot, device/export rebuild or unchanged failed renderer retry
was performed by the release integrator. Owner's double-based DOM proof is reused
only as DOM evidence; all prior failures/tool timeout and requested native **0/5**
remain. Whole-world shaking, native Water/Save/Continue, hardware and FPS are
**UNPASSED**. No full-fleet run or native-acceptance claim.

## Source-lane status

**Whole-world shaking and native Water/Save/Continue remain UNPASSED.** This
milestone implements an observational tool, not a rendering fix or test acceptance.
The report's origin remains unknown: website versus downloaded Chromebook v2.
No v2 rebuild, unchanged failed GPU configuration, quality reduction or push from
this lane. Existing user saves, simulation rules and supplied assets are unchanged.

Source milestone `f2697fc0589ebe1d1b3948077e3a4b22d408de45`, game tree
`ff06ce5f68cbf300d93fd55c5a8396ed563d3cd4`: **228 files / 35,188,315 bytes**.
Baseline `b00597df` had 226 / 35,157,288; growth is two authored modules and
31,027 game-tree bytes. Catalog remains 129 registered / 135 projects, zero games
added. No build step, dependency installation, asset replacement or provenance change.

## Ownership and actual commits

[Contract agreed before delegation](citisten-motion-diagnostic-contract.md).

| Lane | Commit | Actual result |
| --- | --- | --- |
| #57 sol | `d66dfef0` | Recorder, 16 cases; [receipt](citisten-motion-recorder.md) |
| #58 astra | `e59956d9` | Sampler, initial 18 cases; committed before 12-minute tool timeout143; final handoff missing, timeout retained |
| #59 astra | `f2fd1c6f` | Actual createWorld/18-GLB/simulation/recorder integration, 25 cases; [receipt](citisten-render-motion-sampler.md) |
| Parent | `f2697fc0` | Native hook/UI/controller getter and integration regression |

Worker log basenames: `worker-2026-10-28T10-50-07-968Z-dc0709eb.log`,
`worker-2026-10-28T10-50-08-008Z-a2009b24.log`,
`worker-2026-10-28T11-12-35-411Z-671f57e8.log`, under `.swarmforge-logs/`.
Models remained `openai-codex/gpt-6.1-sol` and `openai-codex/gpt-6-astra`, high.
No nested workers or provider/reasoning changes. Workflow quality mode is not
proof of an effective inference-service-tier change.

## Runtime boundary

In the existing **Controls** details, **Record motion (5s)** starts an opt-in,
memory-only report. `native.mjs` calls `sample()` only AFTER its existing
`world.render(...)`. The timer finalizes; it never renders, updates simulation,
wakes or keeps the loop alive. No extra RAF, forced pause/resume, GL queries,
network/storage/export/clipboard behavior or animation removal. The normal input
capture wake, busy predicate, full simulation delta and render-only clamp remain.
Continue/new town cancels the old cohort after snapshot validation. Pagehide
clears the timer and cohort. `window.citisten.motionReport` returns a detached copy.

`camera.mjs:inputState` returns a copy of held WASD codes, drag state and input
version, not typed text. The report textarea is excluded by both native shortcut
guards, including the capture-phase defense S action. Tests exercise S/Escape
focus without changing game state. The proven capture-keyup fix remains intact.

The sampler distinguishes camera, projection, target/input, viewport, static
scene/first instances, projected scene-local references and shading parameters.
It reads cached computed matrices, not pixels. Cohorts/metadata are bounded;
missing values, omissions and changed identities remain explicit. Actual-world
fixture captured 14 of 17 matched original hall/home batches within 24 nodes and
128/201 direct children. No all-building/all-instance/all-frame claim follows.
Recorder coverage metadata can exceed its sanitizer budget: `metadata-limit` and
`partial` remain visible. Stale cached renderer counters do not establish GPU health.

A paused native loop normally sleeps after about two seconds. A five-second
recording can therefore contain only those callbacks and honestly finish partial.
The UI's frame count is an observer-sample count, not presented frames or FPS.
Stable sampled transforms do not rule out unsampled geometry, GPU/depth/shading,
viewport/compositor artifacts or the user's visible shaking.

## Source and Node verification

`.tmp/citisten-motion-ui/final-checks.log` retains actual command output. Eight
relevant Node executables passed, plus eight syntax checks, catalog and diff:

```sh
node scripts/citisten_motion_diagnostic_check.mjs
node --experimental-vm-modules scripts/citisten_render_motion_sample_check.mjs
node --experimental-vm-modules scripts/citisten_motion_native_check.mjs
node scripts/citisten_camera_stability_check.mjs
node --experimental-vm-modules scripts/citisten_world_stability_check.mjs
node scripts/citisten_save_resume_check.mjs
node Games/Citisten3D/native-check.mjs
node --experimental-vm-modules Games/Citisten3D/continue-loop-check.mjs
```

Actual new outputs: `MOTION DIAGNOSTIC PASS: 16 cases`,
`RENDER MOTION SAMPLER PASS: 25 scenarios; ... forbidden calls 0`, and
`MOTION NATIVE PASS: 14 callback checkpoints x observer off/on; full snapshots/save
bytes/render counts/one-owner identical`. Save regression remains `groups=5/5`.
Camera/world fixed-transform and exact replay checks pass; no shaking cause is
reproduced by them. Native integration additionally checks zero-callback timer
completion, no timer-driven wake/render/update, duplicate starts, read-after-render,
Continue cancellation and pagehide/stale-timer cleanup.

First integrated Continue evaluation failed `ReferenceError: URL is not defined`:
the sampler now imports the existing model namespace metadata module. The VM
fixture lacked browser URL/import.meta.url primitives because its world is mocked.
Only those fixture primitives were supplied; original scenario timestamps,
assertions, game input, save logic and 500ms/5s acceptance gates were not weakened.
Native harness frozen-source pins still describe older cases and were not bypassed.

`CATALOG PASS: 129 entries, unique integer IDs, schema and Git URLs` and
`DIFF CHECK PASS` were observed. Added runtime source has no external/absolute
loads. Canonical inventory refresh changes only Citisten's row. Documentation
coverage in that source lane remained blocked by the preexisting missing Brainrot
manual; no fabrication. Serial main's separately repaired coverage result is above.

## Actual DOM integration, not actual native graphics

One serial sandboxed system-Chromium DOM sequence exercised the current real
index, native entry, CSS, UI, controller, simulation, scheduler and new modules.
**world.mjs was explicitly replaced by a renderer/world double.** No WebGL,
supplied-model rendering, GPU health, visual-shaking or native gameplay acceptance.
All other served source bytes were current local bytes; fonts were served directly
from tracked Git blobs without materializing sparse-excluded files. No forceclick,
game-state grants, screenshots or independent frame pump.

Retained cases `.tmp/citisten-motion-ui/entry{1..5}/`:

1. Strict locator matched hidden Continue too; stopped before Free build.
2. Correct locator reached native controls; builder intercepted Record click.
3. Shared details 40vh scroll cap alone still failed with Service palette open.
   Measured controls y261.578..719.172 and builder y433.609..788 at 1280x800.
4. Expanded-controls-only z5 fixed Record and report; later Water check failed
   because the existing mobile breakpoint handler closes tool options.
5. Same final source, normal Service reopen after resize: full DOM protocol passed.

No source failure was erased or forced through. Only expanded native Controls
gets z5; closed remains z1, builder z4/toasts z3 unchanged, native modal top layer
unchanged. All-width details scrolling reuses the prior mobile treatment. Covered
builder controls are usable after closing Controls, not claimed concurrently
clickable through an open overlay. Advice ticket `pi-340949-1793187874555-ff318315`
recommended cap first and conditional stacking only if measured necessary.

Final actual result: **120 samples**, elapsed **5000.900ms**, sample span
**2000.700ms**, `partial:true`; zero sampled camera/scene delta in this double.
The sleeping loop did not wake when the deadline displayed its report. Paused
full snapshot and storage bytes stayed identical. Canvas stayed 1280x800, then
390x844 at the mobile viewport; no horizontal overflow. Mobile button height44px,
ordinary hit target valid, output selectable, textarea W/Escape safe. Closing
Controls then normally reopening Service and selecting Water worked. This proves
UI selection only, not water placement or its native acceptance gate.

Entry5 exit0; cleanup0.943s, owned PIDs gone/profile absent/port closed, zero remaining
browsers, exact sparse/config and font absence preserved. Every earlier case also
closed its resources. Final observed peak **1,311,706 logical bytes**, including
live profile and retained earlier DOM evidence, plus the required 1MB reserve,
under 11MB. No raised cap/floor waiver; all finite leases released. No requested
native capture produced: **0/5** remains. No full-fleet run.

## Preservation and next action

New separate 233-hash `.tmp/citisten-motion-ui/freeze-motion1.json`, SHA256
`6f1e9460bd80692048064f9e311fe3f5bcf46c12844995d637448fba36bdf4a0`,
records the source milestone plus five fonts. It differs from key-release freeze
only in camera getter, Continue VM fixture, index/native CSS/native hook and two
new modules. All original model/vendor/font hashes match. Original185, expansion231,
toast231, empty-pool231 and key-release231 manifests verify byte-identical. Raw
failures and the already-delivered v2 remain unchanged; no large export copy.

Serial integration/publication belongs to owner `74b61fa7`, not this lane. Source
and DOM success are not deployment or acceptance. After publication, compare the
exact served index, native/controller/CSS, both new modules and their dependencies
against the source manifest. Keep known-failure release disclosure; no new
green-only hold or repeated approval request. The private operational checkpoint
records handoff and any later HTTP identity verification separately.

Useful next evidence is a real responsive user's report while paused/hands-off,
plus site versus downloaded v2 and, if available, a building-edge/HUD clip. Read
matrix/input/viewport/shading changes without inventing a cause from zeros or
missing coverage. Native Water/Save/reload/Continue must still satisfy the original
physical-input, paused-equality and completion gates on a responsive renderer.
No unchanged failed Pi renderer run is justified by this diagnostic alone.
