<!-- maintenance-game: Games/Circuit Ward -->
# Circuit Ward maintenance manual

## Identity and status

Circuit Ward is registered as **222**, category `action`, at `Games/Circuit Ward/index.html`. Catalog tags are `2p` and `coop`; `players` is `1–4`. It is a self-made six-wave arena shooter, not an ingested upstream game. This review uses source `8c8a055813b35bbd5d8b632423328333b4252d43`: entry blob `b9c50b6acc757875880af9958e522b1864917b4e`, game tree `d7490ad1ad3dd6e1d1833da40ba5cc9144dff5f0`, 18 files and 2,842,516 logical bytes. The three supplied vehicle GLBs count toward those bytes but are not loaded or drivable.

The dated Circuit Ward exception in AGENTS authorized this original game for one prior implementation run. It is not permission for new original games, backend signaling, STUN/TURN or vehicle integration. Local imports, fonts and six art requests establish an offline-capable source closure, not a fresh native gameplay pass. This documentation task ran zero browsers and made no runtime changes. Historical native and release evidence is in [the QA report](../../circuit-ward-qa.md); its old catalog counts must not be used as current inventory.

## Implementation map

`index.html` loads `style.css` and module `script.js`. The script imports local `vendor/three.module.js`, `vendor/GLTFLoader.js` and `multiplayer.js`. Loader imports local `BufferGeometryUtils.js`; it is a generic glTF loader, not a local-URI sandbox. `modelNames` explicitly enumerates six files under `models/`, rather than discovering every GLB in the directory.

The simulation is above `boot()` in `script.js` and does not depend on the renderer. Exported `createRun(ids = [0])` normalizes unique integer slots 0–3, creates wave one and seeds the deterministic generator with 222. `stepRun(previous, inputs, seconds)` structured-clones its input and returns a new run, with finite timestep clamped to 0–0.05 seconds. Inputs are a Map keyed by player slot; each input contains `{mx,mz,yaw,pitch,fire}`. `moveBody`, `blocked`, `boxRay`, `coverDistance`, `sphereRay`, `heading` and `shoot` implement authoritative movement and hits. Delivered mesh shape never determines collision.

`wire(run)` removes cooldown, RNG and other private simulation fields. Exported `inspect()` returns a detached frozen snapshot; exported `stats()` returns last-frame draw calls/triangles, frames, six model diagnostics and `primitiveWalls`. Import these only for observation, not production mutations or test cheats. Inside `boot`, `start`, `solo`, `menu`, `pause`, `resume`, `publish` and `refresh` manage run and DOM state. `input(dt)` merges keyboard and touch intents. `frame(now)` is the sole game RAF owner and `draw(now)` consumes snapshots, including client interpolation via `interpolated`.

Useful DOM anchors: `arena`, `hud`, `shield`, `wave`, `score`, `scoreLabel`, `remaining`, `participants`, `crosshair`, `playNote`, `menu`, `lobby`, `matchPanel`, `status`. Pairing owns `signalInput`, `signalOutput`, `roomStatus`, `makeOffer`, `acceptAnswer`, `createAnswer`, `copySignal`, `startCoop`. `showPanel` selects `resumeBtn`, `retryBtn` and `freshSolo` availability. Changes to those IDs require tracing all script callers.

Human coverage here includes complete authored HTML/CSS/script/transport and credits. Vendor review covered loader import/load/parse boundaries, not its full 4,664-line implementation, complete BufferGeometryUtils or the 1.27 MB renderer. Binary meshes were not decoded anew. Historical structural evidence is reused with its limitations, not represented as a complete engine or art review.

## Gameplay and controls

Start solo creates one player; co-op requires a host and one to three ready guests. Walkers award 100 points, drones 150. `spawnWave` limits bots to 24, increasing wave populations with roster size. Shots do 34 damage with a 0.15-second cooldown and unlimited ammunition. Movement speed is 4.5 units/second, constrained to +/-10.6 in X/Z and four cover rectangles. Pitch is limited to +/-1.3 radians. Every second kill may drop a repair cell while fewer than eight exist; collecting one below full health restores up to 25 shield.

