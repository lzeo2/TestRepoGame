# Blackout

- Upstream project: Anomaly arcade, https://github.com/anomalyco/arcade
- Revision: `bf5f627` (`bf5f6277e38ee52e9bfa4ae4a01337b46175c181`).
- Original live game: https://anoma.ly/arcade/blackout/
- No root LICENSE is present at this revision. Ingested by direct site-owner order for this port. This records authorization to perform the ingestion, not an open-source license or independently verified redistribution rights. Upstream code and asset rights remain unverified.
- Runtime dependencies: wgpu-matrix (MIT) and IBM Plex Mono (SIL OFL 1.1). Their supplied notices are in `licenses/`. The upstream arcade kit and game-generated geometry/audio are bundled with the game. Vehicle sound files are copied unchanged from upstream; separate asset permissions were not established.

## Local modifications

- Rebuilt with Vite `base: './'`, already present in the supplied pinned staging source. No absolute arcade prefix remains in deployed HTML, JS or CSS.
- Removed the NetSession import, API matchmaking/stats requests and session rejoin flow. The static bundle does not contain WebSocket networking. No server or Cloudflare code is shipped.
- Default entry starts upstream SandboxSession, office map seed **1**, with three passive targets and unlimited ammunition. B toggles the upstream local bot AI. This is a practice sandbox, not a new campaign or stealth objective.
- `?peaceful=1&seed=1` keeps targets passive and disables B. At this pinned source, peaceful uses the same sandbox with passive targets, not an empty map. `?seed=N` selects another finite seed. `?practice=1` retains upstream local bot matches, whose map seed is random.
- Added a small controls disclosure, restart, links to local practice/sandbox, and touch movement/fire controls using upstream input handling. Keyboard focus inside these controls does not trigger game shortcuts.
- Excluded the upstream comparison entry. Added `check-solo.html`, a runnable GPU-independent check of the actual shared simulation and HUD constructor. It does not certify rendering or human gameplay.
- Local fonts, shaders, code and sounds only. No runtime third-party URLs were found in the copied HTML, JS or CSS.

`port.patch` records the staging-source changes. To rebuild, apply it at the pinned upstream repository root with `patch -p1 < port.patch` (or `git apply --unidiff-zero port.patch`), use the existing workspace dependencies (or `bun install --frozen-lockfile` there), then run `bun run build` in `games/blackout`. Deploy only `games/blackout/dist/arcade/blackout/`; retain this provenance, patch and license notices. Do not copy node_modules.

## Verification and limits

Serve the site with a static HTTP server and open `Games/Blackout/index.html`. HTTPS or localhost and an actual WebGPU adapter are required. No game backend is used. This is offline-first asset closure, not a service-worker install or a promise that file URLs work.

Checked on 2026-10-13 with Chromium and a bounded local server on port 8931:

```text
HTTP 200
DOM: BLACKOUT / No WebGPU adapter is available on this device.
LOAD_CONSOLE: warning: Failed to create WebGPU Context Provider
SIM: PASS: simulation module, seed 1, alive/play, 3 passive targets, movement 0.730, shots 10, weapon switch, bot toggle, seed reset, HUD DOM. Rendering not tested.
SIM_CONSOLE: []
MOBILE_OVERFLOW: False
SOCKETS: []
EXTERNAL: []
```

The runnable check is `check-solo.html` beside the game. Its first test run was too short for the upstream 0.5-second spawn firing cooldown; the check now advances 1.5 seconds, without changing gameplay or filtering failures. Vite build, TypeScript checking and bundled JavaScript syntax checks passed.

Verdict: **partial**. The shipped simulation moves and shoots locally and initializes HUD DOM. Two software-GPU browser configurations lacked a WebGPU adapter; no rendered game, native combat, touch gameplay, bot-match completion or death/respawn was verified. Desktop and mobile screenshots in light/dark browser preferences show the honest GPU warning and readable controls, not gameplay. Restart reloads the document. Real WebGPU hardware acceptance remains required. Catalog registration and the full registered-game smoke gate are separate coordinator tasks; nothing was pushed.
