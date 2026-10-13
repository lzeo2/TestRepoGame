# Blackout maintenance

<!-- maintenance-game: Games/Blackout -->

## Identity and status

Registered as catalog ID 230, Blackout. Existing upstream Anomaly arcade port, not a self-made game. The historical manual filename is retained. Acceptance is partial pending real WebGPU gameplay; registration is not release approval. See `Games/Blackout/CREDITS.md`.

## Implementation map

`index.html` loads rebuilt hashed Vite modules under `assets/`. Main owns startup, input, renderer and animation. Upstream Menus owns local mode/map selection, scores, host reset and end-screen votes. LocalSession runs the unchanged World bot-match simulation; SandboxSession provides target practice. `check-solo.html` runs these bundled modules without a GPU. `port.patch` records all authored source changes relative to bf5f627, including the runnable check. No server deployment is included.

## Gameplay and controls

The landing menu is now the default. Start bot match uses the selected upstream mode and office/downtown/random map choice. Matches retain scoring, deaths/respawns, round end, next-mode votes and automatic replay. Tab/T exposes the existing two-click match reset and mode controls. Target sandbox is explicitly secondary: office seed 1 by default, three passive targets, unlimited ammunition, B toggles live bots, no completion objective. `?practice=1` remains a direct random-seeded local-match route; `?sandbox=1&seed=1` explicitly selects the sandbox.

WASD/arrows move, mouse aims, left click fires, Shift sprints, R reloads, G uses equipment, V melees, 1-3 select weapons, 4-5 select equipment, Tab/T show scores, M mutes. Touch arrows/fire and scene aiming remain hardware-unverified. Help includes reload restart and Back to menu. Returning to the menu then starting creates a new session; in-match reset is the upstream host action.

## State and persistence

World/session state is in memory. Local matches deliberately use random seeds; no repeatable practice-seed claim remains. Sandbox seed applies only to sandbox. The port no longer replaces global Math.random when starting sandbox. Upstream blackout.name, blackout.gun, blackout.equip, blackout.mode and blackout.map preferences use localStorage. Storage-denial behavior is not accepted. No accounts, rooms, sockets, API matchmaking or backend persistence.

## Dependencies and provenance

Upstream https://github.com/anomalyco/arcade at bf5f6277e38ee52e9bfa4ae4a01337b46175c181. No upstream root LICENSE; owner-approved ingestion does not establish redistribution rights. CREDITS retains that qualification. wgpu-matrix MIT and IBM Plex Mono OFL notices remain. Fonts, sounds and assets are local. WebGPU is required; this port has no WebGL fallback.

## Audit findings

Available Chromium still reports no WebGPU adapter. Menus now work before GPU initialization and a failed Start displays an honest notice while preserving mode/map controls. GPU startup rejection, ten-second timeout and device-loss/error notices are handled at the entry boundary. Restart is bound before startup. Native rendered firing, death/replay, sound quality, touch, storage denial and device-loss behavior on hardware remain held. No simulation success is rendered acceptance.

The shell has description metadata, flat menu background, black action buttons, visible focus, scrolling and 44px menu targets. Spectator text and principal menu/HUD/reset copy use plain case. Lab's visible header now says Presentation controls rather than showing obsolete FPS/GPU placeholders. Remaining upstream abbreviated mode names and some secondary objective/vehicle/banner labels use capitals; this is not a claim of exhaustive style acceptance. Shared LabPanel source still contains its default placeholder literal, replaced by the game subclass at runtime. No engine or renderer rewrite, restored network path or new runtime dependency.

## Safe iteration

Apply port.patch to pinned upstream staging and rebuild with relative Vite base; never edit minified bundles. Preserve notices and missing-rights qualifications. Replace only generated outputs after auditing their tracked consumers. Run the shipped check and actual GPU gameplay separately. Shared maintenance inventory refresh belongs to the coordinator after all concurrent ports land.

## Verification

2026-10-13 Phase 2: `bun run typecheck` passed; `bun run build --base=./` rebuilt the distribution (80 modules). All copied JS passed `node --check`. Bounded headless Chromium on port 8936 rendered the landing and GPU-error screens at 1280x720 and 390x844 under dark and light preferences. Eight captures were reviewed: menus remain readable with no horizontal overflow; map/mode picks and Start are discoverable. The browser report records four successful reload restarts, zero page errors, zero external requests and zero sockets. Every Start reported `No WebGPU adapter is available on this device.` No 3D gameplay screenshot PASS is claimed.

Fresh shipped check output:

```text
PASS: sandbox seed 1, movement 0.730, shots 10, weapon/bot toggle/reset, HUD; LocalSession deaths 13, respawns 13, scored kills 62, end true, replay true, fresh reset; menu mode/map routing. Rendering not tested.
```

The match test uses ordinary idle intents over 320 simulated seconds; deterministic random initialization is scoped to the test constructor, with no health, position, score or timer grants. It checks player deaths/respawns, aggregate roster kills, natural round end/new-map replay and the normal host-reset action. Local menu mode/map routing is also exercised. Evidence: temporary `phase2/blackout` screenshots, browser JSON/log, build log and old-consumer audit. The server terminated after verification. Full registered-game smoke/release gate was not run; no push authorized. The maintenance inventory was already stale before this phase and requires one coordinated refresh after source commits.

## Future outlook

Next gate: real WebGPU desktop/touch gameplay including native movement/fire, scoring, death/respawn, end/replay and reset; listen to audio and exercise device-loss/storage failure. Verify upstream redistribution rights before release. Do not invent stealth/open-world campaign claims or restore multiplayer services.
