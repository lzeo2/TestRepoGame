# CITISTEN UI lane receipt

## Scope and owned files

- Runtime: `Games/Citisten3D/ui.mjs`, `ui.css`.
- Explicit preview: `Games/Citisten3D/ui-preview.html`, `ui-preview.mjs`.
- Runnable regression: `Games/Citisten3D/ui-qa.py`.
- API/maintenance: `docs/citisten-ui-api.md`.
- Five generated originals and prompt/postprocessing record:
  `docs/citisten-design/ui-mockup-*.png`, `README.md`.
- UI evidence only: `docs/maintenance/audits/citisten-QA/J-*.png`,
  `D-ui-*.png`, `J-ui-results.json`, `J-ui-run.txt`.

No simulation logic, world mesh, camera maths, catalog entry or third-party
runtime load was added by this lane. Preview calls the published simulation
API; it deliberately has no world/placement input. Main integration owns the
game entry, placement, actual shortcuts, pause/reset lifecycle and registration.

## Execution and evidence status

Final-source UI regression completed with:

```text
UI CHECK PASS: 36 fixture screenshots, 10 collages; 3 viewports, 2 themes; zero console/page/network errors
```

These captures are UI fixtures, not simulated gameplay evidence. Viewports:
1440x900, 390x844, 320x740. Both themes are captured through native theme
buttons, with dark as a fresh default. Every generated piece has a side-by-side
collage in each theme. Actual recorded requests were loopback/local fonts only.

The currently stored screenshots include the compact feedback changes in
`b651f30`. Earlier screenshot review found a 320px toast stack touching the
tool options despite passing older automated bounds checks. Final regression
adds notice/tool intersection checks, one urgent phone notice, new-session
feedback cleanup and tool reset. Final images supersede the older captures.
Dark/light desktop and phone images were inspected; no acceptance grade is
assigned by this lane.

The shared browser queue initially encountered unrelated Chromium contention.
Global coordination ticket `pi-2075977-1792627216164-ef1c474e` and UI advice
request `pi-2076318-1792627519359-18ce7f1e` document that hold; the latter
returned cancelled, not approval. The operator subsequently explicitly released
the global slot after world, with other owners holding. A transient preflight
refusal was respected. The final successful UI run performed **37** exact
process-executable/ancestry checks before/during captures, with no foreign
browser. End-of-run `ps` showed owned browser/driver/server gone; global slot
was explicitly released to sim, and Wings/Jankolock owners were notified.
No competing browser was stopped. Coordination ticket files may remain open;
the practical browser hold was resolved by the operator's explicit release.

## Reviewer map, not assigned grades

Each pattern below exists for `dark` and `light`, at 1440/390/320 widths:

| UI evidence | File pattern | Limits |
| --- | --- | --- |
| I menu/mode choices | `J-I-ui-menu-<theme>-<width>.png` | Callback values, not wave suppression proof |
| C/D HUD and demand bars | `J-C-D-ui-hud-<theme>-<width>.png` | Fixture values, not economy/network proof |
| B toolbar and zoning | `J-B-ui-toolbar-<theme>-<width>.png` | Selection callbacks, not placement proof |
| F/G night HUD and map blips | `J-F-G-ui-nightalert-<theme>-<width>.png` | Presentation, not combat proof |
| H loss stats | `J-H-ui-gameover-<theme>-<width>.png` | Peak population displayed; fixture loss only |
| D blackout notice | `D-ui-blackout-<theme>-<width>.png` | Notification/demand presentation only |
| J mockup comparison | `J-comparison-<piece>-<theme>.png` | Generated left, actual UI fixture right |

Reviewer grades J and all other letters. This lane assigns no acceptance grades.
L's zero-external-request result applies only to the preview/fixture UI, not
the future integrated game. A/E/K and full gameplay acceptance are outside UI.

## Checks and repairs

The browser runner uses only system Chromium, a dynamically isolated loopback
port (or `SMOKE_PORT`), per-write `df -B1` guards, bounded outer invocation,
exact process-ancestry exclusivity checks and server/browser cleanup. No install or browser download. Run only in the shared
browser slot:

```sh
timeout 120 python3 -B Games/Citisten3D/ui-qa.py
```

Runnable checks: native Tab/Enter and visible focus, both mode callback values,
all implemented tool groups, selected state, tooltips, 44px targets, viewport
and button-copy clipping, HP and utility values, peak population, acknowledged
loss staying on the menu, hall icon drawing above zones, toast burst limits,
duplicate suppression/expiry, disabled storage, cleanup and no gradients,
shadows, page/console errors or external requests.

Harness-only corrections during the initial runs: native keyboard focus rather
than pointer-followed `focus()`, fixture numeric reset between themes, and a
braced storage override to avoid Playwright invoking its returned function.
UI repairs: narrow option widths, panel-relative tooltips, toast layout below
the banner, loss acknowledgement persistence, hall icon ordering, compact
notice priority and clearing old-session feedback.

Syntax and diff checks passed. Runtime external-load grep found no matches.
Catalog check: `127 entries; unique IDs, schema and tracked URLs OK`; no catalog
edits by UI. Maintenance checker currently reports `Inventory stale: inspect
changes, then run --refresh.` Canonical inventory/README are outside UI's
allowed paths; the sim lane has been asked to refresh after all source lands.

