# Getaway

<!-- maintenance-game: Games/Getaway -->

## Identity and status

Existing upstream game ingested by direct owner order from anomalyco/arcade commit `bf5f6277e38ee52e9bfa4ae4a01337b46175c181`. Entry: `Games/Getaway/index.html`. Unregistered; no catalog ID assigned. Offline solo free-driving adaptation, not a new self-made game. Acceptance is partial because this runner lacks a WebGPU adapter.

## Implementation map

Vite-built static HTML, hashed JS/CSS and local fonts in `assets/`, original sounds in `sfx/`. The main bundle contains the upstream renderer and physics. `port.patch` preserves staging changes to main/session/config/HTML and the added touch input adapter. `verification/sim.mjs` is a test-only bundle of the adapted simulation, HUD and inputs; production does not import it.

Inspected source boundaries: main initialization/frame path, LocalSession and its callers, room/lobby connection code, input, HUD/minimap, simulation phase transitions, asset fetching and build configuration. No exhaustive renderer/shader or audio-quality review is claimed. Use pinned upstream sources plus the patch rather than editing minified bundles.

## Gameplay and controls

The default local session uses peaceful seed 7, one driver, no cops and no helicopter. Simulation remains in waiting/free-driving phase; the view presents the upstream chase HUD without enabling chase rules. No round endings or fabricated objectives. WASD/arrows drive, Space drifts, Shift boosts, H toggles the engine; upstream gamepad support remains. Added touch controls cover drive/reverse, steering, drift and nitro. Restart drive reloads. Elapsed driving time is shown; no campaign or multiplayer is advertised.

## State and persistence

LocalSession owns the deterministic World, fixed-step accumulator and interpolated snapshots. No server state or room connection. Default city seed 7; upstream seed query override remains. Restart recreates the local session. No new storage keys. Query-driven upstream development/benchmark hooks remain, but are not acceptance substitutes. Authored pointer controls release on pointerup, pointercancel and lost capture; upstream blur handling clears input.

## Dependencies and provenance

See `../../../Games/Getaway/CREDITS.md`. Upstream has no game LICENSE; direct owner-approved ingestion does not establish upstream redistribution permission. Recording rights remain unverified. Component notices for Barlow Condensed, Inter and wgpu-matrix are preserved, as is upstream audio-source documentation. All runtime fonts and sounds are local. WebGPU requires HTTPS or localhost with a functioning adapter. No Cloudflare, API or WebSocket runtime path is bundled.

## Audit findings

Held: real rendered 3D driving, physical-device touch/gamepad behavior, audio listening, upstream redistribution/recording rights and full-site release gate. This runner shows the explicit no-WebGPU-adapter message. The separate SIM/HUD fixture is not proof of rendered gameplay. Existing repository inventory was stale before this port; the shared index/inventory still needs coordinator reconciliation. No catalog or shared bundle edits in this port.

## Safe iteration

Recreate staging at the pinned upstream commit and apply `port.patch`, retain relative Vite base and build only the main entry. Rebuild and copy static output without losing notices/tests. Do not restore lobby/room imports. Preserve the original engine, font notices and qualified provenance. Regenerate the test-only simulation bundle when session/input/HUD sources change. Keep modifications within this project and update this manual with evidence.

## Verification

2026-10-13: Vite build and TypeScript check passed; upstream peaceful regression 1 pass, 0 fail. `node Games/Getaway/verification/check-solo.mjs` reports movement of 26.96m in 2s, two identical 300s runs, one car, no cops/helicopter/end. Runtime JS syntax checks passed.

`verification/check-browser.py` runs a temporary server on 8932. Curl HTTP 200. Final desktop/mobile checks in both browser themes: no console errors, failed requests, external requests or sockets. Actual boot stops at no WebGPU adapter. The explicitly labeled SIM/HUD fallback verifies module init, native keyboard movement, HUD clock, touch press/cancel and restart. Screenshots and exact limits are in `verification/RESULTS.md`. The initial network-change resource failures are recorded there rather than filtered out. Screenshots reviewed; mobile minimap scaled clear of touch controls. Server terminated after checks.

`python3 -B scripts/check_maintenance_docs.py` currently reports stale inventory. No full registered-game smoke or push performed. Historical upstream reports do not replace the remaining hardware gate.

## Future outlook

Coordinator may register only after making the rights/release decision. Verify actual WebGPU desktop and mobile driving, audio, restart and sustained performance, refresh shared maintenance inventory, and run the unchanged full registered-game smoke before any push. Do not present free driving as the original multiplayer cops-and-robbers game.