Six waves complete the run. Between waves, a 2.4-second wait revives disabled teammates to 100 health. If everyone is disabled the phase is `lost`; clearing wave six produces `won`. Bot attacks use authoritative cover rays, not merely distance. Walkers steer around the four covers with a local tangent heuristic, not a navmesh. Keep that bounded limitation visible when proposing additional obstacles.

WASD or arrows move; mouse pointer lock or IJKL aim; left click/Space fire. P/Escape pause, with Resume button followed by a canvas click to recapture the mouse. The keyboard handler excludes buttons, textareas, inputs and links. Mouse-capture failure presents a readable IJKL fallback. On coarse pointers, `touchMove` supplies normalized movement, `touchAim` supplies drag look and `touchFire` holds fire; capture loss/cancellation clears each pad. `clearInput` runs on blur, visibility loss, pause and state transitions to avoid stuck movement.

Solo/host pause stops simulation. Guest pause only neutralizes that guest's input; the shared match continues. Disabled guests spectate a living teammate. Host retry starts a new epoch and roster run; a client cannot restart the team. Menu closes room connections and resets lobby state. Host disconnection offers fresh solo without carrying team score. No audio subsystem, sound assets, save export, accounts or public matchmaking exists in this source.

## State and persistence

`run` is authoritative only for solo/host; `live` is the render/wire state. A guest stores previous/live snapshots and interpolation timing, not its own simulation. `epoch` prevents stale restart data; sequence counters reject older packets. Remote input expires after 250 ms, becoming neutral. Shot/health Maps track presentation feedback and are cleared by `start`/`menu`.

There are **no localStorage/IndexedDB save keys**. Reload discards progress and pairing. `PeerRoom.close()` clears watchdog/heartbeat, drops channels/connections, aborts listeners, clears pending roster and resets role/counters. `_drop` clears the 15-second peer timer. The host heartbeat broadcasts paused snapshots once per second. Guest watchdog checks every 250 ms and fails after three seconds without host updates in playing/paused states.

Transport API: `PeerRoom` extends EventTarget; public methods are `host`, `hostOffer`, `acceptAnswer`, `joinOffer`, `lock`, `sendInput`, `broadcast`, `close`, with `ids` getter. Events are `change`, `input`, `state`, `leave`, `failure`. `_makePeer` uses `RTCPeerConnection({iceServers: []})`. Host creates `fast` unordered/unreliable and `control` ordered/reliable data channels. This is manual direct peer connectivity, not a server-backed room or guaranteed same-Wi-Fi connection.

`parseSignal` enforces a 32 KiB character/UTF-8 limit and exact `{v,type,session,slot,sdp}` fields. Sessions are 32 lowercase hex characters; slots are 1–3. SDP must start `v=0` and contain `m=application`. Game messages are <=16 KiB, with send buffering <=32 KiB; more than 90 received messages per peer per one-second window disconnects it. Three invalid packets trigger failure. `validateInput` checks normalized movement, finite yaw/pitch and boolean fire. `validateSnapshot` bounds four players, 24 bots and eight cells. Host assigns identity from the connection slot, not payload identity. Normal app sends occur at roughly **20 Hz** via the 50 ms frame gate; public send/broadcast APIs additionally enforce 40 ms minimum spacing. These checks constrain RPC data; they do not authenticate an untrusted host or establish competitive anti-cheat.

## Dependencies and provenance

[Original game evidence](../../circuit-ward-sources.md) identifies primitive build `0a9a6b9`, transport `14ce629`, and later QA corrections. Library source is <https://github.com/mrdoob/three.js>, r160 peeled revision `d04539a76736ff500cae883d6a38b3dd8643c548`; full MIT notice remains at `Games/Circuit Ward/vendor/LICENSE`. Core is pinned; loader/helper imports were rewritten locally. MIT covers the renderer, not an invented blanket game/art license.

