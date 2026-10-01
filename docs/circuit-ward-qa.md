# Circuit Ward implementation / QA — 2026-10-01

## Scope and milestones

This implementation **adds one original game**, Circuit Ward, catalog **id 222**.
It uses only the dated one-run exception approved in ticket
`pi-912882-1790827041648`; it does not relax the normal ingestion-only rule.
No other game was added, registered, edited or deleted in this implementation
milestone. The earlier unregistered 2048/Hextris candidates remain deferred.

- Approval/exception: `b15c1c0`.
- Pinned three.js dependency: `e02d5d8`.
- Native peer transport: `14ce629`.
- **Primitive game build: `0a9a6b9`.**
- Pairing, shell contrast, camera interpolation, paused heartbeat and runnable
  regression: `77dbd71`.
- **Registration: the commit adding this note and id 222 to `games.json`.**

All three CLI workers actually used `openai-codex / gpt-6.1-sol`, within their
10/15/20-minute bounds. The orchestrator used the same provider/model. The failed
`opencode-go` tool invocations made no implementation changes; no substitute
model was used. Sources/licenses are in [circuit-ward-sources.md](circuit-ward-sources.md).
No generated GLBs were supplied. Primitive implementation does not wait on them.

## Implemented behavior

Six bot waves, unlimited-pulse blaster, shield, pooled co-op score, repair cells,
explicit win/loss, retry/menu, WASD/arrows, mouse aim, IJKL aim/Space fire, and
left-move/right-aim/Fire touch controls. Disabled teammates spectate until the
next cleared wave; all disabled loses. Friendly fire is off.

Solo needs no external runtime service. Three.js, fonts and favicon are local.
Optional 2–4-player co-op uses a browser-host star with manually exchanged full
WebRTC offer/answer descriptions and `iceServers: []`. There is no STUN/TURN
server, proxy, signaling backend, account, relay, host migration or mid-run join.
Input intents and snapshots are bounded/validated; clients cannot submit trusted
positions, damage or scores. Fresh solo resets team state rather than carrying
pooled score forward. Offers expire after 15 seconds; load all devices first.

The renderer uses shared instanced primitives, no shadows/postprocessing,
DPR 1 and a 1280×720 drawing-buffer cap. A paused-host 1Hz backup sends the last
validated snapshot independently of render frames; visible gameplay still uses
20Hz networking. Closing a room clears its timers/connections.

## Checks actually run

```sh
node --check 'Games/Circuit Ward/script.js'
node --check 'Games/Circuit Ward/multiplayer.js'
node --check 'Games/Circuit Ward/vendor/three.module.js'
python3 scripts/test_circuit_ward.py
xvfb-run python3 scripts/smoke_test_games.py
```

Syntax/checksums and current authored diff checks returned zero. The unmodified
upstream module's existing whitespace warning remains documented in the source
note, not silently removed.

Latest targeted regression **exit 0**:

```text
Circuit Ward browser checks passed: solo controls/reset, win/lose/repair/friendly-fire, keyboard/touch aiming, touch movement/fire, 320/390 layouts, four-peer sync/input/pause/departure/fallback, paused transport heartbeat
```

- Real Chromium gameplay: observable movement, keyboard aim/fire, native touch
  movement/aim/fire, pause and reset; no horizontal overflow or targets below 44px.
- Pure exported simulation: win/loss, scoring (100), repair (50→75), teammate
  revive/wave progression and friendly-fire immunity. These are simulation
  assertions, **not a recorded natural six-wave play-through**.
- Four real browser contexts: full UI offer/answer pairing, roster sync, guest
  input reaching host, client-only pause, shared host pause, guest departure and
  fresh-solo/menu fallback. A separate native transport fixture receives nonzero
  pooled score and repeated paused heartbeats for four seconds with no frame
  producer broadcasting after the initial snapshot.
- Browser watchers recorded no console errors, failed/4xx asset requests or
  third-party HTTP(S) runtime requests. Authored runtime endpoint scan found only
  `RTCPeerConnection({ iceServers: [] })`.
- A sampled solo scene used **11 draw calls / 1,672 triangles**. This is not a
  maximum-wave benchmark or evidence of 60fps on target hardware.
- 121 unique catalog ids, required fields and Git-tracked URLs passed. This does
  **not** mean all 121 URLs exist in this sparse working tree.

Earlier Promise-returning Playwright wait predicates could pass too early.
They were replaced with synchronous predicates over a test-only module handle;
only the corrected final run is accepted. Everyone's shaders are loaded before
starting the deliberately short pairing deadline.

Five actual desktop/mobile/menu/combat/co-op-pause screenshots were inspected.
The final UI uses the approved local fonts, ink panels, flat controls and 6px/4px
radius hierarchy. They are primitive gameplay captures, unlike the concept art.

Evidence retained outside Git: `circuit-workers/game-regression.log`,
`circuit-workers/{vendor,network,engine}.log`, `circuit-workers/full-gate.log`,
and the five PNGs in `circuit-ward-qa` under the temporary workspace.
Game payload is approximately 1.3MiB; combined retained review/art/worker/game
workspaces remain below the operator's 30MB cap. No dependencies were installed.

## Release blockers / limitations

The unchanged mandatory full gate **exited 1**:

```text
ok   Circuit Ward                 console_errors=0 failed_reqs=0
== 1/121 games pass ==
```

The other 120 entries fail because sparse-excluded game files/assets are absent
locally (for example `index.html`, Run3 engine, Unity loaders and Balatro loader).
This does not establish deployed-site breakage, and it does not waive the gate.
An asset-capable QA environment is needed before release. **Nothing was pushed;
separate operator push permission is still required.**

Separate-device LAN/school-Wi-Fi compatibility, school Chromebook FPS, maximum
wave render budgets, explicit WebGL1-only runtime, and a natural complete
play-through remain unverified. Wi-Fi isolation/mDNS/firewalls may prevent P2P;
solo is the fallback, not a claimed universal LAN connection.

Real hidden-tab timer throttling is also unverified: headless and xvfb/headed
new-page activation left `document.hidden` false, and minimizing through CDP did
not hide the window in this environment. These attempts were not counted as
passes. Help ticket `pi-912882-1790834673149` is pending. The independent paused
heartbeat fixture verifies transport behavior without render broadcasts, not
actual background-browser scheduling.
