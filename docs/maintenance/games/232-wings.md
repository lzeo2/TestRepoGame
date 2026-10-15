# Wings

<!-- maintenance-game: Games/Wings -->

## Identity and status

Registered as catalog **232**, entry `Games/Wings/index.html`. Static offline adaptation of anomalyco/arcade Wings at `bf5f6277e38ee52e9bfa4ae4a01337b46175c181`. The historical `unregistered-wings.md` path now forwards here. Direct owner ingestion order despite missing upstream LICENSE. Registration is not rendered-flight or publication acceptance.

## Implementation map

Vite-built modules in `assets/`, local GLB models in `models/`, local fonts and OFL notices in `fonts/`. `port.patch` records staging changes, including the renderer boundary, menu/CSS, offline adapter and verification sources. Apply it from the pinned upstream repository root, then build `games/wings` with Bun and the relative-base Vite configuration. Build remains Vite-only by operator instruction; no typecheck PASS is claimed.

Inspected: entry/main, scene host, game-session lifecycle, lobby, pause/spawn, targeted HUD copy/CSS, loopback regression. The flight/combat/room engines, Three internals, world/material shaders and models were not rewritten. This is not an exhaustive shader, engine or asset-rights audit.

## Gameplay and controls

Solo flight uses zero AI aircraft, but enemy fleet guns remain active. Play with bots uses two teams and normal AI skill. Custom setup reuses upstream configuration controls for bots, skill, teams, pilot capacity, score and time limits. Start always requests `mode: offline` and `listed: false`. Match rules remain upstream Fleet Strike rules; exposing a score setting does not invent a new scoring mode.

Choose among seven aircraft with the hangar menu or keys 1-7 (6 Astra Interceptor, 7 Astra Trainer). Custom setup's Aircraft row selects the initial real spawn after the renderer gate; Solo and bots retain the hangar. Default W/S throttle, arrows pitch/turn, A/D roll, Q/E full roll, Shift boost, mouse steering and weapons. Controls lists the selected upstream input scheme. Keyboard/mouse required; narrow-screen menu support is not touch-flight support. Visible Back to menu uses the existing session leave path. Escape/pointer-lock gameplay behavior still needs supported-GPU acceptance.

## State and persistence

Local room state is in memory. Settings use `wings.settings`; automatic quality uses `wings.autoQuality`. Retry with Low saves the existing Low preference and reloads. Back to menu disposes the local session; starting again creates a new room. Spawn and pause listeners are now disposed on exit, rather than surviving detached UI roots. No account, remote transport, fixed-seed override or online invitations.

## Dependencies and provenance

See `Games/Wings/CREDITS.md` for source URL, revision, live URL, missing-license qualification and owner order. Retained Three.js 0.186.0 MIT and font OFL notices do not establish rights to the game/models. No new runtime third-party loads or dependencies. Existing upstream art/typography preserved.

Fleet lane1 (`39f4ef3`) added two operator-approved, original AI-generated
procedural models: `astra-interceptor.glb` (46,840 bytes, 328 triangles) and
`astra-trainer.glb` (55,712 bytes, 368 triangles), each below 200,000 bytes.
See `Games/Wings/docs/models.md` for hashes, provenance qualifications, -Z forward/
+Y up/+X right orientation, scale 1 and named anchors. No third-party model input
was used according to the generator receipt; that is not a universal rights
guarantee and does not resolve Wings' missing license. Follow-up task 2 integrates both into the custom picker, spawn protocol, simulation,
render descriptors, camera and audio maps. See the model contract for actual modest
handling differences and retained fighter rules. Standard Three historical previews
are not Wings material acceptance. Native flight, cockpit and propeller acceptance
remain held; the new ordinary-input simulation regression passes both kinds.

## Audit findings

Phase 1 observed WebGL2 shader validation errors and HUD-only flight with zero draw calls. Phase 2 now waits for a world-ready scene draw before permitting a session, captures Three's WebGL compiler/linker logs, stops the animation loop on shader/scene/device failure, and displays a persistent diagnostic dialog. Zero draws and first-draw timeout also fail closed. The Low retry uses the upstream preference, not replacement materials or a renderer rewrite.

