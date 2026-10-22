# Native integration QA contract and split-run receipt

## Ownership and status

Owned paths: `Games/Citisten3D/native-qa.py` and this receipt only. Parent owns
native entry/controller/CSS and browser reservation; world/parent own shared
Git/catalog/inventory. No runtime, catalog, sparse, inventory or push edits.
**Revised split source is READY, statically checked, browser UNRUN by this lane.**

The parent's original combined run returned exit 124 at 135.05s, leaving
partial C/D images and no final JSON after alarm cleanup stalled. That is NOT
a pass. Parent reported no live driver/browser/port and ticketed two old
shared-memory profile orphans; this lane never deletes outside the repository.

## Published native API contract

Actual `index.html`; normal `[data-mode="free|defense"]` start buttons;
`[data-group]` / `[data-tool]`; `#world` pointer input; `#speed` select values
0/1/3/10; `#repair`; `#feedback`; `.city-top` Menu and `.city-menu` Resume.
Singleton Road/Bulldoze use group buttons because tool options are hidden.
`window.citisten = {world,get sim(),get tool()}` is read-only diagnostics;
sim is undefined until Start. No setters, update/render calls, camera poses,
HP/population/budget grants or forced combat states are used by QA. Two actual
requestAnimationFrame callbacks precede read-only grid/camera projection.
Native actions were traced through `applyTool`, `sim.place`, bulldoze/repair
and stable-handle `syncModels`; no controller implementation is duplicated.

## Two bounded suites (preserving previous core assertions)

Run only after explicit browser and Git/source-freeze coordination:

```sh
TMPDIR=/dev/shm NATIVE_CASE=city SMOKE_PORT=8751 timeout --signal=KILL 120s python3 -B Games/Citisten3D/native-qa.py
TMPDIR=/dev/shm NATIVE_CASE=shell SMOKE_PORT=8751 timeout --signal=KILL 120s python3 -B Games/Citisten3D/native-qa.py
```

Each suite has a 100-second action alarm and one 20-second cleanup budget;
outer 120 seconds is a hard stop, not a timeout increase. Only one suite runs
per process/slot. System `/usr/bin/chromium`, exact process guards and explicit
persistent profile under the owned output directory; TMPDIR remains /dev/shm.
No browser auto-download. Normal close/driver stop is attempted first; a
cleanup timeout may terminate ONLY root PIDs whose command matches this run's
unique profile. Unclosed resources fail, never become a successful result.

- **city:** normal Free start; pause freeze; actual 13-lot mouse drag / $130
  atomic cost; residential/commercial/industrial/power/water/park placement;
  1x/3x/10x; population + both networks; native plant bulldoze/blackout/rebuild;
  Menu pause/Resume clock; repair-tool selection. Exactly two screenshots,
  C city and D blackout. Visible toast/panel overlap is asserted at C and D.
- **shell:** normal Free start, deny external routes, then context offline;
  normal Defense restart with population/roads reset and night 0; normal Free
  restart with no zombies; viewport 390x844; visible native panel top >= HUD
  bottom; Light computed background exactly `rgb(250, 247, 238)`; Dark toggle.
  Visible toast/panel overlap asserted in both themes. Exactly two screenshots,
  mobile Light and Dark. No combined long city+shell run.
- **F/G/H remain HELD.** A later separately reserved natural Defense run may
  exercise waves/combat/hall loss/restart, without grants. Current code does
  not claim tracer/citizen/loss proof or replace native evidence with fixtures.

All non-loopback requests are denied AND recorded as failures. HTTP/page/
console/request errors fail. Actual input only; current state is read for
assertions, never changed through diagnostics. Parent moved native panel into
HUD flow before toasts; QA checks geometry, not how that layout is implemented.

## Durable checkpoints and cleanup

Each invocation creates a unique directory:
`docs/maintenance/audits/citisten-QA/native/<city|shell>/run-*/`.
It retains atomic `native-results.json` checkpoints plus flushed phase/path
progress after every action/check, before screenshots and before cleanup.
Earlier failure evidence is never overwritten. Profiles are under that same
run directory, so a hard-timeout orphan remains repo-owned for later cleanup.
The report records statuses, assertion snapshots, errors, held letters and
browser/driver/server/profile cleanup flags. `complete` and exit 0 require all
assertions and cleanup; intermediate `running`/`checks-complete` are NOT passes.
The split CITY run at `a8d17f5` failed before gameplay: exit 1 in 29.9496s,
`Page.goto: Timeout 15000ms exceeded` waiting for DOMContentLoaded. It recorded
no gameplay checks/screenshots, empty error/external arrays and all four cleanup
flags true. Its source hashes were unchanged. SHELL remains unrun.

## Batch 67 HTTP readiness precondition

Operator-approved follow-up adds a bounded HTTP 200/content check before browser
launch and `page.goto`, with a durable `serverReady` checkpoint. It retries
connection errors for at most five seconds, inside the existing 100-second
action budget. Navigation remains 15 seconds; the 120-second total limit and
all native-input assertions/error filters are unchanged. The probe must serve
the actual entry importing `./native.mjs`, not a substitute fixture.

A separate server-only probe returned the entry in 0.0720s and other authored
resources in 0.0023..0.0027s. This does not establish the navigation timeout's
cause or certify native/offline behavior. The HTTP-guard revision is statically
checked, but has not had another browser run. Parent owns the next CITY/SHELL
reservations after world's separately reserved AFTER chunks; no blanket slot
or full-fleet/source freeze is implied.

The disk-action agent confirmed cleanup of the two old shared-memory profile
orphans in batch 67. This lane did not delete outside the repository. Request
the shared Git slot before staging these paths.
