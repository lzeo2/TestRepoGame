# Getaway port verification

## Phase 2: offline chase restoration (2026-10-13)

Verdict: **simulation and shell pass; rendered-game acceptance held**. The older free-drive-only results below are historical, not the current default mode.

- TypeScript passed; Vite rebuilt 74 modules with relative base. Patch applies to pinned upstream and all 11 patched/new source files match staging. All shipped JS/MJS syntax checks passed; scoped diff whitespace check passed.
- Shipped `check-solo.mjs`: four bot cops pursue; ordinary idle driver **busted at 117.63s**; automatic next round uses Cruiser; fresh session resets intro/time/round to zero. Compact selection works. Explicit free drive moves **26.96m in 2s**, is deterministic for 300s, and has no cops/end.
- `check-browser.py` used a bounded server on 8937 and headless Chromium at 1280x720 and 390x844 in light/dark themes. All four: HTTP 200; console/page errors, failed/external requests and sockets empty. Production error-screen restart changes timeOrigin before any fixture. Injected missing GPU, adapter rejection and device rejection also pass reset checks.
- Real scene still cannot start: **No WebGPU adapter is available on this device.** Labeled renderer-free SIM/HUD fixtures verify native keyboard movement (26.955m, five cars, chase clock 0:12.9), Space/help focus separation and mobile touch press/cancel. Native selectors retain mode and both car picks on submit.
- Screenshots reviewed in the temporary `phase2/getaway/` evidence directory: readable dark disclosure; corrected mobile failure title and help/clock separation; map clear of touch buttons. These are error-screen and SIM/HUD captures, not visible city/car proof.
- Telemetry audit: **109 runtime files** pass, no trackers/external code endpoints/GPU collectors; verifier loopback updated to 8937. Before obsolete bundle removal, tracked consumers were only the superseded Getaway entry/chunks; new build replaces them. Catalog validation: 123 unique/schema-valid entries, all URLs tracked. Only id 231 description changed by this worker.
- Server terminated. Disk remains 2.8 GB free (rounded). No games added, full-site smoke or push. Rights, real hardware rendering/driving/audio/gamepad remain held. Shared inventory refresh is deferred to the coordinator after all worker source commits.

## Historical initial port

Fresh checks: 2026-10-13. Verdict: **partial**, not a full rendered-game pass.

## Build and simulation

Staging `bun run build` completed: Vite 8.3.4, 75 transformed modules. `bun run typecheck` completed with `tsc --noEmit`, exit 0.

Upstream `bun test tests/peaceful.test.ts`:

```text
1 pass
0 fail
9 expect() calls
```

Runnable default-load regression, from the site root:

```sh
node Games/Getaway/verification/check-solo.mjs
```

Actual output:

```text
PASS: default seed 7; moved 26.96m in 2s; deterministic 300s; one car; no cops, helicopter, server or round end.
```

All shipped runtime JavaScript and verification MJS passed `node --check`.

## Browser and local server

The bounded server used port 8932 and was shut down after every check. Curl returned:

```text
curl index HTTP 200
```

Run the retained browser check with installed Python Playwright and Chromium:

```sh
python3 Games/Getaway/verification/check-browser.py getaway-check-output
```

The script starts/stops its own localhost server. Use an external timeout when running unattended. It blocks and records external requests, records every console/page/request error, and never suppresses a failure to manufacture a passing result.

The first browser attempt with the ANGLE SwiftShader flags displayed `No WebGPU adapter is available on this device.` and reported multiple `net::ERR_NETWORK_CHANGED` resource failures. That attempt was not a clean pass. A fresh context using the explicit loopback address and Vulkan flags completed local asset requests cleanly, but still had no WebGPU adapter. The fallback gate was then used as authorized; no further attempt to claim GPU rendering was made.

The final run's four viewport/theme combinations each produced:

```text
HTTP 200; fallback=True
SIM/HUD fixture {"x": 152, "z": 206.95547293265963, "cars": 1, "clock": "0:02.0"}
console_errors=[]; request_failures=[]; external=[]; sockets=[]
restart reloaded
```

Desktop: 1280x720; touch viewport: 390x844; light and dark browser preferences. In each case the actual page showed the unsupported-WebGPU message. The test subsequently imported the actual adapted SIM/HUD modules into an explicitly labeled renderer-free fixture, pressed ArrowUp, stepped two seconds and observed movement, one car and an advancing HUD. Touch press and cancellation were delivered through Chromium's touch-input API, not substituted mouse events. Touch targets were at least 44px. Restart reloaded the fixture. No horizontal overflow was detected.

