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
7. Added the operator-approved Astra Interceptor and Astra Trainer to offline custom selection, validated spawn, existing flight tuning and model/camera/audio descriptors. These are original AI-generated procedural geometry, not third-party model imports. See `docs/models.md` for immutable hashes, author, source recipe and qualifications. No new third-party asset license requirement was identified for their geometry; this is not a universal ownership/non-infringement guarantee and does not resolve Wings' missing license. Both retain fighter weapons and arcade physics; native rendered acceptance remains held.

No catalog registration, multiplayer service, third-party runtime load, or new game engine was added. This port has no fixed world seed override.

## Play and reset

Serve the site with any static HTTP server and open this directory's `index.html`. Choose Solo flight, then an aircraft (1 selects the fighter). Default controls: W/S throttle, arrow down/up pitch up/down, A/D roll, Q/E full roll, Shift boost, mouse steering, left/right mouse weapons. Controls and Settings contain the full upstream reference. Escape opens the menu; Leave match returns to the lobby for a fresh local session. Keyboard and mouse are required; touch flight has not been implemented or certified. Preferences use upstream `wings.settings` and `wings.autoQuality` localStorage keys.

## Build and regression

In a separate checkout of the pinned upstream revision, apply `port.patch` from the repository root. In `games/wings`, use the existing dependencies or `bun install --frozen-lockfile`, then `bun run build`. This revision's Wings Vite config emits `dist/` directly, not a nested `dist/arcade/wings/` directory. Copy that output here and retain these notices and verification files.

Run from the site root:

```sh
node Games/Wings/verification/solo-check.mjs
```

The regression is bundled from upstream simulation modules, not a replacement simulation. To rebuild it, copy `verification/solo-check.ts` into the upstream `games/wings` directory and run `bun build solo-check.ts --target=node --outfile=solo-check.mjs`.

## Verification and limitations

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
