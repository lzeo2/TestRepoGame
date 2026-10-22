# Wings - static offline adaptation

- Source: https://github.com/anomalyco/arcade
- Revision: `bf5f6277e38ee52e9bfa4ae4a01337b46175c181` (`bf5f627`).
- Upstream game: `games/wings`, by the anomalyco/arcade contributors.
- Live upstream: https://anoma.ly/arcade/wings/
- The upstream repository has no LICENSE. Ingested by direct owner order for this site. This records that instruction, not a claim of an open-source license or independently verified redistribution rights for the game or its models.
- Bundled Three.js 0.186.0: MIT notice in `THREE-LICENSE.txt`.
- Upstream-vendored Archivo Narrow and IBM Plex Mono: OFL notices retained in `fonts/`.

## Local modifications

`port.patch` records the staging-source changes against the pinned revision:

1. Vite base changed to `./`. Built HTML, scripts, workers, fonts and models resolve inside this directory.
2. The network adapter now uses only the upstream `createLoopbackRoom`. WebSocket, REST and fallback online transports are excluded from the shipped runtime. No Cloudflare worker or backend is needed.
3. Solo flight is the first menu option, with zero AI aircraft. The original enemy fleet guns remain active. Offline AI combat is retained as a separate option. Online joining, room browsing and invitation controls are removed from the reachable menus.
4. Added a controls entry, keyboard-tab access to menu items, minimum menu target height and scrolling for the controls list. Upstream rendering, art and flight physics are retained.
5. Updated the page description and initial loading copy. Retained the staging build-script change to Vite-only because upstream preview files have type errors; this is not a typecheck pass.
6. Added a bundled, dependency-free Node simulation regression and its TypeScript source in `verification/`.
7. The original operator-approved Astra pair was subsequently retired after consumer tracing. Current F-15 and F-35 models use original procedural geometry, with generation by openai-codex/gpt-6-astra and repairs by openai-codex/gpt-6.1-sol. Dark paint, ammo-linked stores, exhaust, recessed F-35 bays, distinct existing-weapon fits and geometry-derived camera/launch points follow the standing quality contract. See `docs/models.md` for hashes, authorship and recipe. This does not establish ownership or resolve the upstream game/model redistribution question.

8. Added the existing experimental speedboat to the same vehicle roster/picker and retained a dedicated patrol action. Held drive/steer/brake, cannon, depth charge, seat and water-spawn paths use the existing simulation. The selected hull bytes remain unchanged; its missing driver/older roof are not accepted repairs.
9. Added local offline two-team Capture the Flag: authoritative pickup/drop/return/capture rules, timer/score limit, mixed plane/boat AI, flag-base spawns and a real natural-water route between Mainland and Isle 2. New flags/route markers are locally authored primitives, not downloaded assets. Existing patrol/Fleet defaults and original vehicle slots remain unchanged. See the [CTF contract](../../docs/wings-ctf-contract.md) and [staging receipt](../../docs/maintenance/audits/wings-ctf-20261022/README.md); CPU simulation does not certify native rendering or rights.

No catalog registration, multiplayer service, third-party runtime load, or new game engine was added. This port has no fixed world seed override; CTF uses the existing map.

## Play and reset

Serve the site with any static HTTP server and open this directory's `index.html`. Choose Solo flight, then a vehicle (1 selects the fighter; 8 selects the speedboat), or Capture the flag for its mode/vehicle setup. Existing patrol and fleet options remain available. Default controls: W/S throttle, arrow down/up pitch up/down, A/D roll, Q/E full roll, Shift boost, mouse steering, left/right mouse weapons. Controls and Settings contain the full upstream reference. Escape opens the menu; Leave match returns to the lobby for a fresh local session. Keyboard and mouse are required; touch flight has not been implemented or certified. Preferences use upstream `wings.settings` and `wings.autoQuality` localStorage keys.

## Build and regression

In a separate checkout of the pinned upstream revision, apply `port.patch` from the upstream root. Copy the current `models/f15.glb`, `models/f35.glb` and `models/speedboat.glb` into `games/wings/public/models/`; the patch does not embed these generated binary assets. Use existing externally staged dependencies. The bounded operator approval covered Vite 7.3.7, Three 0.186.0, Rollup 4.64.5 and esbuild 0.28.2 on the build PC. It does not authorize installing repository or Pi tooling.

The current bounded source builder is `scripts/build_wings.mjs`: pass the applied source, existing external Three/esbuild package roots and an empty output directory. It installs nothing and checks generated imports, HTML/CSS and worker closure. Fonts/models remain local delivery inputs; authored HTML font URLs receive the established relative-URL delivery normalization. Do not substitute dependency versions.