[Six-model evidence](../../circuit-ward-models.md) records 691,300 art bytes and 5,692 triangles. Original delivery/publication permission is scoped; embedded creator or CC0 assertions are not independently verified licenses. [Vehicle delivery](../../circuit-ward-vehicle-delivery.md) records another 660,120 bytes and 5,312 triangles with separate pending rights/concept gates. Missing indices caused strict auditor rejection for those non-indexed meshes; that is not a glTF-invalidity claim. Vehicle names are absent from `modelNames`, so a delivery is not implementation. Keep original bytes/notices immutable. Shared Bungee and Atkinson fonts are locally referenced from `assets/fonts/`; their provenance is separate from MIT.

## Audit findings

- **MEDIUM CW-01:** `script.js`, `frame`/`draw` and `boot` lifecycle. RAF rendering continues during lobby/pause and has no explicit unload cancel/dispose handler. Browser teardown normally ends it, but idle battery use and future same-document mounting are not addressed. Minimal fix: own the RAF ID, cancel/dispose once on teardown, and render on state changes or a reduced idle cadence where safe. Do not start a second loop on retry. Native repro: compare frame counts/CPU during 30 seconds paused, then mount/unmount only if the shell actually supports that lifecycle.
- **HIGH CW-02:** `script.js`, `webglcontextlost` handler versus `solo`/`start`. Loss sets `webgl=false` and disables Resume/Retry, but Menu can expose still-enabled Start solo/Host/Join. A fresh simulation can start with rendering permanently stopped. Minimal root fix: gate all start/resume paths on graphics readiness and retain a reload/return action, rather than only disabling two panel buttons. Recommended native repro: lose context with the WebGL extension, open Menu, activate Start solo, observe unchanged render frames while simulation advances. This repro was not run here.
- **MEDIUM CW-03, rights hold:** `models/cv-*.glb`, `CREDITS.md` pending sections. Delivered vehicle rights/concept mismatch remain unresolved; accidental loader-list expansion would publish an unapproved feature/asset use. Minimal fix is an approval/provenance gate, not art edits or deleting evidence.

No finding is raised merely because vendor code contains HTTP reference strings or generic loader APIs. No unsafe DOM sink was found in the reviewed authored UI: pairing/error text uses textContent/textarea values. Static transport validation is useful, but actual two-device browser/ICE behavior remains a separate acceptance step.

## Safe iteration

Patch simulation in the pure functions and leave `wire`/validators consistent with every added field. Add a regression to existing Circuit checks for changed branches. Change pads through `pad`/`clearInput`, not duplicated event handlers. Modify pooling presentation in `loadModels`/`modelPart` without changing source GLBs or collision to match a decorative mesh. Keep primitive fallback warnings visible. Any new obstacle needs both movement and ray coverage, with the tangent-steering ceiling reconsidered.

Keep co-op serverless, offline solo intact and `/bare/*` disabled. Do not edit compiled renderer bytes. Revert an authored milestone by an explicit revert commit; do not reset shared history. No save migration is needed today because no save feature exists; adding persistence requires a separately approved schema and validation design.

## Verification

Actually run in delegation 60: all 20 JavaScript blobs across the three assigned games passed `node --input-type=module --check` via Git STDIN, and current catalog parse confirmed 115 entries with ids 222/224. No native test or screenshot was produced. Final document assertions and scoped diff checks are recorded in [3D audit](../audits/3d.md).

Recommended, not executed here: Main alone obtains a narrow game lease, then runs existing `scripts/test_circuit_ward.py`, `scripts/test_circuit_ward_models.py` and transport checks as available after inspecting their current arguments. Exercise keyboard and simultaneous touch move/aim/fire, all six waves, failure/retry, blocked model loading, WebGL loss, host/guest pause and stale input. Pair actual devices manually; test timeout/wrong answer and host exit. Review desktop/mobile screenshots independently. No targeted test substitutes for Main's unchanged full `xvfb-run python3 scripts/smoke_test_games.py` release gate.

## Future outlook

First fix/test the context-loss action gap; then measure paused rendering and co-op behavior on actual target devices. Preserve the present finite FPS identity and simple cover arena. Vehicle driving/merges/abilities require separate concept, rights, simulation and RPC review; supplied meshes alone clear none of them. N100 8 GB/64 GB remains a provisional target, not measured 60 FPS proof. Four rendered concepts and later native screenshots are different evidence classes. No automatic monthly build, registration, publish or push is promised.
