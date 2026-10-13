# Wings

<!-- maintenance-game: Games/Wings -->

## Identity and status

Unregistered static adaptation of anomalyco/arcade Wings at `bf5f6277e38ee52e9bfa4ae4a01337b46175c181`. Entry: `Games/Wings/index.html`. Direct owner ingestion order despite missing upstream LICENSE. No catalog ID assigned. Acceptance is partial, not a verified rendered-flight release.

## Implementation map

Vite-built modules in `assets/`, local GLB models in `models/`, local fonts and OFL notices in `fonts/`. `port.patch` records staging changes to Vite, entry HTML, lobby, pause, spawn and network adapter. The upstream loopback room engine replaces remote transports; flight physics and renderer are upstream code. `verification/solo-check.mjs` bundles the same simulation with a runnable takeoff regression.

Inspected source: main entry, networking and loopback, lobby, pause/spawn menus, settings, relevant scene initialization and game-session connection/input paths. This was not a complete review of the flight engine, Three.js, shaders, model provenance, or every aircraft and weapon.

## Gameplay and controls

Solo flight leads with zero AI aircraft. Enemy fleet AA remains active. A separate offline bots option retains upstream AI combat. Choose an aircraft using the menu or keys 1-5. W/S throttle; arrow down/up pitch; A/D roll; Q/E full roll; Shift boost; mouse steering and weapons. Escape opens the menu and Leave match returns to the lobby. Controls contains the full upstream reference. Keyboard/mouse only; no touch-flight acceptance.

## State and persistence

Local room state is in memory. Settings use `wings.settings` and automatic quality uses `wings.autoQuality`. No account or multiplayer server. Reload creates a new local session. No fixed seed override was added.

## Dependencies and provenance

See `Games/Wings/CREDITS.md` for source URL, pinned revision, live URL, missing-license qualification and owner order. Three.js 0.186.0 MIT notice is retained; upstream font OFL notices are retained. Game/model redistribution rights are not independently established by the owner's instruction. No remote runtime dependencies were added.

## Audit findings

Rendered flight remains held: SwiftShader reached aircraft selection but timed out before native flight confirmation; a native-GL attempt failed context initialization. WebGPU is preferred, with upstream WebGL2 fallback. Missing-UV warning was retained in evidence. Upstream performance test failed on this machine. Real GPU, both-theme desktop/mobile screenshots, touch controls, combat, crash/respawn and restart gates remain open. No successful gameplay screenshot exists from this run.

## Safe iteration

Patch a separate pinned upstream checkout, apply `port.patch`, build Wings with relative Vite base and replace only this port's dist output. Keep notices and regression files. Do not enable the worker, online lobby or remote transport. Do not infer an asset is unused from its absence in the initial scene. Keep catalog registration and push separate.

## Verification

`node Games/Wings/verification/solo-check.mjs` passed: one live fighter took off from y=22.2 to y=1459.632 using ordinary input messages over the real local simulation, without state grants. Speed was 177.720 and `onGround` was false after 15 simulated seconds. This is simulation proof, not visual/native-input acceptance.

Port 8933 returned `HTTP 200`. Chromium loaded the offline menu; xvfb/SwiftShader reached the spawn HUD. Full browser flight timed out at 150 seconds. Captured warnings/errors and exact test output are in CREDITS. Upstream tests: 302 pass, 1 terrain-performance failure; no filter or threshold changed. Build succeeded with the existing Vite-only script. No full registered-game smoke or release gate was run. Servers were bounded and terminated.

Maintenance inventory was already stale after parallel port commits; the coordinator must refresh the shared inventory/index after integrating these unregistered ports. No other game's manual was changed here.

## Future outlook

First obtain real-GPU rendered takeoff, steering, crash/respawn and restart evidence, then test bot combat and device accessibility. Resolve rights and hardware acceptance before registration or publication. Do not substitute a fabricated game or decorative preview for upstream flight.