`verification/screenshots/` contains the four actual unsupported-GPU pages and four separately labeled SIM/HUD fixture captures. They do not show a rendered city. Reviewed: controls/fallback text readable; mobile clock separated from controls disclosure; minimap scaled clear of the touch buttons. Upstream art and fixed dark scene styling are unchanged by browser color preference.

## Offline and repository gates

The copied HTML, JS and CSS had no `http://`, `https://`, `WebSocket`, `api/` or `/arcade/` matches. Local fonts and all original referenced sound files are retained. URLs in provenance/license documents are documentation, not runtime fetches. Request monitoring observed no external loads or sockets.

The maintenance checker was run before committing this port and failed with:

```text
AssertionError: Inventory stale: inspect changes, then run --refresh.
```

This was already true of the existing HEAD before Getaway became tracked. A Getaway maintenance page is supplied; shared inventory/index reconciliation belongs to the coordinator and remains an explicit documentation gate, not a claimed pass.

Catalog registration was not changed by the original port commit. The mandatory full registered-game smoke gate was not run for that unregistered, no-push port task. Publication is held pending that gate and real WebGPU verification. No push was performed.

## Telemetry removal follow-up

Fresh follow-up: 2026-10-13. Code/rebuild commit: `0dc4b58` (the coordinator committed the pending changes while verification ran). The coordinator separately registered Getaway as id 231 in `722d94b`; this audit did not edit the catalog.

Swept every file under `Games/Getaway`, including binary assets, source patch, notices and verification scripts. No Google Analytics/gtag/GTM, DoubleClick, Pubstack/pbstck, Spawtz/GAM ad-beacon endpoints, sendBeacon, XMLHttpRequest or tracking pixels were found. Remaining fetch sites were traced: Vite's module-preload helper loads the local referenced modules; audio fetches use `./sfx/` and `./sfx/radio/`. No third-party runtime endpoint was found.

Removed the upstream GpuPerf collector, requested timestamp-query feature, renderer FrameTimer integration, draw-count metrics, adapter vendor/device details, benchmark CPU/GPU timing returns, debug frame-sample buffer and automatic `arcade-perf` parent message. Rendering draw calls, physics and gameplay timing are unchanged. The presentation Lab remains functional; its inherited header template contains inert placeholder text that is immediately replaced with `Presentation controls`, not collected metrics. The patch now includes the renderer and debug-overlay source changes, and reverse-application validation passed.

Before deleting superseded JS bundles, the tracked-reference scan found consumers only in the old Getaway entry/main/benchmark chunk. The rebuilt entry and chunks replace those references. No other game or portal bundle was changed.

Classified non-tracker findings retained:

- `port.patch` includes removed telemetry code as deletion evidence, not executable code.
- `verification/check-telemetry.py` includes the tracker/metric names as regression denylist strings. Its browser-script URL assertion allows only loopback.
- `verification/check-browser.py` serves and requests only `http://127.0.0.1:8932`, blocks external requests and reports failures without filtering them.
- Runtime input and `verification/sim.mjs` retain explicit `?mux` comparison-mode messages to a referrer-derived parent origin, guarded by source/origin/run checks. These carry input/state for the upstream comparison tool, not periodic GPU/performance samples; the automatic `arcade-perf` reporter is removed.
- `sfx/repair.mp3` contains C2PA/schema and DigiCert certificate URLs, including an Eleven Labs organization label. These are embedded provenance/certificate metadata, not a tracking-pixel or executable network loader. The normal audio path fetches the local MP3 then decodes it with Web Audio. Metadata is preserved and is not a redistribution-rights grant.
- Font/license/source URLs are attribution text, not runtime asset loads.

Rebuilt with Vite: **73 modules transformed**, main JS 351.50 kB versus 356.61 kB before removal. `bun run typecheck` passed. The upstream peaceful test again reported `1 pass`, `0 fail`, `9 expect() calls`. Runtime JS and verification MJS passed `node --check`.

New runnable regression:

```sh
python3 -B Games/Getaway/verification/check-telemetry.py
```

Actual output:

```text
PASS: 109 runtime files; no tracker signatures, external code endpoints or GPU/performance collectors.
PASS: verification SIM clean; browser verification uses loopback only.
```

The default-seed simulation regression again passed with **26.96m in 2s**, identical 300-second drives, one car, no cops/helicopter/server/end. The four desktop/mobile light/dark browser checks were rerun against the rebuilt entry on port 8932. All returned HTTP 200, `console_errors=[]; request_failures=[]; external=[]; sockets=[]`, and `restart reloaded`. As before, each had `fallback=True`: no WebGPU adapter exists here. Therefore GPU-rendered behavior remains unverified; removal is established by source/build inspection and regression scans, not a claimed GPU execution pass. The server shut down after verification. No full-site smoke or push was performed.
