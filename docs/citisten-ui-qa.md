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

Runtime is 379 lines across the four UI/preview files. The regression runner
is 274 lines; documentation is counted separately. UI deliverables including
mockups and evidence occupy about 3 MiB. Root free bytes at lane start:
4,026,675,200; final browser receipt: 3,871,924,224 (delta -154,750,976).
These are shared-host availability samples, not UI-exclusive consumption;
other lanes were active. No guard waiver was needed. Detailed execution
samples live in `J-ui-results.json`.
