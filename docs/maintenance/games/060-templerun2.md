<!-- maintenance-game: Games/TempleRun2 -->
# Temple Run 2 maintenance

## Identity and status

Registered id **60**, category `action`; entry `Games/TempleRun2/index.html`. Baseline `8c8a055`, entry `9c0ecff68b737179d8e1fdf1b4479e5af2f9cefd`, tree `c2cee5137d5a750c87ebd5078bb54d12ab83132e`. The 120 files total 26,868,963 bytes. This is an existing Babylon.js endless-runner concept build; neither native verification nor a new port was performed here.

## Implementation map

The complete entry installs XHR/fetch host-routing hooks, displays `#loader`, loads `poki-noop.js`, then defers `bundle_original.js`. The compiled app appends its own canvas/UI. A 250 ms interval hides the loader upon any canvas appearing or after `tries++ > 120`; this is not a first-frame callback despite the nearby comment.

`poki-noop.js` defines init/initWithVideoHB, loading/lifecycle, commercial/rewarded breaks and leaderboard surfaces. Commercial breaks resolve; rewarded breaks resolve false; leaderboards resolve null. `772.bundle_original.js` registers a webpack CSS/sprite chunk using root hashed `.webp` assets. The main webpack public path derives from its script URL. Selected engine setup sets Draco URLs to local `assets/babylonjs/draco_wasm_wrapper_gltf.js`, `draco_decoder_gltf.wasm` and `draco_decoder_gltf.js`.

Source review coverage: complete entry, global CSS, no-op SDK and 772 chunk; selected bundle asset, storage, loader and SDK anchors. The 15,348,548-byte bundle, Babylon/React/Svelte vendors and Draco bridge were not fully human-reviewed; models/textures/audio were not inspected as gameplay or rights evidence.

## Gameplay and controls

The loading hint states swipe/drag to turn, jump and slide, with desktop arrow keys. That is wrapper guidance, not a complete traced key map. Engine excerpts show run score/distance/coins, tutorial events and death-message state. Original menus and death/continue flows remain compiled. No authored restart button exists. Preserve false rewarded-break results; a no-op SDK must not grant ad rewards. Native verification must distinguish automatic running/animation from input-driven turns or jumps.

## State and persistence

Bundle line 162848 sets **`TR2_GAME_STATE`**. Bootstrap reads it through `LocalStore.getItem`, calls `JSON.parse`, reconstructs stats/flags/leaderboards/abilities/daily challenges, and resets `currentRunData`. Saves omit transient run/day state and serialize challenge maps. `LocalStore` catches only access capability detection, then reads/writes localStorage directly or falls back to a path-root cookie. Corrupt JSON and quota/write denial have no protection at these selected boundaries. The wrapper interval clears itself but does not report failure.

## Dependencies and provenance

Entry comments claim `https://github.com/deploythings123123123/seraph`, abbreviated `ae2fcc6`, `games/templerun2`. This is mirror acquisition evidence, not game/assets permission or an independently verified upstream revision. No game license was established. Local fonts in `global.css` are dependencies whose terms also need evidence.

The guard matches selected absolute HTTP(S) hosts; it excludes arbitrary hosts, protocol-relative URLs, script/image/worker transports and patterns such as Poki hosts not matching `poki.com`. The comment's unconditional offline guarantee exceeds what the hook proves. Babylon default URL strings are not automatically active loads; selected actual Draco configuration is local.

## Audit findings

- **HIGH, save crash risk:** `bundle_original.js`, `LocalStore.getItem(t.STORAGE_GAME_STATE_KEY)` followed by `JSON.parse` around line 162983. Invalid saved JSON can abort state construction. Minimal root fix is validated restore with recoverable backup/default state at the save boundary; denied writes need safe reporting too. Static risk, not a browser repro.
- **MEDIUM, false readiness:** `index.html`, `document.querySelector("canvas") || tries++ > 120`. It hides loading on canvas existence/time expiry even if initialization fails. Use an actual game-ready signal and visible timeout/error.
- **HIGH, conditional offline coverage:** entry `var external`/XHR open override. Denylist and two transports do not prove egress closure. Trace actual game paths and enforce same-origin dependency policy without breaking local WASM/workers.
- **MEDIUM, accessibility:** zoom restriction and spinner without reduced-motion handling. Minimal shell fix; do not recolor upstream art.
- **HIGH, rights hold:** unverified game/model/font terms. Source mirror does not provide clearance.

## Safe iteration

Keep no-op SDK signatures and reward semantics stable. Prefer entry/SDK error handling; bundle save defects require maintainable source or a narrowly reviewed boundary patch, not broad compiled edits. Back up `TR2_GAME_STATE` and retain its schema/URL through rollback. Never activate remote SDKs to make revive work.

## Verification

Actually run: Git tree/resource inspection and stdin parser checks on main bundle, 772 chunk, no-op SDK and both entry scripts, passed. Native runs **0**, screenshots **0**. Reproduce: `git show HEAD:Games/TempleRun2/poki-noop.js | node --check`.

Recommended Main-approved HTTP lease: fresh/corrupt/denied-storage profiles, tutorial and genuine turn/jump/slide, death/restart, no-reward continue, reload progression, audio unlock, mobile orientation and hardware FPS. Capture every request with remote access blocked. Main's serial full loading gate remains independent.

## Future outlook

Rights and save recovery first; real readiness/error UI second. Month checkpoints should prove offline input and death/replay before performance tuning. Local Draco closure, N100 frame/memory measurements and save compatibility are prerequisites for any 3D refurbishment. New models or third-party SDK services are deferred.