**Flight shader/driver root cause remains unresolved.** Fresh software Low/Balanced probes warned about missing UV attributes, then screenshot/close operations hung. The shader failure could not be isolated within the bounded attempts. A GPU-driver stall can also delay JavaScript timers; the timeout is not an independent watchdog. No WebGPU or WebGL2 rendered-flight PASS is claimed. The diagnostic dialog was verified with deliberately unavailable GPU contexts, not as proof of reproducing every shader failure.

The follow-up removes a proven lifecycle defect: `main.ts` unconditionally called `bootScene()` after menu paint, starting world streaming, context creation and shader work before any flight request. Now the existing common `start()` path alone boots the scene and still awaits its first real draw before creating a session. Initial menu/Controls/Settings need no GPU. First-launch automatic quality benchmarking moves to the first successful return to the menu, where a live backdrop exists; its hardware behavior remains unverified. No renderer, shader, quality threshold or smoke filter was replaced.

Mobile spawn now stacks the list and detail in a real scrolling container. HUD radar/map sit below weapon labels. Decorative gradients and game-facing em dashes were removed; functional compass ticks/fades and spotting masks remain. Browser theme preference does not recolor the retained upstream dark game shell.

## Safe iteration

Patch pinned staging source, rebuild, replace only Wings dist files, and regenerate `port.patch`. The follow-up received the clean pinned source read-only and applied the complete previous patch to an external 9.3 MiB staging tree, with cached dependencies and public assets symlinked rather than installed/copied. Bun with cached Vite 7.3.7 rebuilt the source; regenerated `port.patch` passes `git apply --check` against the pin. Source recovery is no longer a blocker. Spawn-framing/navigation/failure-copy polish remains separate. Task 2 subsequently integrates the two authorized Astra aircraft without changing the task 1 lifecycle boundary. Do not re-fetch upstream or hand-edit bundles. The lane1 GLBs remain byte-preserved, with orientation contract in `Games/Wings/docs/models.md`; task 2 now supplies selection, flight tuning and provisional cockpit placement. Trace old hashed asset consumers before removing stale bundles. Keep notices and regression sources. Never restore worker/network services, edit minified output, or claim simulation/UI fixtures establish native flight. The pre-gate documentation lane reconciles inventory after committed follow-up source/model-doc changes; this does not lift rendering or rights holds.

## Verification

Phase 2 shipped checks:

- `node Games/Wings/verification/solo-check.mjs`: ordinary-input takeoff from y=22.2 to y=1459.632; speed 177.720; fresh session at time 0; ordinary dive crashed at 4.0167 seconds; live respawn at 14.0167 seconds. No position/health grants. Rendering not tested.
- Serve repository root on port 8938, then `python3 Games/Wings/verification/check-browser.py --out "$EVIDENCE"` with an external evidence directory. Uses existing Playwright/Chromium; no dependency install. Tests unavailable-renderer dialog, Low retry/reload, custom menu controls, actual spawn-component listener cleanup and scrolling, and explicitly synthetic HUD layout. Four desktop/mobile and light/dark preference combinations; fixture screenshots are not gameplay.
- `check-ui.html` is the renderer-free regression fixture, not a game mode. Its title becomes `PASS: Wings UI fixture` only after quick-launch and disposed-listener assertions.

2026-10-15 lane2 reran the solo regression and expanded `verification/check-browser.py` (also mirrored into `port.patch`). The browser check now uses real menu clicks to assert all three launch routes (Custom Start, Solo flight, Play with bots) remain fail-closed after dismissing renderer diagnostics: lobby visible, busy overlay hidden, no session UI. It also checks Controls/Settings and Escape return. All four viewport/theme cases passed; this deliberately disables GPU contexts and does not reproduce shader stalls or certify flight. Fresh screenshots and `browser.json` have the external evidence label `trg-fleet/lane2/`; see [lane2 audit](../audits/fleet-2026-10-15-lane2.md). Its 118-versus-125 inventory error was historical; lane7 has now added the missing Wings record and canonical manual path.

Historical screenshots/probes have the external evidence label `phase2/wings/`. Inspected mobile spawn/detail, HUD fixture, custom setup and renderer-error screenshots, plus desktop error/layout screenshots. Functional scroll and non-overlap are UI-only evidence. Real flight, aircraft visibility, native combat/audio, crash-respawn, pointer-lock exit and fresh rendered restart remain held. Those focused checks were not the full catalog gate; no push occurred.

