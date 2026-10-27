# Citisten: clear camera keys across native UI focus (#56)

## Result and boundary

**A real DOM input-lifecycle defect is reproduced and fixed.** Holding W on
canvas, focusing a native control with the mouse, then releasing W leaves the
old camera translating because the panel stops keyup before window bubble.
The shared controller now observes keyup in capture. This is conditional stuck
input, **not proof that the user's reported whole-world shaking is resolved**.
Site versus private Chromebook v2 origin remains unknown. Native/GPU,
Water/Save/Continue, compositor, hardware and user-device acceptance remain
unpassed. No Game entry, renderer, world, animation, save, native bootstrap,
UI/CSS, vendor, driver configuration, packaging, export or catalog change.

## Identity, ownership and source

- Sole model `openai-codex/gpt-6.1-sol`, session
  `01a17cb3-7c51-757e-bd4a-56d5dbb46659`; no subagents.
- Session log basename:
  `2026-10-27T09-31-39-989Z_01a17cb3-7c51-757e-bd4a-56d5dbb46659.jsonl`.
- First command 2026-10-27 09:31:47 UTC; hard deadline 09:43:47 UTC.
- Baseline HEAD `a73ef8deb9931cc47e4ea37774659ce0e600fe9f`, game tree
  `cf589170731afb5e3f974305a449045fc225ac14`, 226 files / 35,157,269 bytes.
  Inventory matched before this change. Baseline camera SHA256
  `6415a51069a8ade5314d7e5647eb5d58575bf5b6e703835feeef91dbeb32d76f`.
- New game tree `fe47601d41652fa93fc51860efa655c1607eacb5`, same 226 files /
  35,157,288 bytes. Only `camera.mjs` differs in the game. New camera SHA256
  `5bc9fdeb1be7bfac300d50fcb4cd09e6c71fa9e02e333dfa0d72c2c9714cf149`.
- Read complete camera/world diagnosis, current parent dispatch, maintenance
  README, 999-line manual, inventory and actual shared controller/callers.
  Parent-owned untracked `docs/citisten-shaking-dispatch.md` is untouched.
  Parent owns canonical manual, inventory, new freeze and release handoff to
  owner `74b61fa7` for serial deployment. No peer contact or push here.

## Cause and one-line patch

`world.mjs:createWorld` constructs the shared controller once; native and
`world-demo.mjs` both use that world. Native renders through its existing single
loop and `world.render` calls `controls.update`. Neither caller needs a patch.
Other direct controller consumers are camera-fit/terrain checks, not another
production input owner. Native panel and UI root both stop bubbled keyboard
input. Native's exact policy at `native.mjs:188` is:

```js
for (const event of ['keydown', 'keyup', 'pointerdown', 'pointerup', 'wheel']) listen(panel, event, e => e.stopPropagation());
```

Only the shared registration at `camera.mjs:54` changes:

```js
on(window, 'keyup', event => keys.delete(event.code), { capture: true });
```

No new preventDefault or stopPropagation. Editable keydown filtering, key speeds,
dt cap, collision, easing, pointer handling and blur recovery are unchanged.
Existing `on` records the same options for removal; disposal removes capture too.
The constructor's one-time rotation initialization is not named as a cause.

## Actual DOM red / green

Retained ignored fixture, runner, exact baseline source, raw results and first
failure are under `.tmp/citisten-key-release/` (about 307 KB after verification,
below 1 MB). No new permanent Python harness. The runner imports only existing
QA process helpers; it does not call their main, prepare or freeze routines.
Executed fixture SHA256:
`d8ff4305c3baa7d2592460cc88430e1f213f5965b70739da16deaff464a2064c`.
Runner SHA256:
`0f54ae6f490e3b9a47dec93ad5c996b5508bc355ff6f57ed1b10b836e23629b1`.

The minimal canvas/input/button fixture imports real local Three and the real
controller, with the exact extracted native stop policy. It creates only a
PerspectiveCamera, no renderer, model, game, native world or save. Its own bounded
rAF delivers controlled 1/60-second updates and records target, position, camera
matrixWorld, view and projection. It never changes the controller's internal
key set. Both module responses are byte-exact source: saved HEAD baseline first,
then the actual patched file in a fresh page with no-store responses.

Physical sequence for both pages:

1. Mouse click/focus canvas; physical keyboard W-down; eight controlled updates.
   Target Z changes from 160 to 144.13333333333344, proving accepted keydown.
2. Mouse click/focus native input; physical W-up. Event path is
   `input -> native-controls -> BODY -> HTML -> document -> window`.
   Window capture records phase 1, panel bubble phase 3; no window bubble
   keyup arrives. Both observed keyup records have defaultPrevented=false.