## Remaining holds

Reviewer grading; main game integration and keyboard wiring; unavailable
barricade (disabled, not silently mapped to wall);
actual touch world controls, screen-reader/target-device review; canonical
inventory refresh and the full registered-game release gate. No push or game
registration was performed by UI.

## Milestones

- `2e80266`: generated/normalised mockups and prompt evidence.
- `605b2f2`: accessible menu/HUD, preview, regression and published API.
- `ea3b15d`: loss menu, town hall map ordering and narrow control fixes.
- `b651f30`: compact notice priority, fresh-session feedback and tooltip bounds.
- `f2105d3`: final-source evidence, process-ownership guard and reviewer receipt.

UI-owned paths are committed. At receipt time, the remaining shared dirt was
sim-owned `Games/Citisten3D/sim-qa.py`, `docs/citisten-sim.md`,
`docs/maintenance/README.md`, `docs/citisten-design/sim-browser-console.txt`,
and the C/D/F/G/H/I `*-sim-api-fixture-*.png` captures in the QA directory.
UI did not stage or alter those paths; sim owns their final commit/refresh.

Runtime is 379 lines across the four UI/preview files. The regression runner
is 282 lines after Batch32; documentation is counted separately. UI deliverables including
mockups and evidence occupy about 3 MiB. Root free bytes at lane start:
4,026,675,200; final browser receipt: 3,871,924,224 (delta -154,750,976).
These are shared-host availability samples, not UI-exclusive consumption;
other lanes were active. No guard waiver was needed. Detailed execution
samples live in `J-ui-results.json`.

## Batch32 step 1 resume

Only UI harness/receipts changed; UI runtime, CSS, world and sim source were
not edited. The answered focus-modality ticket
`pi-2076318-1792626304720-91c57159` was applied to the shared helper:

- Resolve the active dialog/HUD's live eligible tab order, including positive
  tabindex ordering and disabled/inert/hidden exclusions.
- Compute Tab presses from current/target indices, rather than a fixed Tab
  count or programmatic focus. Menu and tool checks use the same helper.
- Assert the target is `activeElement`, matches `:focus-visible` and has a
  resolved outline width of at least 2px. Check the solid CSS rule separately.
- Retain native Enter, pointer activation and theme-change checks.

The first new run stopped at the stylesheet assertion. The existing outline
shorthand contains `var()`, so the assertion was corrected to inspect the
shorthand and separately verify resolved width after keyboard focus. This was
a harness correction, not a runtime style change or removed modality check.

The bounded retry completed exit 0 with the same printed 36-screenshot,
10-collage success line above, 37 process-ownership checks and no page,
console, failed-request or external-request errors. Both themes and all three
viewports ran. Captured PNGs have no changes from the prior committed fixtures.
Log: `docs/maintenance/audits/citisten-QA/J-ui-batch32-run.txt`.
Current result: `J-ui-results.json` in the same directory. Neither is a reviewer
grade or integrated gameplay acceptance.

Owned browser/driver/server closed and end-of-run `ps` was empty. Step 1 and
browser completion were sent to sim `9347e97` and world `b16dd16`; global slot
was explicitly released next to world for the approved measurement/probe.
The canonical maintenance check remains blocked while source lanes are dirty;
refresh belongs after their final commits, not an inventory edit by UI.

Step-start root free: 3,860,889,600 bytes. Browser receipt end: 3,846,877,184
bytes, shared-host delta -14,012,416 bytes. No guard waiver or new dependency.

## J / K draft / L preview follow-up

[Eight-piece evidence receipt](citisten-jkl-evidence.md) adds 16 per-piece
comparisons from the original pre-code generated composites and actual UI
fixtures, an unregistered id 241 catalog draft, and cold request logs plus four
live UI-preview frames. No runtime, CSS, world or simulation logic changed.
The live preview made 18 local requests/18 HTTP 200 responses, with zero external
attempts, sockets, failed requests or console/page errors under cache-disabled,
service-worker-blocked and non-loopback-denied conditions. Full-game K/L remain
unestablished: the actual catalog stays at 127 and the integrated game entry is
missing. Reviewer grading and separate registration/push approvals remain.

## Operator copy pass (current UI)

[Copy-pass receipt](citisten-copy-pass.md) supersedes the earlier narrative UI
copy and captures. The runtime/preview text is trimmed to labels, numbers,
key hints, status and essential controls/errors. No sim/world/camera logic or
runtime import changed. Old J/K/L images and exact asset hashes remain frozen
as historical evidence, not current-code proof.

Current screenshots and results are in
`docs/maintenance/audits/citisten-QA/copy-pass/`: 36 frames covering all six
screen states in both themes at 1440/390/320 widths, plus 10 comparisons.
Initial bounded copy regression exit 0: 37 ownership checks, zero console/page/
network errors; exact copy, focus, callbacks, touch targets and toast lifecycle
checks retained. A final accessibility review then added selected-state
`aria-pressed` to the group buttons, preserving announcements after duplicate
single-tool rows were removed. Final-source recapture for that attribute is
pending the reserved queue; no competing browser was launched. Owned resources
closed; next browser slot explicitly released. Reviewer grades, whole-game
integration and canonical inventory refresh remain separate gates.
