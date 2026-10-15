# Getaway

<!-- maintenance-game: Games/Getaway -->

## Identity and status

Registered id **231**, entry `Games/Getaway/index.html`. The historical `unregistered-getaway.md` URL now forwards here. Existing upstream game ingested by direct owner order from anomalyco/arcade commit `bf5f6277e38ee52e9bfa4ae4a01337b46175c181`, not a new self-made game. Phase 2 restores offline chase and keeps separate free driving. Rendering acceptance remains held: this runner has no WebGPU adapter.

## Implementation map

Vite-built HTML, hashed JS/CSS and local fonts in `assets/`, original sounds in `sfx/`. Recreate pinned staging plus `port.patch`; never edit minified bundles. The patch records all authored staging changes, including early shell setup, native vehicle selectors, input-focus guard and HUD copy. `verification/sim.mjs` bundles the same session/input/HUD without the renderer and is not a production dependency.

Inspected: main initialization/frame path, LocalSession/callers, input, HUD/minimap, simulation round selection/transitions, vehicle pick validation, build and runtime asset imports. Physics, renderer internals and audio quality were not exhaustively audited. Prior telemetry removal remains intact; shared Lab source still contains dormant performance placeholder strings, but the local debug header replaces them with presentation controls.

## Gameplay and controls

Default: original LocalSession chase, one human and four bot participants. The human begins as robber; subsequent rounds alternate human/bot robber, using the selected robber/cop vehicle structures. Original survival/bust/automatic next-round rules are unchanged. Native selectors offer the upstream role-specific vehicles, default Muscle and Cruiser. Submit starts a fresh session. `?peaceful=1` explicitly selects endless free driving, without cops, helicopter or round endings; the HUD labels it Free drive.

WASD/arrows drive, Space drifts, Shift boosts, H toggles engine; upstream gamepad remains. Six touch buttons cover driving, steering, drift and nitro. Q activates the cop spike strip through upstream input. Restart round reloads the current mode/car query. It is bound before requesting a GPU, including missing-adapter/rejected-startup paths. Focused help/form controls retain native keyboard behavior without driving; focus on the canvas makes Space drift without toggling help.

## State and persistence

LocalSession owns World/fixed-step/interpolated snapshots, with no server connection. Seed defaults to 7; upstream seed override remains. Role-specific car query values are checked against upstream VEHICLES before use. No new storage keys. A reload resets round/time to zero. Explicit upstream comparison/development hooks remain, including guarded parent input/state messaging, not periodic telemetry. Touch releases on pointerup/cancel/lost capture; blur and help focus release held keys.

## Dependencies and provenance

See `../../../Games/Getaway/CREDITS.md`. No upstream game LICENSE establishes redistribution permission; owner-approved ingestion does not supply missing rights. MP3 rights remain unverified. Local Barlow Condensed/Inter OFL and wgpu-matrix MIT component notices remain. All runtime fonts/sounds are local. WebGPU requires HTTPS or localhost and a working adapter; no WebSocket/API client is bundled.

## Audit findings

Held: rendered 3D chase/driving, real-device touch/gamepad, audio listening, upstream redistribution/recording rights and full-site release gate. All four browser probes show the honest no-WebGPU-adapter error. SIM/HUD screenshots are not scene-render acceptance. The previous catalog claim of a cop simulation in peaceful mode was false; id 231 now describes distinct chase/free-drive modes.

The phase-2 inventory omitted Getaway (118 recorded versus 123 catalog entries then). Lane7 reconciled the current 125 registered / 130 project inventory after fleet source commits; this closes documentation coverage only, not the rendering or rights holds.

## Safe iteration

Apply the patch to pinned staging, preserve Vite relative base, typecheck and rebuild the main entry. Regenerate `verification/sim.mjs` per CREDITS. Preserve notices/tests when replacing obsolete hashed artifacts, and trace tracked consumers before deleting them. Do not restore online lobby imports or change chase physics to satisfy tests. Update this manual with each source change.

## Verification

Phase 2, 2026-10-13: `bun run typecheck` passed; Vite built **74 modules**. `node Games/Getaway/verification/check-solo.mjs` reports four pursuing bot cops and **busted at 117.63s** with ordinary idle input, next round using Cruiser, fresh restart at intro/round 0/time 0, selected Compact used, and explicit free drive moving **26.96m in 2s** with identical 300s runs and no cops/end. No position/health grants were used.

`python3 -B Games/Getaway/verification/check-browser.py <evidence-dir>` serves repo root on **8937**, then shuts down. Four desktop/mobile light/dark checks report HTTP 200, `console_errors=[]`, `errors=[]`, `failed=[]`, `external=[]`, `sockets=[]`. Production error-screen restart changes timeOrigin before fixture construction. Missing GPU, adapter rejection and device rejection also reload successfully. Native Space/help isolation, vehicle/mode form round-trip, touch press/cancel and native keyboard movement pass in explicitly labeled SIM/HUD fixtures (five cars, chase clock 0:12.9). Screenshots were inspected, including corrected mobile clock/help separation and dark disclosure. Evidence: temporary `phase2/getaway/` directory (uncommitted local artifacts).

Historical evidence in `verification/RESULTS.md` records the superseded peaceful-only port; Phase 2 evidence takes precedence for accepted modes. No full registered-game smoke or push occurred in Phase 2. The later [fleet gate](../audits/fleet-2026-10-15-lane6.md) logged Getaway `ok` but failed overall at 122/125. Hardware rendering remains unaccepted.

## Future outlook

Verify rendered WebGPU chase, bust/next round/restart, audio and physical input before release; run the unchanged full registered-game smoke before any push. Keep the reconciled inventory current after future source commits. Registration is not rights clearance. No new game was added by Phase 2.