3. Sample 45 then 120 further frames without input. After capture fix, release
   clears the key before the unchanged panel stop; the target is exactly fixed.
4. DOM window blur clears the baseline stuck key. Separate physical W-down/up
   on canvas stops normally. Blur while W remains held also stops. These controls
   pass old and new. Native input still accepts physical `abc` text unchanged.

| Measurement | Original | Patched |
| --- | ---: | ---: |
| Maximum target drift from release-time target, 45 frames | 89.24999999999993 | 0 |
| Maximum target drift from release-time target, all 165 frames | 327.24999999999966 | 0 |
| Maximum adjacent camera-world delta, first 45 samples | 1.9830441802767353 | 1.046517153676831 |
| Maximum adjacent view delta, first 45 samples | 1.578669343725295 | 0.8331153509457749 |
| Last adjacent camera-world delta | 1.9833333333327232 | 1.6768808563938364e-12 |
| Last adjacent view delta | 1.5788995337884728 | 1.3073986337985843e-12 |
| Projection change | 0 | 0 |

Raw runner's first-45 metric starts at the first post-release sample, so it reports
87.26666666666661 versus 0 target drift. `derived-metrics.json` measures from the
last held sample, which is the exact release-time target because no fixture
update occurs during focus/key release. Patched position-to-target error decreases
monotonically to `9.180212146020494e-12`; nonzero early matrix motion is legitimate
easing, not continued target translation. Raw samples remain unchanged.

First fixture attempt failed before testing because its local route omitted
Three's `three.core.js` dependency: `Page.wait_for_function: Timeout 3000ms exceeded`.
No patch followed that failure; browser/server/profile cleanup passed. The
corrected route then ran one browser launch with serial baseline/patched pages,
exit 0 in 41.901s including 5.564s cleanup. First failure/log are retained, not
rewritten as success. Both launches pin `/usr/bin/chromium`, sandbox enabled,
headless DOM-only with `--disable-gpu`; no download or Game/WebGL/GPU retry.
Fresh executable-aware process checks were empty before both launches. Successful
run's logical profile/output peak was 1,973,907 bytes, below the 11 MB cap with
1 MB reserved; root stayed above 2,147,483,648 bytes. No screenshots/fonts/sparse
changes or 40 MB HTML/export copy. Browser roots/descendants, server and owned
profile closed; independent executable-aware scan found no remaining browsers.
No foreign signals, contact or outside-repository deletion.

## Permanent regression and commands

`scripts/citisten_camera_stability_check.mjs` adds one focused, explicitly fake
capture/bubble hierarchy around the real controller and Three. The stopped-input
keyup assertion fails against original source (exit 1) and passes patched source.
It also asserts editable keydown remains ignored, keyup is not cancelled, and
capture registration/removal match. Existing idle, input, matrix and scheduler
checks remain unchanged and passing. This fixture is not mislabeled browser proof.

Executed after the product change:

- `node scripts/citisten_camera_stability_check.mjs`: exit 0,
  `CAMERA STABILITY PASS: real Three world/view/projection matrices; CPU fixture only; no shaking root cause reproduced`.
- `node Games/Citisten3D/camera-fit-check.mjs`: exit 0,
  `CAMERA FIT CHECK PASS: 756 current-Three projections` (full receipt retained).
- `node Games/Citisten3D/native-check.mjs`: exit 0, `NATIVE LOOP PASS`.
- `node --experimental-vm-modules Games/Citisten3D/continue-loop-check.mjs`:
  exit 0, `CONTINUE LOOP PASS`; fake DOM/world/RAF, not native acceptance.
- `node --check Games/Citisten3D/camera.mjs` and
  `node --check scripts/citisten_camera_stability_check.mjs`: both exit 0.
- Catalog required-schema, unique-integer-ID and Git-tracked-URL guard: exit 0,
  `CATALOG PASS: 129 entries, required schema, unique integer IDs, Git-tracked URLs`.
- `git diff --check`: exit 0. Added source contains no external loads.
- `python3 -B scripts/check_maintenance_docs.py`: before commit, exit 1,
  `Commit inspected source changes before validating its inventory.` Parent must
  update manual/inventory for the changed game tree; the preexisting missing
  Brainrot manual also remains. Post-commit outcome is in the final handoff.

Four targeted Node suites, two syntax checks and focused actual-DOM red/green
pass. No full-fleet/release gate, native visual acceptance, new game, new asset,
publication, export replacement or push. Existing v2 Blob policy, supplied art,
immutable exports, freezes and failed evidence remain untouched.

Initial available root bytes: 2,356,707,328. Pre-receipt: 2,355,630,080.
Shared-host changes are not attributed solely to this lane; final disk/status,
commit and completion time are reported in the handoff. No waiver used.
