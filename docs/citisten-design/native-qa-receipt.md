# Native integration QA contract

## Ownership and execution hold

Assigned files only: `Games/Citisten3D/native-qa.py` and this receipt.
Parent owns `index.html`, `native.mjs`, `native-actions.mjs`, `native-check.mjs`.
No catalog/inventory/push edits. **Runner source only; no browser launch until
an explicit shared-slot release.** Current evidence status: NOT RUN.

## Expected entry contract (published before runner implementation)

- Actual `Games/Citisten3D/index.html`, not a fixture or preview.
- UI starts via visible `[data-mode="free"]` / `[data-mode="defense"]` buttons.
  Tools use existing `[data-group]` and `[data-tool]` UI contracts.
- `#world` is the native placement/camera canvas. Left-button road drag places
  an inclusive grid line through the shared `applyTool` occupancy/budget path.
- `#speed` is a select with values `0`, `1`, `3`, `10`; `#repair` selects repair;
  `#feedback` exposes placement/error feedback. Existing Menu/Resume/Restart
  buttons use `[data-action="menu|resume|restart"]`.
- `window.citisten = { world, get sim(), get tool() }` is diagnostics only.
  QA may read state, roads and camera matrices, but NEVER mutate simulation,
  call placement/damage/update/setSpeed methods, change camera poses, inject
  HP/population/budget, or advance time through evaluate.
- World mesh creation may be asynchronous: wait for the published `world.ready`
  promise when present, then use real native controls. Projection of logical
  lots uses the existing roads/camera API solely to aim actual mouse input.

## Planned normal-input coverage

Start Free build; pause; find clear visible lots; native road drag; place
residential/commercial/industrial, power, water and park through tool buttons
and canvas clicks; resume/1x/3x/10x; read population/budget/network outcomes;
bulldoze the actual plant and observe blackout, then rebuild; menu/resume;
restart via visible menu if offered. Start Defense normally and allow natural
time at the selected speed. Observe an edge wave, combat/loss/restart only if
reachable within the bounded run. Unreached F/G/H gates are explicitly HELD,
not replaced by state grants or layout fixtures. Existing headless logs remain
separate evidence.

## Offline and lifecycle protocol

System `/usr/bin/chromium` only, `TMPDIR=/dev/shm`, dedicated temporary profile,
loopback server and exact process guard before launch/captures. Block/log any
non-loopback request; HTTP/page/console errors fail the run. Revisit the entry
with external network routes still denied. Browser/server/profile cleanup is
mandatory even on failure; a hard time bound prevents persistent servers.

Expected command after parent entry and explicit slot release:

```sh
TMPDIR=/dev/shm SMOKE_PORT=8751 python3 -B Games/Citisten3D/native-qa.py
```

Expected output folder: `docs/maintenance/audits/citisten-QA/native/`, including
`native-results.json`, screenshots and a machine-readable assertion/hold map.
This is a plan, not a claim that native C/D/F/G/H/I or offline acceptance passed.

## Source trace and current status

Inspected shared `native-actions.mjs`: `applyTool` spends road cost, rejects
building overlap and delegates zones/services to `sim.place`; bulldoze and
repair use sim APIs. `syncModels` owns stable model handles, not sim state.
UI selectors traced in current `ui.mjs`. Native entry/controller source was subsequently published and traced in
`index.html`, `native.mjs`, `native-actions.mjs`, `native-check.mjs` and
`native.css`. `window.citisten.sim` is undefined until normal Start. Singleton
Road/Bulldoze tools use group buttons because their tool options are hidden.
The runner waits two actual requestAnimationFrame callbacks after free Start
before read-only lot projection; it never injects update/render or camera poses.

## Delivery status

**READY SOURCE, STATIC-ONLY / NOT RUN.** `native-qa.py` is 191 lines and bounded
to 120 seconds. Python AST and embedded JavaScript syntax were checked without
launching Chromium. Native free/defense Start, 13-lot pointer road drag and
$130 cost, zones/utilities, pause/1x/3x/10x, blackout/rebuild, Menu/Resume,
repair-tool selection and loaded offline mode resets are implemented. F/G/H
remain explicitly HELD; no combat or loss state is granted. Offline requests
outside the exact loopback origin are denied and recorded; later mode starts
also execute with context offline. No current browser acceptance is claimed.

Parent owns fixes for frame-delta clamping, early pagehide cleanup and panel
layout/theme. No native controller/CSS edits were made by this lane. No browser
was launched. Git staging/commit remains held until world grants the shared
Git slot; parent reserves the next native browser slot separately.
