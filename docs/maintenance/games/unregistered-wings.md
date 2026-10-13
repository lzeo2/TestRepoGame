# Wings

<!-- maintenance-game: Games/Wings -->

## Identity and status

Registered as catalog **232**, entry `Games/Wings/index.html`. Static offline adaptation of anomalyco/arcade Wings at `bf5f6277e38ee52e9bfa4ae4a01337b46175c181`. The historical filename predates registration. Direct owner ingestion order despite missing upstream LICENSE. Registration is not rendered-flight or publication acceptance.

## Implementation map

Vite-built modules in `assets/`, local GLB models in `models/`, local fonts and OFL notices in `fonts/`. `port.patch` records staging changes, including the renderer boundary, menu/CSS, offline adapter and verification sources. Apply it from the pinned upstream repository root, then build `games/wings` with Bun and the relative-base Vite configuration. Build remains Vite-only by operator instruction; no typecheck PASS is claimed.

Inspected: entry/main, scene host, game-session lifecycle, lobby, pause/spawn, targeted HUD copy/CSS, loopback regression. The flight/combat/room engines, Three internals, world/material shaders and models were not rewritten. This is not an exhaustive shader, engine or asset-rights audit.

## Gameplay and controls

Solo flight uses zero AI aircraft, but enemy fleet guns remain active. Play with bots uses two teams and normal AI skill. Custom setup reuses upstream configuration controls for bots, skill, teams, pilot capacity, score and time limits. Start always requests `mode: offline` and `listed: false`. Match rules remain upstream Fleet Strike rules; exposing a score setting does not invent a new scoring mode.

Choose aircraft with the menu or keys 1-5. Default W/S throttle, arrows pitch/turn, A/D roll, Q/E full roll, Shift boost, mouse steering and weapons. Controls lists the selected upstream input scheme. Keyboard/mouse required; narrow-screen menu support is not touch-flight support. Visible Back to menu uses the existing session leave path. Escape/pointer-lock gameplay behavior still needs supported-GPU acceptance.

## State and persistence

Local room state is in memory. Settings use `wings.settings`; automatic quality uses `wings.autoQuality`. Retry with Low saves the existing Low preference and reloads. Back to menu disposes the local session; starting again creates a new room. Spawn and pause listeners are now disposed on exit, rather than surviving detached UI roots. No account, remote transport, fixed-seed override or online invitations.

## Dependencies and provenance

See `Games/Wings/CREDITS.md` for source URL, revision, live URL, missing-license qualification and owner order. Retained Three.js 0.186.0 MIT and font OFL notices do not establish rights to the game/models. No new runtime third-party loads or dependencies. Existing upstream art/typography preserved.

## Audit findings

Phase 1 observed WebGL2 shader validation errors and HUD-only flight with zero draw calls. Phase 2 now waits for a world-ready scene draw before permitting a session, captures Three's WebGL compiler/linker logs, stops the animation loop on shader/scene/device failure, and displays a persistent diagnostic dialog. Zero draws and first-draw timeout also fail closed. The Low retry uses the upstream preference, not replacement materials or a renderer rewrite.

**Renderer root cause remains unresolved.** Fresh software Low/Balanced probes warned about missing UV attributes, then screenshot/close operations hung. The shader failure could not be isolated within the bounded attempts. A GPU-driver stall can also delay JavaScript timers; the timeout is not an independent watchdog. No WebGPU or WebGL2 rendered-flight PASS is claimed. The diagnostic dialog was verified with deliberately unavailable GPU contexts, not as proof of reproducing every shader failure.

Mobile spawn now stacks the list and detail in a real scrolling container. HUD radar/map sit below weapon labels. Decorative gradients and game-facing em dashes were removed; functional compass ticks/fades and spotting masks remain. Browser theme preference does not recolor the retained upstream dark game shell.

## Safe iteration

Patch pinned staging source, rebuild, replace only Wings dist files, and regenerate `port.patch`. Trace old hashed asset consumers before removing stale bundles. Keep notices and regression sources. Never restore worker/network services, edit minified output, or claim simulation/UI fixtures establish native flight. Shared inventory refresh belongs to the integrating coordinator after all game commits.

## Verification

Phase 2 shipped checks:

- `node Games/Wings/verification/solo-check.mjs`: ordinary-input takeoff from y=22.2 to y=1459.632; speed 177.720; fresh session at time 0; ordinary dive crashed at 4.0167 seconds; live respawn at 14.0167 seconds. No position/health grants. Rendering not tested.
- Serve repository root on port 8938, then `python3 Games/Wings/verification/check-browser.py --out /tmp/phase2/wings`. Uses existing Playwright/Chromium; no dependency install. Tests unavailable-renderer dialog, Low retry/reload, custom menu controls, actual spawn-component listener cleanup and scrolling, and explicitly synthetic HUD layout. Four desktop/mobile and light/dark preference combinations; fixture screenshots are not gameplay.
- `check-ui.html` is the renderer-free regression fixture, not a game mode. Its title becomes `PASS: Wings UI fixture` only after quick-launch and disposed-listener assertions.

Screenshots/probes are in `/tmp/phase2/wings/`. Inspected mobile spawn/detail, HUD fixture, custom setup and renderer-error screenshots, plus desktop error/layout screenshots. Functional scroll and non-overlap are UI-only evidence. Real flight, aircraft visibility, native combat/audio, crash-respawn, pointer-lock exit and fresh rendered restart remain held. No full catalog smoke/release gate or push was run.

## Future outlook

On supported hardware, isolate the fallback shader/compiler failure and verify first scene, takeoff, turning, combat, crash/respawn, back-to-menu and a fresh session. Preserve the honest failure boundary while doing so. Resolve redistribution rights before release; do not replace upstream flight with fabricated gameplay to satisfy a render gate.
