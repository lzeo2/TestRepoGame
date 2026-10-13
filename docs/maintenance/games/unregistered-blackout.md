# Blackout maintenance

<!-- maintenance-game: Games/Blackout -->

## Identity and status

Unregistered upstream Anomaly arcade port. Static solo adaptation, not a self-made game. No catalog ID allocated. Acceptance is partial pending real WebGPU gameplay; see `Games/Blackout/CREDITS.md`.

## Implementation map

`index.html` loads hashed Vite modules under `assets/`. The shared HUD bundle includes upstream World, SandboxSession, simulation, meshes and HUD; main owns input, renderer and animation. `check-solo.html` runs the same bundled simulation without requiring a GPU. `port.patch` records all local source changes relative to bf5f627. No server deployment is included.

## Gameplay and controls

Default office sandbox uses seed 1, three passive targets and unlimited ammunition. WASD/arrows move, mouse aims, left click fires, Shift sprints, G uses equipment, 1-3 select weapons, 4-5 select equipment, B toggles live bots, Tab/T show scores and M mutes. Touch arrows/fire and scene aiming are provided but gameplay is unverified on touch hardware. The disclosure includes restart and local practice links. Sandbox has no completion objective; local practice preserves upstream match rules. Peaceful disables B but still includes passive targets in this revision.

## State and persistence

World and sessions remain in memory. Reload resets the sandbox seed. Existing upstream blackout.name, blackout.gun, blackout.equip, blackout.mode and blackout.map preferences use localStorage. Storage-denial behavior was not verified. No accounts, rooms, sockets, API matchmaking or backend persistence. Local practice uses a random seed.

## Dependencies and provenance

Upstream https://github.com/anomalyco/arcade at bf5f6277e38ee52e9bfa4ae4a01337b46175c181. No upstream root LICENSE; direct owner-approved ingestion does not establish redistribution rights. CREDITS records the limitation. wgpu-matrix MIT and IBM Plex Mono OFL notices are retained. Fonts, sounds and all runtime assets are local; WebGPU is required.

## Audit findings

Blocking runtime limit: available Chromium reports no WebGPU adapter with both tested software-GPU configurations. The game correctly displays that error; rendering and native gameplay cannot be accepted. Input touch additions and bot-match completion/death/restart gameplay still require hardware verification. Asset rights and storage denial remain unverified. Dormant upstream menus remain compiled but online session construction, API calls and rejoin are removed; landing is bypassed. No external URLs or WebSocket calls were found in copied runtime bundles. A follow-up operator sweep removed upstream GPU/frame telemetry and parent-message reporting, and disabled the mux comparison input bridge. No GA/GTM, doubleclick, pubstack/pbstck, sendBeacon, XHR, tracking pixels or ad scripts were found. Remaining fetches are local module preloads and local vehicle sounds.

## Safe iteration

Apply port.patch to the pinned upstream staging clone and rebuild there with relative Vite base. Copy only the game distribution, retaining provenance and notices. Do not modify portal bundles or catalog here. Keep GPU errors visible, and never substitute simulation assertions for rendered gameplay acceptance.

## Verification

2026-10-13: Vite build, TypeScript and bundled JavaScript syntax passed. Bounded server port 8931 returned HTTP 200 and terminated after checks. Browser requests recorded no external URLs or sockets. The check-solo page passed module initialization, seed 1, alive/play, three passive targets, movement 0.730, ten shot events, weapon switching, bot toggle, seed reset and HUD construction. Browser console showed only the explicit WebGPU context warning on the game; simulation console was empty. Restart reloaded the document. Desktop 1280x800 and mobile 390x844 screenshots reviewed under both browser theme preferences show the GPU warning and controls; mobile has no horizontal overflow. Screenshots were temporary evidence, not committed game assets. No rendered play, full-game smoke pass or release approval claimed. The maintenance checker reports `Inventory stale: inspect changes, then run --refresh.` Before this port, HEAD already had 120 registered games and 125 projects versus the inventory's 118 and 123; Borough Run and Night Shift are the pre-existing differences. The coordinator must reconcile those guides and refresh the inventory with this unregistered Blackout addition. Shared inventory/index files were not edited in this bounded port. Follow-up telemetry removal used shrinking edits to the existing bundles and matching staging-source changes in port.patch because disk was below 2 GB; no rebuild was performed. Fresh node syntax and source TypeScript checks passed. Bounded port-8931 browser verification returned HTTP 200, the same simulation PASS, EXTERNAL_LOADS: [], SOCKETS: [], and SIM_CONSOLE: []; the WebGPU warning remains. Browser temporary files used memory-backed storage, and the server terminated. This is not release approval.

## Future outlook

Coordinator owns registration and publication. Next gate is a fresh real-WebGPU desktop and touch run covering movement, firing, bot combat, death/respawn, scoreboard, practice completion and restart. Verify upstream rights before public redistribution. Do not invent campaign features or restore multiplayer services.
