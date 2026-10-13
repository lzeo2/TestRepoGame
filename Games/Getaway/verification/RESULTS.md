# Getaway port verification

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

Catalog registration was not changed. The mandatory full registered-game smoke gate was not run for this unregistered, no-push port task. Publication is held pending that gate and real WebGPU verification. No push was performed.
