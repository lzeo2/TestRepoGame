# Getaway - offline solo port

- Source: https://github.com/anomalyco/arcade/tree/bf5f6277e38ee52e9bfa4ae4a01337b46175c181/games/getaway
- Repository: https://github.com/anomalyco/arcade
- Pinned commit: `bf5f627` (`bf5f6277e38ee52e9bfa4ae4a01337b46175c181`).
- Original live game: https://anoma.ly/arcade/getaway/
- Game and original assets: Anomaly arcade repository contributors. This is an adaptation of their game, not a newly authored game.

## Rights qualification

The pinned repository has no top-level LICENSE granting redistribution of the game. This copy was ingested by direct site-owner order, explicitly acknowledging that missing LICENSE. Owner-approved ingestion is not evidence of permission from every upstream rights holder, nor an open-source license grant. The upstream MP3 recordings have no independently verified asset license here. Do not describe this game or those recordings as MIT-licensed or freely redistributable.

Bundled dependency notices are preserved in `licenses/`: Barlow Condensed and Inter use SIL OFL 1.1; wgpu-matrix uses MIT. These licenses cover those components only. `licenses/UPSTREAM-AUDIO-SOURCES.md` preserves upstream's synthesis description and recording provenance limits; its historical test claims are not this port's acceptance results.

## Local modifications

- Rebuilt in the staging workspace with Vite `base: './'`. Contrary to the initial task description, this pinned Getaway config already used that relative base; it was retained, not falsely credited as a new change. The build input now includes only the game, not the cross-game comparison page.
- Removed lobby, matchmaking, room connection, chat and idle-kick entry code from `src/main.ts`. No WebSocket or API client is included in the resulting runtime bundle.
- Always instantiate the upstream `LocalSession`. Its existing peaceful/free-driving branch is now unconditional, with one human car, no bot participants, no helicopter, and the simulation in `waiting` so pursuit and round-end rules cannot run. The existing view presents the driving HUD. Default city seed: **7**; the upstream `?seed=N` override remains.
- Kept the upstream physics, generated city, renderer, local sound and fonts. This is free driving, not an offline recreation of multiplayer chase objectives. There is no fabricated win/loss state.
- Added a compact native controls disclosure, reload/restart button, and six pointer-capture touch controls routed through the upstream keyboard-input handler. Added narrow-screen positioning, visible focus, reduced-motion CSS, and a local data favicon. No replacement launch screen.
- Added a startup-error message, source patch, preserved notices and runnable verification. The test-only simulation bundle is not imported by the game.
- Telemetry follow-up: removed GPU timestamp queries, queue-wait timing, GPU adapter details, render-count metrics, frame-performance sampling and the automatic `arcade-perf` parent-frame report. The Lab retains presentation controls without collecting performance samples. No third-party analytics/ad trackers were found. The explicit comparison-mode input/state messaging remains, not automatic performance reporting; see the audit in `verification/RESULTS.md`.

`port.patch` records the staging source modifications relative to the pinned commit. No changes to the site's catalog or portal bundle are included.

## Controls and requirements

WASD or arrows drive, Space drifts, Shift uses nitro, H toggles the engine. Gamepad input remains upstream. Touch buttons provide left/right, drive/reverse, drift and nitro. Restart drive reloads the page. Progress is the elapsed driving clock; there is no saved campaign.

WebGPU is required, over HTTPS or a localhost static server. A browser exposing `navigator.gpu` without an adapter is not sufficient. This is a static, network-independent asset copy, not a promise of `file://` compatibility or service-worker caching. No backend, Cloudflare service, remote fonts or third-party runtime loads are used.

## Rebuild

Use a separate clone at the pinned commit. Apply `port.patch` with `git apply --unidiff-zero` from that clone's root, install the root workspace with `bun install --frozen-lockfile` if necessary, then run `bun run build` in `games/getaway`. Copy `dist/arcade/getaway/` into the port directory, preserving these notes, notices and verification files. Do not deploy the upstream worker.

To regenerate the test-only bundle, copy `verification/solo-verification.ts` into the staging `games/getaway/` directory, then run there:

```sh
bun build ./solo-verification.ts --target browser --format esm --define 'import.meta.env.DEV=false' --outfile sim.mjs
```

Copy the resulting file to `verification/sim.mjs`. It exports the same adapted session, input and HUD code, without the WebGPU renderer.

## Fresh verification and limitations

See `verification/RESULTS.md`. The verdict is **partial**: default simulation movement, determinism, DOM/HUD, keyboard, touch press/cancel, restart and local asset loading were verified. This runner has no WebGPU adapter, so the actual 3D scene and hardware driving feel were not observed. The renderer-free fixture is explicitly labeled and is not a rendered-game pass. Real WebGPU desktop/mobile gameplay and audio listening remain required before publication.
