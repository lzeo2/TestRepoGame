# TAG source search: delegation 22

## Scope and result

Mechanical source/license search only, on `feat/overnight-games`. Active environment fields were `PI_PROVIDER=openai-codex` and `PI_MODEL=gpt-6.1-sol`. Read `AGENTS.md` and `docs/CODE_QUALITY.md`. No game, catalog, portal, branch, backend, or dependency installation changes.

**Best bounded port candidate: Sprig `2Ptag` by Shadow8928.** Its actual game code has local two-player keyboard input and a working-by-inspection capture/winner path. A small, already-published standalone MIT engine exists; this does not require rebuilding or reimplementing Sprig. Start, score/progress, touch, and restart wrappers are still needed. No browser gameplay was tested, and this is not a release approval. Main owns selection, UI review, implementation, and any fallback decision. The real search found reusable sources, so it does not establish a need for an original fallback.

At catalog inspection: `catalog entries: 113`, `id 223 present: False`; unique-ID assertion passed. This is only an observation, not a reservation or registration.

## Verified candidates

All three files below were downloaded at commit **`1450c00a43c5ec09d2c4a8971763226ab447829f`**, obtained from the GitHub commits API, and read in full. Their repository [actual LICENSE](https://github.com/hackclub/sprig/blob/1450c00a43c5ec09d2c4a8971763226ab447829f/LICENSE) says **MIT License, Copyright (c) 2023 Hack Club** and includes the permission grant and notice-retention condition. Preserve that license and each game's author header. Author names below come from the game files, not inference from repository ownership.

### 1. 2Ptag: preferred low-cost candidate

- [Pinned game source](https://github.com/hackclub/sprig/blob/1450c00a43c5ec09d2c4a8971763226ab447829f/games/2Ptag.js), 3,391 bytes; `@author: Shadow8928`, `@addedOn: 2025-01-03`.
- Actual loop: one 6-by-5 arena; P1 uses WASD, P2 IJKL. Each movement handler checks matching player coordinates. The moving player wins the capture, sets `turn = 3`, and stores `end = 1` or `2`. `afterInput` displays `Player 1 Wins!` or `Player 2 Wins!`. Movement then stops. No animation/timer-driven game logic, chase AI, online play, obstacles, round timer, or accumulated score.
- Starts immediately on `setMap`; no start menu, touch controls, restart handler, or numeric score. Wrapper must provide start, two-player touch controls, restart/reset and visible progress/result. Preserve the upstream first-capture rule rather than claiming a timed survival game. A displayed round result/point can reflect the existing winner, but cumulative matches would be an added rule.
- Port defect: `pl1 = getFirst(player)` and `pl2 = getFirst(player1)` are undeclared assignments. Declare them before placing the code in a strict ES-module/function wrapper. Winner text is appended on every later input; suppress repeated end-state updates or clear before replacing it.
- All four bitmap assets and both tunes are inline in the licensed file. Both tunes contain only a 16,000-ms duration, no notes. No separate remote images, audio, fonts, imports, fetches or sockets in the game source. No separate asset exception/credit is present in this file; asset authorship beyond its author header was not independently established.
- Cost: small game-preserving wrapper/defect patches plus vendored standalone engine below. No whole-engine rewrite is justified.

### 2. 2 Player Tag Game: richer match rules, more repair

- [Pinned game source](https://github.com/hackclub/sprig/blob/1450c00a43c5ec09d2c4a8971763226ab447829f/games/2-Player-Tag.js), 9,480 bytes; `@author: Leo B`, `@addedOn: 2025-11-04`.
- Actual loop: red WASD chases blue IJKL. Shared tile awards red a point; timeout awards blue a point. Scores are displayed; first to seven shows `Red Wins!` or `Blue Wins!`. Fourteen inline arena layouts; transitions advance `level`. Inline square-player/wall/background bitmaps and synthesized tunes, with no separate asset loads or asset-license exception in the file.
- Starts immediately, no touch or match restart. Timer is **tick counting in `setInterval(..., 1)`**, not elapsed seconds: `time >= 700` ends a round and `waitTime >= 500` advances it. Browser timer clamping therefore changes duration; do not advertise a verified seven-second round.
- Significant static defects: timer continues after match completion; text is appended every tick without routine clearing; movement calls `canMove` on the missing player sprite before testing `gameActive` after winner `setMap(end)`; no final restart/reset. `canMove` supplies wall collision since only wall sprites are declared solid. Needed work is game-lifecycle/timing repair plus start/touch/restart wrappers, not merely shell styling.
- Cost: moderate bounded repairs, more risk than candidate 1. Browser testing must specifically cover scoring, both winners, round changes, post-win keys, text growth, and reset.

### 3. Tag: alternate-role chase, no match winner

- [Pinned game source](https://github.com/hackclub/sprig/blob/1450c00a43c5ec09d2c4a8971763226ab447829f/games/Tag.js), 6,662 bytes; `@author: ThomasJPrice`, `@addedOn: 2024-07-29`.
- Actual loop: WASD/IJKL players; six inline obstacle arenas. `level % 2` alternates who is IT. Contact displays `TAG!`, plays an inline tune, then schedules the next map after one second. Final arena prints `Thank you!` and increments level. There is **no numeric score, declared match winner, timer limit, or restart**; do not invent an upstream win claim. Level number can expose existing progress.
- Inline bitmaps/tune; no remote runtime call. A tutorial URL is a source comment, not a runtime request. Root MIT is the available grant; no separate asset exception appears in the game file.
- Repair risks: inputs are not locked during delayed transitions, allowing multiple transition timers. Moving-box timers clear tiles and can erase players; respawn catches may compensate rather than prevent that. The occupancy expression uses `tilesWith(player1, player2)` (tiles containing both players), then treats returned tile arrays as coordinate-bearing objects. `options = {...}` assignments require declarations/removal for strict modules. No terminal input lock/reset; pending timers must be cleared on restart.
- Cost: moderate/high relative to candidate 1; preserve six-arena progress rather than fabricate a new match system.

## Standalone runtime closure, not the Sprig website

The pinned repository's [engine package.json](https://github.com/hackclub/sprig/blob/1450c00a43c5ec09d2c4a8971763226ab447829f/engine/package.json) exposes `sprig/web`; it lists only development dependencies. [engine/LICENSE](https://github.com/hackclub/sprig/blob/1450c00a43c5ec09d2c4a8971763226ab447829f/engine/LICENSE) was read and is MIT, Copyright (c) 2023 Hack Club. The current source closure was collected: **12 TypeScript files, 42,110 bytes**, all local imports/exports. Renderer uses Canvas/ImageData; keyboard listens on the canvas; audio is oscillator-based Web Audio. Palette and font bitmap table are inline. No separate font license notice was visible in the inspected font file; retain the package license, and do not claim independently verified font authorship.

A ready-compiled distribution was also actually fetched, without installation:

- [Registry metadata: sprig 1.0.3](https://registry.npmjs.org/sprig/1.0.3).
- [Immutable version tarball](https://registry.npmjs.org/sprig/-/sprig-1.0.3.tgz), **65,236 bytes**, matching registry SHA-1 `0f91216c13232878e3a0add579dac16ee344fab0`.
- Published `gitHead`: **`f2e175fba0020c8a6db964aaf884dc1f1365e26f`**, distinct from the pinned game revision. Package's actual LICENSE was read: MIT, Hack Club 2023. Do not misattribute the compiled engine to the newer game commit.
- Compiled closure: **12 JavaScript files, 41,260 bytes** under `dist/`. All import/export dependencies are relative; mechanical scan found zero fetch/socket/eval/new-Function findings. Actual `dist/web/index.js` was read: exposes `webEngine(canvas)`, API, state and cleanup; cleanup cancels animation, keyboard listener and tunes. Game/package compatibility is still untested.
- A static port can vendor those small modules and bind the game to `webEngine`'s API in authored source, without `eval` or `new Function`. No CDN, npm runtime, Sprig editor, accounts, Astro/Svelte, Babel, signaling, or external font is necessary. The website runner uses Babel/new-Function and editor state; **do not vendor that runner**.
- Focusable responsive canvas, start-gesture audio, two independent 44px touch pads, visible focus, house-flat shell, and cleanup on reset remain port/review work. Dispatch to the existing eight-key input path rather than recreate tile physics. Candidate 2/3 timers require separate game timer cleanup; engine cleanup alone does not own those timers.

## Real search and rejected leads

GitHub repository searches returned HTTP 200 for `tag game javascript license:mit`, `tag game js13k` (zero results), `chase game multiplayer javascript license:mit`, `tag game "two player"`, `tag game "local multiplayer"`, `js13k chase`, and `tag game javascript`. Sprig's games directory was fetched through the API (HTTP 200, 792,961 bytes); it revealed the exact three files above. Broad `tag in:name language:JavaScript license:mit` mostly returned unrelated tagging UI libraries, not game evidence.

Actual additional source checks, not README-only guesses:

- [Coffee Chaser](https://github.com/js13kGames/coffee-chaser/tree/c5be9eec726aee6b087b31578297d2dae45f4ddf), pinned `c5be9eec726aee6b087b31578297d2dae45f4ddf`. Read complete `index.html` and `index.js`; repository description credits `@szahn`. Single-player auto-jumping platform collector, left/right keys, token count and cycling levels, not local tag. HTML loads local JS; JS constructs three local PNG and two MP3 paths. Top-level contents contain **no LICENSE**, GitHub license field is null, no grant in inspected game code. Reject: no verified redistribution grant, unsuitable loop; static HTML alone does not mean MIT.
- [Chasing Lights](https://github.com/js13kGames/chasing-lights/blob/2ac3ca0cfdc1626ca04de5ac7fa9e460ef8c39d1/index.html), pinned `2ac3ca0cfdc1626ca04de5ac7fa9e460ef8c39d1`. Read complete 6,454-byte HTML; author meta says Darshan Rane. Offline inline CSS/JS light-toggle puzzle, click-count/progress, level selection, alert on completion and restart; not two-player chase. Top-level contents have **no LICENSE**, API license null, no inline grant. Reject. Attempts to read `index.js` and `README.md` returned HTTP 404 because it is an inline-HTML repository, not a connectivity failure.
- `KshavCode/two-player-tag-game`: pinned `d1b35366da10650578bcda305aaab4c6db1e8196`; API/root listing show Python, image/music folders and no LICENSE. `nbird11/tag`: pinned `dfed2791184475267c25d4be81da6a2ce800f9a7`, C#, no LICENSE. `BareBonesStudios/Two-Player-Tag-Game`: pinned `fa91d9e04a0d49dcda381dccba5f2631df6533ec`, README only. Rejected at metadata/runtime/license screening; their game code was not read and no permission is inferred.
- `TheLinuxGuy-ssh/Tagged`: pinned `be62c2ee0fbeca2cf0ccf11678afa9d2a9d54fa7`; API reports MIT but actual LICENSE/game code not read. Root lists Godot export with 40,669,826-byte side-WASM, 8,030,128-byte PCK and 2,958,990-byte JS; rejected as unsuitable for this tiny static-port search. `SDArtsCode/tagball-game`: pinned `c7e63495117e3afe7a044a00e36bbc2f114bd80d`, Godot and no top-level LICENSE; not verified reusable.
- `joshrouwhorst/Tag`: pinned `4d5f34c6514f547da7b0bedb0985980916faf2a2`, client/server tree and API license null. `0trava/TagGame`: pinned `0196d0a54b63eae85aed7b4158718b081b5ed108`, API license null. Rejected at screening, not source-verified recommendations. Another search hit had apparent franchise-derived assets and no LICENSE; excluded without ingestion.

No network outage prevented evidence collection. No outreach, clone, dependency install, persistent server, browser test, self-made implementation, or registration occurred.

## Verification and limits

- All three downloaded Sprig game files passed `node --check` (exit 0, no output). This establishes syntax only, not playability.
- Mechanical scan output: `compiled engine: 12 JS files, all import/export dependencies relative; fetch/socket/eval findings: 0`.
- Candidate source scan: `network calls False` for all three. No runtime third-party load added; document links are evidence, not game loads.
- Scratch payload: 1,620,578 bytes across downloaded evidence, tarball and selected modules, below 2 MB; no source was ingested into Games. Disk remained 2.3 GB available at checks. Only this document is owned/committed.
- Browser gates: **0 run**; screenshots: **none**. Full-game smoke/release gates remain with Main and must precede any push. Games added: **0**; no build/register commits.
- Shared changes seen during work belong to others: `assets/portal-ux.js`, Circuit Ward CV model GLBs, `Games/Foldwild/`, and `scratch/`. Not edited, staged, cleaned or committed by this task.
