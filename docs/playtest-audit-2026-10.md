# Interactive playtest audit, October 2026

Audit date: 2026-10-07  
Branch: `feat/oct-audit`  
Base: `58bdeb7`  
Games audited: ids 221 through 226  
Games added: none  
Screenshots: `/tmp/audit-shots2/`

## Pre-flight and method

- Root free space was 2.3 GB, above the 2 GB stop threshold.
- The existing `http://localhost:8899` server returned HTTP 200 for `index.html`.
- Browser audits ran serially. No Chromium process was present before or after each worker run.
- Playwright used `/usr/bin/chromium`. Ids 222, 224, 225 and 226 used SwiftShader flags: `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`.
- Navigation used `domcontentloaded` inside a 15 second `asyncio.wait_for`.
- The requested `docs/SWARM_STANDARD_v2.md` was not present in this checkout. Repository quality and maintenance rules were followed directly.

## Per-game verdicts

### 221 Balatro: PASS with provenance correction

- Real EmulatorJS input reached playable Balatro ROM state after mapped Enter, arrows, Z, X and Shift input. The observed HUD showed score 0, hand 4, discard 4, ante 1/8, round 0 and deck 52/52.
- The real EmulatorJS Restart control returned to the ROM disclaimer screen.
- No page errors, failed requests or HTTP errors. Console output was limited to expected audio autoplay warnings, an EmulatorJS version log and Chromium GPU stall warnings.
- `EJS_cheats` was absent. Static authored-file checks found no em dash, Comic Sans, emoji or overlay gradients.
- Defect fixed: `CREDITS.md` claimed an incorrect ROM SHA-256 prefix and overstated local MIT evidence. The full local digest and owner-verification limitation are now recorded.
- Fix commit: `153eb6f fix: correct Balatro ROM provenance hash`.
- Rights hold remains: upstream LICENSE and complete pinned source evidence are not vendored.

Screenshots: `221-initial.png`, `221-after-input.png`, `221-after-restart.png`.

### 222 Circuit Ward: FAIL, normal play passes but context-loss recovery is broken

- Real Start Solo input worked. After 26.04 seconds of WASD, IJKL and Space input, score changed 0 to 700, shield changed 100 to 92, wave 1 cleared and wave 2 spawned.
- Pause/resume, retry, menu and unpaired co-op offer/answer UI worked. No normal page, console or request errors.
- Confirmed high-severity defect CW-02: after forced WebGL context loss, Menu still permits Start Solo. Starting again advances the simulation while render frames remain frozen, leaving a blank arena and hiding the recovery state.
- No source fix was made because this is a cross-lifecycle graphics failure requiring a guarded start/resume path, maintenance update and regression. It is documented in the existing Circuit Ward manual and remains open.
- No commit.

Screenshots: `222-initial.png`, `222-after-solo-input.png`, `222-wave-2.png`, `222-restarted.png`, `222-coop-host.png`, `222-coop-join.png`, `222-context-loss-restart.png`.

### 223 Tag Relay: PASS

- Clicked Start match and sent real WASD and IJKL input to the same focused canvas. Red moved from `(0,0)` to `(1,0)` and Blue from `(11,8)` to `(11,7)`.
- Timer changed during play. Blue scored after approximately 14 seconds, advancing from Arena 1 to Arena 2.
- Pause froze timers and Resume restored them. Restart reset Arena 1, both scores, and positions.
- No console, page or request errors. No external runtime requests or hygiene violations.
- No commit.

Screenshots: `223-initial.png`, `223-after-input.png`, `223-restart.png`.

### 224 Spline Ride: PASS

- Real Play ran for 25.038 seconds. Progress reached 25.199 percent and one completed lap; frames increased from 18 to 371 and the Ride camera changed.
- Real View switching changed between Ride and Orbit. A real orbit drag changed the Orbit camera.
- Space pause held progress steady. Restart returned to paused Orbit, zero progress and zero laps.
- No console, page, request or HTTP errors. SwiftShader rendered successfully. Authored hygiene and syntax checks passed.
- No commit.

Screenshots: `224-initial.png`, `224-after-play.png`, `224-orbit.png`, `224-restart.png`.

### 225 Slipstream Borough: Police Chase (Preview): PASS for scoped driving

- Real City start and Help flow worked.
- Held W produced forward motion at 31 km/h with position change. Held S produced actual reverse motion at signed speed -6 m/s and HUD `R 22 km/h`; forward input then braked out of reverse.
- Pause froze the simulation. Resume worked. Park banked 51 m and 16 cash. Restart reset position, speed and distance. Reset cancellation and confirmation worked.
- No console, page, request or HTTP errors. Authored syntax and hygiene checks passed.
- Low visual caution: a reset status strip overlaps the upper garage panel on desktop, but the Start control remained reachable and functional. Slow software rendering is not hardware performance evidence.
- No commit.

Screenshots: `225-initial.png`, `225-city-forward.png`, `225-city-reverse.png`, `225-restart.png`.

### 226 Foldwild: Open-World RPG (Preview): PASS for scoped expedition movement

- Started a new expedition with real controls, selected Pithnip and entered seed 22601. Three local GLBs loaded.
- Real WASD movement for 10.24 seconds moved the player from `(0,16)` to `(4.4,10.2008)`. The camera and rendered village scene changed. Foldwild has no minimap; scene movement was the verified state change. Region remained Rootfold Meadow.
- New expedition, reset cancellation, replace-saved-run and reload/Continue paths preserved valid state.
- Exactly one 404 was observed: `GET http://localhost:8899/favicon.ico`, initiated by the browser at the root origin. It is a benign automatic favicon request, not a missing game asset. No generated-model reference was present, so `Games/_foldwild_models` was not materialized.
- No page exceptions or failed transport requests. Two nonfatal pinned-three.js WebGL 1 deprecation warnings were observed.
- No commit. Existing M2, campaign, rights and device acceptance holds remain.

Screenshots: `226-initial.png`, `226-expedition.png`, `226-after-walk.png`, `226-restart-or-menu.png`.

## Portal cross-check

A serial localhost portal browser pass verified all six cards by title. Every card was visible, had a non-empty 292 x 146 thumbnail containing an SVG or image, and exposed a visible Play control. The real Tag Relay Play control opened an iframe with `Games/Tag Relay/index.html`. The only portal console message was the browser warning that the iframe `allow` attribute takes precedence over `allowfullscreen`; there were no page errors or failed requests.

Evidence: `portal-six-light.png`, `portal-tag-relay-player.png`.

## Commits

- `153eb6f` `fix: correct Balatro ROM provenance hash`
- `bb3cdc6` `docs: refresh Balatro audit provenance`

The documentation commit updated the Balatro maintenance manual and refreshed `docs/maintenance/inventory.json` after the source correction.

## Verification and limits

- `python3 -B scripts/check_maintenance_docs.py`: PASS, 122 game documents cover 117 registered and 5 unregistered games.
- Catalog validation: 117 entries, unique ids, all six audited URLs tracked and present.
- `node --check assets/portal-ux.js`: PASS.
- `git diff --check`: PASS.
- The unchanged full registered-catalog smoke gate was not run. This was a six-game audit with no push or release request, and no release claim is made.
- Final screenshot directory size was approximately 3.1 MB. No dependencies, broad sparse checkout or generated Foldwild models were added.
- Final repository status is clean. No push was performed.
