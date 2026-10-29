# Citisten compact HUD and onboarding repair

## Source handoff

Base: `f66c65c6087c79f34c7e1263cc98b23208a9ee52`. Sole resumed worker,
`openai-codex/gpt-6.1-sol`, high; no subagents or settings changes.
This resumes the existing UI WIP after the user-aborted tool143 scheduling
message, not a new implementation lane. Original worker log:
`.swarmforge-logs/worker-2026-10-28T22-57-58-197Z-4c346a54.log`.
Session: `01a184c5-179f-761f-ba48-3c6d58acf6de`, started 23:07:51 UTC,
2026-10-28. READY means source-only, not visual/native acceptance.

Owned paths only:
- `Games/Citisten3D/ui.mjs`
- `Games/Citisten3D/ui.css`
- `Games/Citisten3D/tutorial-check.mjs`
- `Games/Citisten3D/economy-ui-check.mjs`
- `scripts/citisten_user_hud_check.mjs`
- `docs/citisten-hud-onboarding-repair.md`

## Changes and source boundaries

Compact brand/budget/stats, wrapping toolbar, explicit utility available/needed
labels, fractional shortages, zero-demand text and an empty zero-demand meter.
Meter max stays positive when both values are zero. Existing selectors, theme
variables, 44px controls, focus and reduced-motion rules remain. Economy and
progression stay expandable; routine events retain only the latest named notice.
Two non-action urgent notices remain independently; civic response buttons cannot
be evicted by routine or urgent turnover and disappear when their event resolves.
Construction start notices collapse duplicate placed/start pairs and name the
building using actual event payloads/current state. Notice strings use textContent.

One next-action diagnosis prioritizes rebuilding, unserved homes, construction,
first road/home, then authoritative simulation diagnosis. Three concise tutorial
steps distinguish selection from placement and direct camera help to Controls.
Seen flags, pause/resume, replay, storage failure and ordinary mode flow retain
their original behavioral assertions; only intentional tutorial-count/resource-
label expectations changed in existing checks.

Start/restart returning false now leaves dialogs, selected tool, notices and
onboarding untouched. Continue bypasses new-town parsing even with invalid seed
input. Editing seed alone invokes no start or save write. Minimap cache invalidates
on terrain identity, seed, layout and size, including within its redraw throttle;
economy text distinguishes legacy terrain, explicit map seed zero and resource seed.

Native callbacks/confirmation, actual saved-town replacement protection, terrain
generation and renderer integration belong to parent/sibling paths and are NOT
implemented or staged here. Current native onStart does not yet propagate false;
parent must wire that return. Tests explicitly control false callbacks and use
in-memory fake storage, never real user saves.

## Executed checks

All below ran during this resumed session:

- `node scripts/citisten_user_hud_check.mjs`: exit 0, four behavior groups plus
  CSS contracts; output ends `CITISTEN USER HUD CHECK PASS`.
- `node Games/Citisten3D/tutorial-check.mjs`: exit 0, `TUTORIAL CHECK PASS` and
  `UI TOOLS CHECK PASS`; original pause/replay/storage/input assertions retained.
- `node Games/Citisten3D/economy-ui-check.mjs`: exit 0, four groups,
  `ECONOMY UI CHECK PASS`; validation, offers, clocks, incidents and stable controls.
- Initial `node Games/Citisten3D/continue-loop-check.mjs`: exit 1,
  `TypeError: vm.SourceTextModule is not a constructor`. Invocation error retained.
- Corrected `node --experimental-vm-modules Games/Citisten3D/continue-loop-check.mjs`:
  exit 0, `CONTINUE LOOP PASS`; real native/UI/loop/sim/save with fake world/RAF,
  unchanged paused/late-dt0/full-delta/one-owner checks. Not native graphics proof.
- `node --check` on all four owned JavaScript modules: each exit 0.
- Python standard-library catalog/schema/unique-ID/Git-tracked-URL check: exit 0,
  `CATALOG PASS: 129 entries, unique IDs/schema/tracked URLs`.
- Added UI/CSS-line scan: no new HTTP loads, fetches, sockets or remote imports.
- `git diff --check`: exit 0.
- `python3 -B scripts/check_maintenance_docs.py`: exit 1,
  `AssertionError: Commit inspected source changes before validating its inventory.`
  Shared dirty sibling source prevents this gate. Canonical manual/inventory remain
  parent-owned; parent must link this receipt and reconcile current committed tree.
  Historical missing Brainrot manual and original failed browser receipts remain.

## Limits and integration holds

No browser, server, slot reservation, screenshot, native preview, install, export,
asset, new game, push or cleanup operation. No image-fix, polished-HUD or no-clipping
claim. CSS/source bounds and fake-DOM theme toggles are NOT actual layout evidence.
All four target viewports (1367x910, 1024x768, 854x569, 390x844), both themes,
hit targets, overflow/overlap, native placement/camera controls, confirmation with
real saved state, normal-input Continue, native renderer/shaking/terrain artifacts,
GPU/FPS and screenshots remain UNRUN/HOLD for parent integration. Original
500ms/5s native acceptance assertions and prior failures were not changed.

Root available bytes before resumed work: 2,605,694,976; intermediate check:
2,592,063,488. Both exceed floor 2,147,483,648. Owned text growth is below 1 MB;
shared disk changes are not attributable to this worker. Final exact pin, completion
time, disk bytes and dirty-path handoff are in the final commit report.
