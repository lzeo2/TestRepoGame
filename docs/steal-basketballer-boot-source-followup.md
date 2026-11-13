# Basketball local boot source follow-up

Scope ID: BASKETBALL-BOOT-SOURCE-20261112. Read `.hermes/plans/2026-11-12_1244-steal-basketballer.md`, `docs/steal-basketballer-local-qa.md`, `Games/StealBasketballer/index.html`, `js/app.js`, `js/world.js`, and `tests/browser.py` first. The first and only authorized browser pass launched Chromium but timed out after 10s waiting for `window.basketballerSnapshot` AND enabled `#start`. It captured no console errors (listener added after that attempt), no failed requests and no screenshots. Do not call the preview browser-playable yet or treat the timeout as a proven root cause.

One distinct source-only task: trace the complete HTML module/import and boot dependency chain through `new Game`, `new World`, `setCamera` and enabling PLAY. Establish whether any deterministic exception, missing element/asset, blocking initialization or predicate mismatch is reproducible WITHOUT launching a browser. Add one small production-path Node regression using existing fixtures if it can falsify a specific hypothesis. If a genuine RED is demonstrated, make the smallest correction in the basketball sibling only and show RED -> GREEN with changed-file syntax, focused fixture and `git diff --check`; if no source defect is demonstrated, preserve runtime and document exact unresolved stages/next discriminating browser signals. Preserve existing source fixtures and the one-shot browser failure receipt. A source-only pass is not native acceptance.

Stop at first unrelated RED, missing source prerequisite or resource floor (<2,147,483,648 bytes disk). No browser/Chromium/Playwright launch, unsafe renderer flag, downloads, full-site smoke, mass simulation, additional worker/model generation, edits to original Footballer, catalog registration, push or publication. One local scoped commit for a real fix or a compact diagnostic receipt; report exact files/tests and the remaining native gap. Another browser pass requires separate authorization and admission, not an automatic retry of the first attempt.

## Source-only result (base `b16af25e`)

**No production RED reproduced; runtime unchanged.** Hypothesis tested: a missing
boot HTML ID, unresolved module export, or deterministic non-WebGL constructor
exception prevents the exact readiness predicate from becoming true.

Chain inspected: `index.html` places `./js/app.js` as a module after its controls;
app imports Game/Match/World, World imports actors and local Three.js, actors
imports the same Three.js. There are no external/import-map dependencies. App
binds controls, defines `window.basketballerSnapshot`, then calls `boot()`.
Boot awaits the two local JSON responses, constructs Game (load/validate save,
market/rivals), snapshots state/starting five, constructs World, calls setCamera,
sets loading text, enables PLAY, attaches its click handler and queues RAF.

World constructs scene, native WebGLRenderer, camera/lights, factory/geometries,
12 bases, static batches/colliders, hotspot labels/NPCs, avatar, ball and crowd;
then resize/camera positioning. Current data has 3,057 parts plus 276 venue
parts, not an unbounded initialization loop. Sound starts only after PLAY.
The renderer constructor is before enablement; first-frame geometry display,
shader compilation/upload and rendering are after RAF is queued. Neither native
boundary was executed in this task. Code order is not proof of browser timing.

### Runnable proof and limits

Added only `scripts/check_basketball_boot.mjs`, using stdlib VM modules and the
same actual catalog/world data as existing fixtures, with **unchanged production
module sources**. Actual Game, Match, World and ActorFactory modules link and
evaluate. Local Three math/geometry/material exports are real; only
WebGLRenderer is substituted. DOM/2D canvas, storage, file-backed fetch and RAF
are explicit boundary doubles. It validates real HTML IDs on boot lookups,
allows both fetches to start while held, verifies snapshot exists while PLAY
stays disabled, releases data, then verifies actual World construction/setCamera,
registered click handler and the exact unmodified browser predicate. No frames
or clicks execute. This falsifies the stated source hypothesis only under those
boundary assumptions and a fresh save; it does not test browser module delivery,
WebGLRenderer internals, real canvas APIs, persisted browser state or timing.

Commands actually run:

- `node --check scripts/check_basketball_boot.mjs`: exit0.
- `node --experimental-vm-modules scripts/check_basketball_boot.mjs`:
  `PASS source boot: 47 HTML IDs; actual app/Game/World/actors; 2 local JSONs; setCamera; exact readiness predicate true; 1 RAF queued, 0 frames run`.
  Node22.23.1 prints its expected VM Modules experimental warning.
- `node Games/StealBasketballer/tests/fixture.mjs`: PASS14-file local closure,
  exact100 identities, existing one bounded2:3 match/reward85/reload/save isolation.
- `git diff --quiet b16af25e -- Games/StealBasketballer games.json Games/StealFootballer`:
  exit0, including the unchanged original browser-check script/failure receipt.
- `python3 -B scripts/check_maintenance_docs.py`: PASS139 projects,132 registered,
  seven unregistered; inventory unchanged/current. `git diff --check`: exit0.

### Unresolved native gap and next discriminating signals

The **first and only browser attempt remains a 10,000ms readiness timeout**, no
screenshots/phone phase, no page errors/HTTP failures/external requests recorded,
and no console listener in that attempt. No browser, Chromium, Playwright, unsafe
renderer flags, server, downloads, workers or model generation were used here.
No actual runtime fix or RED -> GREEN is claimed; no unrelated RED was observed.

A separately authorized diagnostic pass should distinguish:

1. Snapshot function absent: collect module URL/status/MIME, load/evaluation
   errors and document readiness. Source linking passed here, native delivery did not.
2. Snapshot present, PLAY disabled, loading text still initial: pending/failed
   JSON responses or synchronous initialization/renderer stall; collect individual
   response completion/timing, console errors and last completed boot stage.
3. Snapshot present, disabled plus `The game could not start: ...`: boot caught
   an exception; capture its message/stack. That catch logs console.error, not an
   uncaught pageerror, so the original empty pageErrors does not exclude it.
4. PLAY enabled but automation unable to observe readiness: collect evaluation
   responsiveness and RAF/first-render timing/context-loss signals. Native first
   render can occupy the main thread despite source order enabling PLAY first.

Do not infer which branch occurred. Browser-playable status, normal controls,
visuals, touch and complete native match/report remain unverified. Another
browser attempt still requires separate authorization/resource admission.
Source games/catalog/publication are unchanged; no registration or push.