Fleet lane1's structural/deterministic GLB check and four isolated desktop/mobile
light/dark Three 186 renders passed, without external requests or console/page
errors. Main reviewed two model previews and judged silhouettes distinct; this
is not Wings flight/material acceptance. Evidence label: `trg-fleet/lane1/`.
Fleet lane2 changed only tests and the matching `port.patch` hunk, not Wings
runtime/gameplay. The full [lane6 gate](../audits/fleet-2026-10-15-lane6.md) later
logged Wings `ok` but **failed 122/125 overall**. [Triage](../audits/fleet-2026-10-15-triage.md)
reproduced native context-creation stalls in Server Survival/Astray after Wings;
each passed independently and their pair passed without Wings. Underlying cause
remains unresolved. Do not translate a short Wings load window into first-draw
or flight acceptance.

Follow-up task 1: the unchanged native Wings -> Server Survival -> Astray smoke sequence reproduced **1/3, exit 1** before the source fix and passed **3/3, exit 0** twice afterward (including the final build). `verification/check-context-sequence.py` leaves that same-browser regression runnable with a 90-second outer process bound and port 8982; individual runner timeouts/filters remain unchanged. It browses the Wings menu, not flight. The updated unavailable-GPU UI test passes all four viewport/theme cases after clicking Play, including Low reload, all three fail-closed launch routes, menu navigation and the existing spawn/HUD fixtures. The ordinary-input simulation regression passes unchanged. Menu/error screenshots were inspected in desktop/mobile and light/dark preference combinations; upstream dark styling remains. See [follow-up evidence and rebuild instructions](../audits/fleet-followup-wings.md). The failed full 122/125 release gate is not superseded. Inventory refresh belongs to the coordinator.

Task 2 verification: source Vite rebuild and clean pin patch applicability pass;
`node Games/Wings/verification/astra-check.mjs` checks both selectable kinds through
offline config/spawn/snapshot/simulation and GLB descriptors/camera math. Ordinary
input reaches y=1597.911 / 1275.162 and speeds 190.323 / 161.557. Original solo and
immutable-model checks pass. Actual custom picker plus renderer-free request/spawn
fixture and all four unavailable-GPU cases pass. Shared-browser sequence initially
returned 2/3 (Astray reload ERR_ABORTED); two unchanged retries returned 3/3,
including final build. Keep that transient failure in the evidence, not a clean
all-attempts claim. Converted-material preview timed out at its 40-second outer
bound. No rendered-flight PASS. Evidence/rebuild recipe:
[fleet follow-up](../audits/fleet-followup-wings.md).

Current pre-gate integration: task 1 is `3b9e92d`, task 2 is `d435f12`.
The task 2 worker committed before its 20-minute deadline but reached that limit
before final output; task logs remain available. Main independently passed Astra,
solo, immutable-model and static SEO checks and reviewed desktop-dark/mobile-light
picker screenshots: both labels fit. Failure toast/footer remains crowded; no
polished-flight claim. This documentation lane reran the nonbrowser checks and
refreshes inventory only after all Games changes are committed. The generated
Astra regression was 884,415 bytes at `d435f12`. A subsequent Bun 1.4.3
`--minify` rebuild of unchanged source reduces it to **539,850 bytes**, test-only,
with the existing Three MIT notice unchanged. All three machine-specific path
comments are absent from current output; original artifact history is not remediated.
Astra output is byte-identical to the old regression's stdout; original solo,
immutable-model and syntax checks pass. Global follow-up diff whitespace still
fails: 21 regression shader-literal findings and the untouched runtime finding.
Current-change diff check passes, not the baseline range. Exact locations and
rebuild command are in the follow-up recipe. No source logic or GLBs changed;
inventory reconciliation after this output commit belongs to the coordinator.
Do not hand-edit bundles or call a scoped check globally clean. See the
[pre-gate handover](../audits/fleet-followup-handover.md) for findings, identity map
and pending ticket `1792052078368`. Fresh full gate is next, not accepted yet.

## Future outlook

On supported hardware, isolate the fallback shader/compiler failure and verify first scene, takeoff, turning, combat, crash/respawn, back-to-menu and a fresh session. Preserve the honest failure boundary while doing so. Resolve redistribution rights before release; do not replace upstream flight with fabricated gameplay to satisfy a render gate.