Historical build-PC path: from the staged `games/wings` directory, run `bun --preserve-symlinks node_modules/vite/bin/vite.js build`. Output is `dist/`, not a nested `dist/arcade/wings/` directory. Deliver rebuilt HTML/chunks after checking their local references and retiring traced old hashes. Preserve models, notices, documentation and verification files when copying output. Never hand-edit generated bundles. No typecheck PASS is claimed.

Run from the site root:

```sh
node Games/Wings/verification/solo-check.mjs
```

The regression is bundled from upstream simulation modules, not a replacement simulation. To rebuild it, copy `verification/solo-check.ts` into the upstream `games/wings` directory and run `bun build solo-check.ts --target=node --outfile=solo-check.mjs`.

## Current verification

The [CTF staging receipt](../../docs/maintenance/audits/wings-ctf-20261022/README.md)
records the current source/CPU scope and missing Chromium evidence. Pure rules,
normal-input plane/boat captures, real mixed-combat loopback capture/end/restart,
timer and geometry/lifecycle checks pass. They do not grant native layout,
flag-run/water pixels, roof/driver, audio, hardware, whole-scene budget or rights
acceptance. Three earlier boat-native attempts remain HOLD; no push or full
127-game loading gate was performed in this lane.

Additional bundled regressions: `verification/ctf-check.mjs`,
`ctf-bots-check.mjs`, `ctf-view-check.mjs`, `ctf-integration-check.mjs` and
`ctf-ui-check.mjs`. The UI/source check needs the applied authored `games/wings`
directory as its argument; the others run without a browser. Readable TypeScript
and the pinned patch are retained for rebuilding and review.

The 2026-10-17 repair baseline passed deterministic geometry/CPU/solo checks and the unchanged full catalog loading gate: **125/125, exit 0** at `b52d942`. Both jets also passed bounded Windows WebGPU flight, cannon, exit/restart and respawn checks. Four unavailable-GPU UI cases passed. The [current manual](../../docs/maintenance/games/232-wings.md) and [repair receipt](../../docs/maintenance/audits/wings-repair-20261017.md) distinguish these scopes from subsequent input/toast changes and remaining combat, hardware and rights checks. Later continuation evidence is recorded separately; older results below remain historical.

The [continuation receipt](../../docs/maintenance/audits/wings-continuation-20261017.md) records the later input/toast fixes, CPU missile fixtures, fresh native/UI checks and bounded remaining diagnostics. Its unchanged catalog gate at `bfbc564` passed **125/125, exit 0** in 1,591.93 seconds. Later credits/audit/inventory records do not change the tested runtime. Native missile gameplay, physical hardware and rights remain qualified separately.

## Historical ingestion verification and limitations

Verdict: **partial**. The real offline simulation flies; native rendered flight remains unverified on this machine.

Actual regression output:

```text
start: [-40, 22.2, 2926]
end: [-162.597, 1459.632, 2924.800]
alive: true; onGround: false; speed: 177.720; aircraft: 1
PASS: upstream offline loopback fighter takes off and climbs with flight input; no server
```

This advances the loopback engine with normal throttle/boost/pitch messages, without setting aircraft position, granting state or connecting a server. It asserts survival, takeoff, climb, displacement and exactly one aircraft.

Local HTTP check on port 8933: `HTTP 200`. Bounded Chromium checks loaded the solo menu; xvfb with SwiftShader reached `state: spawn`, `vehicles: 0`, and the aircraft-selection HUD. Rendered flight did not finish before the 150-second bound. A separate native-GL attempt failed to initialize its context. No visual flight pass or screenshot acceptance is claimed.

Captured browser diagnostics, not filtered away:

```text
Failed to create WebGPU Context Provider
THREE.WebGPURenderer: WebGPU is not available, running under WebGL2 backend.
THREE.AttributeNode: Vertex attribute "uv" not found on geometry.
TypeError: Cannot read properties of null (reading 'getSupportedExtensions')
```

The last error was from the native-GL attempt. WebGPU is preferred; the upstream WebGL2 fallback exists but remains unaccepted here. Real GPU desktop review, rendered takeoff/steering, bot combat, crash/respawn, leave/restart, mobile layout and audio acceptance are still required.

Upstream `bun test`: `302 pass`, `1 fail`, `447507 expect() calls`. The failure was `performance > 1M groundHeight calls`, with measured 465.705 ms exceeding its performance assertion. No threshold was changed.

Runtime URL scan found only XML namespace strings and Three.js source-comment links (GitHub issue and Shadertoy attribution), not external asset loads. Fonts and model loads observed in the local server log returned 200. No WebSocket constructor remains in runtime bundles. The registered-catalog full smoke gate was not run; no push or release is authorized by these targeted checks.
