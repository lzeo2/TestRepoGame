# Dark-default Jankolock UI

Source commit: **`e235109` (`jank3d: dark-default-ui`)**.

**PASS, targeted builder theme checks:** 12 fresh captures, 241 HTTP200
responses, zero page/console/request errors, 81 current source/resource hashes
unchanged. No existing A-I images or individual receipts were edited. The
operator explicitly retained their validity across this presentation-only
change; the model packet's verifier binds its original source/runner to
`bedb052` rather than falsely asserting unchanged CSS.

## Cache-cold first paint

One fresh system `/usr/bin/chromium`, explicit SwiftShader, no browser download.
Each live case uses a fresh context with OS **light** preference, empty storage,
HTTP cache disabled through routing/CDP, and browser cache cleared before
navigation. No `?qa=` query, state seeding, gameplay grants or fixture camera.

Seven HTML/CSS entries also passed with page JavaScript disabled: integrated
page, systems/world viewers and all four hero workshops. Their static declared
theme, native color scheme and background are dark before async models/modules
can initialize. Actual animation-frame samples during each live cold bootstrap
also remain dark until the deliberate native light toggle. This establishes
page startup/default behavior, not browser chrome before navigation or GPU FPS.

## Original screenshots

| UI | Default-dark first load | Native light toggle |
| --- | --- | --- |
| Lobby / hero select | [Desktop](hero-select-default-dark.png) | [Desktop](hero-select-light.png) |
| HUD / minimap | [Desktop](hud-minimap-default-dark.png) | [Desktop](hud-minimap-light.png) |
| Shop | [Desktop](shop-default-dark.png) | [Desktop](shop-light.png) |
| Lobby / hero select | [Mobile](mobile-hero-select-default-dark.png) | [Mobile](mobile-hero-select-light.png) |
| HUD / minimap | [Mobile](mobile-hud-minimap-default-dark.png) | [Mobile](mobile-hud-minimap-light.png) |
| Shop | [Mobile](mobile-shop-default-dark.png) | [Mobile](mobile-shop-light.png) |

Desktop images are native 1280x720; mobile images are native 390px full-page,
not padded or stretched. Actual minimap background samples are RGB 48/54/56
in dark and 247/243/232 in light. Theme-button text/pressed state, color scheme
and absence of horizontal overflow are checked. The orchestrator inspected
actual dark/light desktop and mobile images before recording this result.

## Scope and verification

Only default theme selection, static declarations, loading placeholders and
presentation metadata changed. Existing light/dark palette values, controls,
layout, gameplay, poses, meshes, world data and lighting are retained. Main and
workshop native light toggles remain. The same shared tokens style hero cards,
HUD, shop and the minimap. Legacy named light-comparison runners now select
that presentation explicitly rather than mislabeling the new dark default.

```sh
TMPDIR=/dev/shm SMOKE_PORT=8949 timeout --signal=TERM --kill-after=10s 360s python3 -B Games/Jankolock3D/theme-qa.py
python3 -B docs/maintenance/audits/jankolock-3d-qa/visual-pass/verify.py
node Games/Jankolock3D/integration-ui.mjs --self-test
node Games/Jankolock3D/integration-test.mjs
python3 -B scripts/check_maintenance_docs.py
```

Actual output: `DARK DEFAULT: 12 captures, 241 HTTP200, zero errors; CSS-first
dark on all7 entries; sources stable`. UI eight checks and both 600s integrated
system chains/catalog 127 checks passed. Inventory covers 133 projects / 127 registered.
These checks do not certify full-match fun, all accessibility, supported
hardware, final art quality or full-catalog release. No full fleet gate/push,
new games, dependency install, Blender/bpy or wishlist-model build occurred.
The deferred upright-slide finding and other art/mechanics holds remain.
