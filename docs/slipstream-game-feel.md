# Slipstream Borough feel and chase repair

## Durable brief and scope

Continue the existing catalog225 game: faster responsive stock cars, police safely behind, varied connected routes and intuitive fluid chasing. Basic movement must work without unlocks, missions or rewards. Preserve saves, progression, original assets and source attribution. No new game, install, external runtime load, broad checkout or independent push. One core integrator owns `core.js`; bounded workers own disjoint map/view and controller/test paths. Reviewed commits go to sole main integrator74, not a whole mixed-history merge.

Acceptance: compare the same stock car/scene before and after; test 30/60/120Hz simulation, rear spawn dot-product/clearance, collision/restart and map connectivity. Actual normal-input capture is distinct from simulation proofs. Preserve failures and hardware/render limits. Core source must freeze before the one explicitly admitted browser attempt.

## Implementation and source review

Base: `d3dbb39e`. Worker source commits: `3ceeb27bdd00ff2d5017ef612c1e8a3f417d54dc` (controller/copy/input/native harness), `8355e04e4c1eb1eada45843c28a139366ea29cd5` (world/view/topology/geometry). Both actual dispatcher calls requested unchanged `openai-codex/gpt-6.1-sol`, xhigh. First two dispatches were interrupted with empty output and no surviving processes/changes; retries completed and were reviewed via Git. No other models were selected.

- Stock effective speed multiplies the existing fleet rating by1.25; acceleration by1.5. Engine upgrades retain their existing relative gains. Shared fleet/model/vendor bytes and save schema remain unchanged. City uses midpoint signed travel/heading, speed-progressive bounded corner slip, stronger bounded yaw and24m/s² forward braking. This is a quasi-steady arcade slip model, not inertial tire physics or a new drift system. Reverse remains capped6m/s; release/countersteer has no recovery timer.
- City digital steering now ramps11/s at rest to7/s at25m/s, immediate release/reversal; Sandbox remains visit-only tuning. Existing keyboard/touch, pause, hidden-tab, storage and restart guards remain.
- Rear city spawn candidates are60–110m away, at least40m behind heading/velocity direction, clear of buildings/borders and12m from other vehicles. Reverse uses reversed travel direction. If no safe rear road exists, pursuit defers rather than spawning ahead or overlapping. Rear separation normally places the cop behind the chase view; off-screen placement is not a viewport-aware guarantee. Police navigate the same connected map, approach physically and brake; highway cops no longer clamp their position near the player. Fictional EMP/smoke speed effects remain bounded arcade mechanics, not tire realism.
- Four static service cuts replace four solid blocks with paired low/high buildings. The city has40 collision-aligned parcels and61 connected route nodes. Each cut halves its former100m junction detour to50m with8m usable center clearance after radius inflation. All original junctions, traffic circuits and start remain connected. Fixed deterministic topology, not fresh per-run maps. Contrasting paving/roof silhouettes mark the actual paths. Architecture46,070triangles plus2,744crosswalk triangles; service paving adds48triangles.
- Camera response is faster, with bounded speed anticipation/height and wrap-safe damping. Physical cockpit, reduced motion, post-smoothing building obstruction and resource ownership remain. No shake, blur, roll or dynamic FOV. Help/HUD changes are text only, not a layout overhaul.

## Measured before and after

Same unupgraded Bricklet, empty city Sandbox, four seconds held gas:

| timestep | baseline speed m/s | new speed km/h | new distance m |
| --- | ---: | ---: | ---: |
|30Hz|19.1407742065|105.470|59.0630|
|60Hz|19.1389053302|105.459|59.0572|
|120Hz|19.1379710756|105.454|59.0543|

At60Hz this is68.900→105.459km/h after4s (+53.1%); top speed90→112.5km/h (+25%). Across the new rates speed spread<.01m/s and distance spread<.02m. Baseline cop at origin/north heading spawned beside the player near(-50,0), not behind. Final source regression covers196 safe rear spawns and60 safe boundary deferrals across256 pose/heading/signed-speed cases, including slow reverse. Post-native source review removed a1m/s reverse-direction threshold: any actual negative velocity now selects the rear in its direction of travel. Boundary driving may still damage the car; the test compares an unchased reference to distinguish boundary impact from cheap police contact.

## Runnable checks and real limits

Use `node --experimental-default-type=module scripts/test_slipstream_<name>.mjs` for `feel`, `core`, `world`, `traffic`, `pursuit`, `steering`, `reverse_sandbox`, `variety`, `input`, `clock`, `map`, `city_render`.

All12 suites passed before native admission, including15core/10world/5traffic/6pursuit groups, all16/upgrades0..5 steering and reverse/Sandbox. Source/controller/geometry tests are synthetic, not native or naturally earned progression. Core deterministic highway controller: `STATS starter race 40.50s place=1 hp=100 cash=844; escape 40.50s hp=100 cash=654`. Syntax, harness AST and `git diff --check` pass. No check was weakened: exact low-speed yaw expectations were updated from .05 to .065 and midpoint speed because the intended steering model changed; collision/security/payout assertions remain.

Initial integration caught a real highway containment regression after removing positional clamps; the cop could overshoot and wait beyond arrest range. Approach-speed braking now occurs before acceleration/integration; original containment test passes without restoring teleportation. Initial new rear-spawn test incorrectly required full HP while a fixture drove outward at a finite corner; it now compares the identical unchased physical reference and preserves spawn clearance/zero-arrest assertions.

A bounded local HTTP server served `index.html`, `core.js`, `script.js`, `world.js`, `view.js`:5/5 HTTP200, byte-identical to disk, then server closed. This is actual served-entry/source proof, not WebGL acceptance. The one admitted native harness is `python3 -B scripts/test_slipstream_feel_browser.py`, explicit system Chromium,110s outer deadline, ordinary keyboard/held touch, no grants or injected stepping, capture budget300KB. The one real attempt at frozen `13f5270c9f162dace125846ec7159c6f360e60dc` failed: garage/render readiness succeeded, then ordinary Start click timed out20s while performing the action. Exit1,40.1116s, errors[], observations[],0captures; source unchanged. No gameplay/touch/feel acceptance, no renderer retry. Server port closed, no remaining Chromium/new Playwright profile directories, driver exited; lease released. [Raw relative-path result](slipstream-feel-evidence/native-result.json), [frozen manifest](slipstream-feel-evidence/frozen-manifest.json), [cleanup](slipstream-feel-evidence/native-cleanup.json). The later slow-reverse sign correction is source-tested only, not browser-tested. The root cause of the click stall is unproven; no check/deadline/GL flags were changed to hide it.

No full-fleet gate or push: not a release order. Physical-phone/GPU performance, complete natural city escape, whole-campaign balance and all earned equipment remain separate holds. Sole integrator records source→integrated SHA mapping and local/pushed/deployed/native status. Main integration is not performed by this isolated branch.
