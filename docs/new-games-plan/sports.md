# Sports research: two conditional slots

Delegation 84. Research date: **2026-10-02 UTC**. Actual provider/model from session environment: **openai-codex/gpt-6-astra**. Main retains direction, selection, rights adjudication, imagery and catalog ownership. This report owns only this Markdown path. It does not authorize ingestion, new game creation, registration or publication.

**Result: exactly two investigated slot plans, 0 GO, 2 HOLD.** Pool is a genuine eight-ball game with serious asset and rules issues. The second candidate is a complete paddle game, not regulation table tennis; it is an explicitly held sports-fit fallback, not a claim that two cleared sport simulations were found. No substituted engine/camera demo or fictional licensed game fills the gap.

## Scope and local checks

Read `AGENTS.md`, `docs/CODE_QUALITY.md`, maintenance README, rights-and-sparse guide, 3D outlook and ponytail instructions before selection. Parsed current `games.json` and inventory and inspected Git's complete Games directory listing, not sparse filesystem absence. Actual output: `catalog 115 unique 115`. No registered or unregistered pool, billiards, tennis or Pong title appeared. Existing Soccer/Basket/Volley Random, Retro Bowl and its variant, Archery, Free Throw, Darts 501, Mini Golf and Bowling are excluded. The five unregistered projects were also considered, including QWOP.

Required catalog fields remain `{id,title,cat,icon,desc,url,featured}`; optional `tags`, `players`, `howto` already exist. `sports` is an existing category. No ID allocated or title/branding approved. Catalog count remains 115. Sparse selection was inspected and not changed. Disk checks reported **2.4 GB available**, above the 2 GB floor. No archive, clone, install, engine binary, model, image, sound or font was downloaded. Only metadata and small text files were fetched.

## HTTP evidence and coverage

All successful checks below returned **HTTP 200** on 2026-10-02. Commit responses resolved actual 40-hex revisions; tree responses both reported `truncated: false`. These are source observations, not browser passes.

| Request/check | Actual result |
| --- | --- |
| [Repository search: pool/billiards, JavaScript, MIT metadata](https://api.github.com/search/repositories?q=pool+billiards+language%3AJavaScript+license%3Amit&sort=stars&per_page=6) | Found `xiaowu0162/pool-simulator`, among other leads. Search license metadata is not asset permission. |
| [Repository search: tennis, JavaScript, MIT metadata](https://api.github.com/search/repositories?q=tennis+game+language%3AJavaScript+license%3Amit&sort=stars&per_page=6) | Mostly networked games, score utilities and paddle-game leads; none cleared by search. |
| [Later HTML5 tennis search](https://api.github.com/search/repositories?q=tennis+game+html5&sort=stars&per_page=8) | Returned `emmanuelkamala/pongGame`, `gdomiciano/tennis-game`, `svrbasky/Tennis-Game-JavaScript` and other leads; not evidence of a licensed regulation-tennis game. |
| [Pool commit](https://api.github.com/repos/xiaowu0162/pool-simulator/commits/HEAD) | `c40138fb89ebbe9719eeb9d8d39bbb0f5a5a4c26` |
| [Pool tree](https://api.github.com/repos/xiaowu0162/pool-simulator/git/trees/c40138fb89ebbe9719eeb9d8d39bbb0f5a5a4c26?recursive=1) | Repository blob sum **7,894,330 bytes**, including unused examples/assets, not a runtime transfer measurement. |
| [Canvas Pong commit](https://api.github.com/repos/jakesgordon/javascript-pong/commits/HEAD) | `ca3240536e4f79ab7144388e56ed19de715b6662` |
| [Canvas Pong tree](https://api.github.com/repos/jakesgordon/javascript-pong/git/trees/ca3240536e4f79ab7144388e56ed19de715b6662?recursive=1) | Repository blob sum **187,887 bytes**, including five tutorial snapshots. |

Network failure disclosure: an intermediate batched search for `billiards javascript`, `tennis html5 game`, and `javascript-pong in:name user:jakesgordon` returned **`HTTP Error 403: rate limit exceeded`** for all three requests. The loop improperly reached a third request before control returned; this exceeded the requested two-failure stop and is disclosed, not hidden. Searches stopped and Hermes was notified under ticket **`pi-1312759-1790928313008`**; no answer arrived within 30 seconds. Independent repository metadata/raw endpoints subsequently succeeded, and the later search above also succeeded. No failed response was treated as source evidence.

Seventeen pinned raw text requests succeeded. Pool: `LICENSE`, `README.md`, `index.html`, `main-scene.js`, `game-model.js`, `game-scene.js`, `assignment4.js`, `tiny-graphics.js`, `tiny-graphics-widgets.js`, `examples/common.js`, `examples/obj-file-demo.js`. Canvas Pong: `LICENSE`, `README.md`, `index.html`, `game.js`, `pong.js`, `pong.css`. Raw URL construction is `https://raw.githubusercontent.com/<repository>/<resolved-revision>/<exact-file>`; immutable browsing links are provided below. Full reads covered both notices/READMEs/entries, pool model/scene/bootstrap, and Pong game/runner/CSS. Pool engine/dependency files were fetched and text-scanned, with bounded reads of widget initialization, input helper and OBJ loading; they were **not** fully audited. `assignment4.js` was fetched/scanned, not fully reviewed. Asset bytes and tutorial snapshot code were not inspected.

## 1. Eight-ball slot: Billiards Simulator

### Identity, rules and actual source

Repository: <https://github.com/xiaowu0162/pool-simulator>. Revision: **`c40138fb89ebbe9719eeb9d8d39bbb0f5a5a4c26`**. [Pinned README](https://github.com/xiaowu0162/pool-simulator/blob/c40138fb89ebbe9719eeb9d8d39bbb0f5a5a4c26/README.md) calls it **Billiards Simulator**, a UCLA CS174A course project, by **Youchuan Hu, Zihan Liu, Yunze Long and Di Wu**. That is factual attribution, not permission to market it with university branding. [Pinned LICENSE](https://github.com/xiaowu0162/pool-simulator/blob/c40138fb89ebbe9719eeb9d8d39bbb0f5a5a4c26/LICENSE) is MIT, copyright 2021 Bill Wu. Preserve both the actual notice identity and contributor names; do not silently equate or replace them.

This is a playable local two-person eight-ball game, not just the tiny-graphics renderer. Start/reset with Q. C/X rotate aim, U/I change force, H shoots. Wait for balls to stop; foul grants cue-ball placement with Ctrl+I/J/K/L. Ctrl+0 through Ctrl+9 select table/cue views. `Scene.key_triggered_button` already binds visible buttons to mouse and touch as well as shortcut keys, but native usability has not been tested.

The goal is to pocket the assigned solids or stripes and then the eight ball. Early eight-ball pocket loses. README lists cue-ball scratch, no object-ball hit and wrong group first contact as fouls. Group assignment, active-ball display, foul counts and current player provide progress; a numerical point score is not required for this ruleset. The scene has separate start and winner states and Q constructs a fresh `GameModel`.

Important source discrepancy: `check_winning()` reads `!this.foul`, whereas fouls are stored at `this.stats.foul`. `forward()` checks winning before that frame's collision/motion/foul handling and flips the player after each completed shot. Do not advertise exact tournament rules or scratch-on-eight correctness. The observed unconditional turn switch also differs from standard continue-after-legal-pot rules. First reproduce the intended course-game behavior and decide whether bounded corrections suffice, rather than replacing physics with a new game.

### Code versus assets rights matrix

| Component | Verified evidence | Decision |
| --- | --- | --- |
| Game JavaScript | Root MIT text fetched; full model/scene read. | Code-license evidence present, retain notice; not whole-package clearance. |
| tiny-graphics, widgets, common shapes | Included source; dependency names/imports verified. No separate dependency license in the returned tree. | **HOLD** upstream authorship/version/terms reconciliation; root project MIT is insufficient to settle copied dependencies. |
| OBJ parser | Source explicitly says adapted from `webgl-obj-loader.js`; no exact origin/revision in inspected loader. | **HOLD** identify actual implementation and retain its required notice. |
| Table, cue and sixteen ball OBJ meshes | README says the authors created models in Blender. `assets/table.obj`, `cue.obj`, `ball_0.obj` through `ball_15.obj` are tracked. | Authorship assertion is useful but no explicit separate model grant established; **HOLD**, not MIT-by-association. |
| Pool-table/cue/ball/wood textures | Concrete texture references in `game-scene.js`; no separate terms found. | **HOLD** exact original sources and redistribution scope. |
| University billboard | README expressly says scrolling UCLA logos; source loads `assets/UCLA_v1.png` and draws four walls of billboards. | **REJECT this branded content** without actual rights. Do not copy, trace or disguise the logo. |
| Start/end character panels and favicon | `start_char_v3.png`, `end_char_v3.png`, start/winner PNGs and `fav.ico` referenced. No independent terms or visual inspection. | **HOLD**; no claim of original character ownership or benign content. |
| Audio/music | No audio file in complete tree and none referenced in reviewed game source. | Not needed for the proposed silent game; no new audio promised. |
| Fonts | Widget uses system monospace; no font binary in tree. Text baked into PNGs remains part of unresolved image rights. | No separate font binary required; image provenance still held. |

### Files, bootstrap, closure and persistence

[Entry](https://github.com/xiaowu0162/pool-simulator/blob/c40138fb89ebbe9719eeb9d8d39bbb0f5a5a4c26/index.html) imports `main-scene.js` as an ES module and constructs `Canvas_Widget` with `GameScene`. `main-scene.js` imports all course example modules, even though the game is the main scene. `game-scene.js` imports `game-model.js`, `examples/common.js` and `examples/obj-file-demo.js`. Common imports the local engine and widgets. Models use same-origin `fetch(filename)` and textures use local image paths. No npm/build manifest was present in the returned tree; `server.py`/host scripts are development serving conveniences, not a required game backend.

Do not certify closure from those facts. Widget code includes same-page source fetching and a dormant editor POST to `/submit-demo?Unapproved`. Defaults enable code navigation and explanations, but disable the editor. A port should explicitly disable those non-game widgets, keep the editor disabled, then trace the retained imports and constructed asset paths. Do not install or enable submission services. The OBJ error path can leave an empty shape; it needs a clear failed-load state, not an invisible table counted as playable.

No storage API appeared in the fetched source scan; the reviewed game keeps session state in memory. Plan no added save format. Reset loses the current rack by design; an explicit confirmation prevents accidental touch resets. No accounts, networking, AI opponent, league or career is claimed.

### Adaptation and rendering recommendation

Keep the existing **3D** view because actual ball meshes, cue alignment, rolling and selectable cameras are part of the upstream game. Do not build a new 2D engine or import a modern replacement renderer. Recommend a stable overhead default with optional existing side views, not cinematic motion. This is an estimate-based recommendation, not Main's approved direction.

First resolve rights, or reject the candidate. If Main approves a bounded shell adaptation after clearance, omit the logo billboard and unresolved decorative panels from a future authorized port only after recording their consumers; use ordinary accessible text for start/winner messages, not replacement character art. This is not permission to fabricate replacement gameplay or claim removal cures unresolved core-model rights. Retain all original notices and a precise modification record.

Expose the existing action callbacks through large labelled controls: Aim left/right, Power down/up, Shoot, Ball in hand directions, View and Restart. Preserve keyboard controls but offer non-conflicting alternatives for Ctrl+number browser shortcuts. Replace duplicate mouse/touch activation with a single deliberate input route and clear held actions on cancellation/blur. Space/Enter must activate focused controls. Announce turn, group, foul and winner only when changed; provide text ball numbers/groups so color is not the sole cue. Hide unavailable ball-in-hand actions, keep focus visible and reserve at least 44px targets. Reflow the fixed 1080px widget at 320/390px; use flat shell colors, black action buttons and local house fonts or system fallback. Preserve table/art colors rather than recoloring the sport. Disable billboard/character motion rather than adding effects; Main must review desktop/mobile and both shell themes later.

Budget **estimate, not measured runtime**: source repository is 7.89 MB; a retained game closure might be roughly 5-8 MiB uncompressed after evidence-based omission of course examples/unconsumed assets. Aim below 8 MiB and no new dependencies. Initial engineering estimate 1-3 focused days after rights closure, mostly rule defects/input verification; rights resolution time is unknown and no outreach is promised. Draw count, mesh triangles, texture dimensions/VRAM, cold-load latency and device FPS are unknown. Target 60 FPS, with 30 FPS low-device floor subject to Main's hardware policy; no hardware certification.

### Conditional small-task implementation and acceptance

These are future tasks, not delegated work now. Owners must be assigned disjoint files; scene work is serial, not two workers editing the same file.

| Task and bounded ownership | Deliverable and acceptance |
| --- | --- |
| Evidence owner, future source report/notices only | Resolve each matrix row, dependency pins and allowed file manifest. Main decides rights and scope. Any unresolved core mesh/texture/parser right stops ingestion. |
| Import/bootstrap owner, future entry/bootstrap and approved vendor files only | Exact approved revision, original notices, explicit game-only module closure, no code/editor widget or backend. All retained requests local. Missing OBJ/texture produces actionable error. |
| Rules owner, future `game-model.js` and one small regression file only | Reproduce then minimally fix eight-ball/foul timing and finite collision math. Regression covers legal last-eight, early-eight, scratch-on-eight, zero-distance overlap and a completed turn. No speculative physics replacement. |
| Scene/input owner, future `game-scene.js` and shell styles only, after rules freeze | Accessible controls mapped to existing model actions; bounds/overlap checks for cue placement; no hidden double shot; readable power/turn/group state and valid restart. |
| QA owner, future focused browser check/evidence only | Normal-input start, aim, power, shot, legal pot, group assignment, foul recovery, natural completed rack and loss, restart. Fixtures independently test edge rules but cannot stand in for played outcomes. |

Negative fixtures: H while balls move must not add a second impulse; rapid tap plus synthesized mouse must not double-fire; cancelled touch must release; cue placement outside table/inside another ball must be rejected; zero aim component and overlapping centers must remain finite; large resumed-frame delta must not teleport balls through pockets; missing asset/WebGL context loss must stop clearly. Test storage denied as a no-storage smoke condition, not invented save acceptance. Measure cold-cache local serving with external requests denied, representative moving rack and idle/background behavior, 20 restarts and resize/orientation. Report console errors, p95 frame times and memory growth on actual tested devices. Main's later full catalog smoke and image review remain separate gates.

**Decision: HOLD.** Core assets/dependencies lack complete separate evidence; university imagery is explicitly rejected; rule accuracy and mobile input remain unproven. Owner questions: is local two-player-only eight-ball acceptable, and is bounded removal of branded decoration acceptable if core game assets are independently cleared? If not, leave this slot empty and research an unbranded eight-ball implementation with explicit per-asset grants and real rules. Do not substitute `poolvr` or another renderer merely because search says MIT, and do not promise rights outreach.

## 2. Table-tennis/paddle-sport slot: Canvas Pong, held fallback

### Identity and fit limit

Repository: <https://github.com/jakesgordon/javascript-pong>. Revision: **`ca3240536e4f79ab7144388e56ed19de715b6662`**. [README](https://github.com/jakesgordon/javascript-pong/blob/ca3240536e4f79ab7144388e56ed19de715b6662/README.md) title is **Canvas Pong** and describes an HTML canvas version of the classic game. [LICENSE](https://github.com/jakesgordon/javascript-pong/blob/ca3240536e4f79ab7144388e56ed19de715b6662/LICENSE) contains the MIT permission text, copyright **2011-2016 Jake Gordon and contributors**. Attribute those facts; do not suggest a licensed commercial franchise edition, use commercial promotional art or imply trademark clearance.

This is the completed root game, not `part1`'s runner or `part2`'s bouncing-ball demo. Source has one-player versus adaptive AI, local two-player and a separate computer-versus-computer demonstration. It is **not regulation table tennis**: no net/serve legality, two-bounce rule, sets or win-by-two. It cannot be relabelled as authentic tennis to satisfy the request. If Main requires an actual table-tennis ruleset, reject this candidate and keep the concrete second slot open for further source research; implementing a new sport on this engine would violate the no replacement-game boundary.

### Play loop and controls

Press 1 for one human, 2 for two humans, 0 for demo. Left paddle uses Q/A; right uses P/L. Return the ball with the paddle, using paddle motion to alter rebound; top/bottom walls rebound it. Missing past the left or right boundary gives the opponent a point. `goal()` ends at **nine points**, declares a winner and calls `stop()`. The loser is the opposite side. Start another match with 1/2, resetting scores and ball; Esc asks before abandoning. This is a concrete scored match with a result, not endless free movement. README explicitly says **no mobile support**. No native input or match result was exercised.

### Code versus assets rights matrix

| Component | Evidence at pin | Decision |
| --- | --- | --- |
| `game.js`, `pong.js`, entry and CSS | Root MIT text fetched; entire root scripts/entry/CSS read. No imported engine/package. | Code-license evidence present; retain notice and author attribution. |
| Court, paddles, ball and digits | `fillRect` and digit arrays in reviewed source draw them; no texture/model dependency for playfield. | Source primitives covered by code evidence, not a grant for unrelated commercial art. |
| `images/press1.png`, `press2.png`, `winner.png` | Actual tree files and `Pong.Images`/menu consumers verified. | **HOLD** no separate image/font-in-image origin or grant established. Root MIT not asserted as an asset-specific clearance. |
| Four WAV effects | `sounds/ping.wav`, `pong.wav`, `wall.wav`, `goal.wav` loaded by `Sounds.initialize`. | **HOLD** audio provenance/terms absent from fetched notices. Even disabled wall/goal playback still creates audio objects. |
| Fonts | No font binary in tree or external font URL in CSS; system default used for HTML/stats. | No runtime font vendor needed; PNG text provenance remains open. |
| Models/third-party engine | No models or external engine references in complete root game. | Not applicable. Tutorial snapshots are not dependencies to ingest. |
| Branding | Upstream name is Canvas Pong; root says Pong. | Factual source citation only. Main must decide safe presentation; no commercial logo or screenshot imported. |

### Bootstrap, closure and source limits

[Root entry](https://github.com/jakesgordon/javascript-pong/blob/ca3240536e4f79ab7144388e56ed19de715b6662/index.html) loads local `pong.css`, `game.js`, `pong.js`, then `Game.ready` starts the runner. Three PNGs gate initialization. `Game.loadImages()` listens only for successful load, so one missing image can stall startup forever. Audio is optional for play but initializes four local WAVs. Root HTML's `/part1` through `/part5` links would point outside a game subdirectory; omit tutorial navigation from a future approved wrapper rather than publishing half-game demos.

No fetch, socket, storage or remote runtime URL was found in the fully read root entry/JS/CSS. README's external project/tutorial links are documentation, not runtime dependencies. No backend, service worker, build tool or package manifest is needed by the observed root path. This is strong static closure evidence, **not** cold-cache browser proof. State is in memory; restart is a new match, no save/resume or leaderboard promised. The runner uses `setInterval`, has uncapped elapsed dt after suspension, and keeps drawing the menu after match stop. Those are concrete adaptation/measurement targets, not an excuse for a new engine.

### Adaptation, budget and conditional tasks

Keep **2D Canvas**: two paddles and ball need no camera, meshes, lighting or 3D dependency. Preserve the nine-point rules, collision helper and AI levels. Do not add tournaments, collectible paddles, branded courts, rankings or new sport mechanics.

After Main accepts sports fit and rights path, ordinary text/buttons can replace rasterized start/winner instructions as a bounded accessible shell change, not a game replacement. Keep silence if Main permits omitting unverified WAVs; remove actual loading consumers as well as muting. Neither option clears a trademark question automatically. If only unmodified upstream assets are acceptable, rights remain held. Retain notices and record exact omission/modification rationale.

Add real Start solo/Two players/Restart/Abandon buttons. Map touch up/down controls per side to existing `moveUp`, `moveDown`, stop methods, with pointer capture and cancellation; preserve keyboard Q/A and P/L and suppress gameplay shortcuts while interacting with settings. Avoid a mouse substitute masquerading as touch testing. Label the canvas and expose score/result in DOM, announcing each point rather than frames. Fix CSS's 480px minimum canvas and hidden mobile instructions at 320/390px; use fluid aspect ratio, visible focus, 44px actions, local fonts/system fallback and flat shell styling. Reduced motion disables optional ball footprints and demo autoplay; do not disable essential ball movement or claim full nonvisual equivalence. Main owns both-theme desktop/mobile review.

**Budget estimate:** full repository 187,887 bytes; root runtime text plus seven media files is well below 100 KiB by tree sizes, excluding notices. An accessible silent/text-menu port should remain under 150 KiB uncompressed, with no new dependency. These are file-size-based targets, not measured transfer, heap or frame-time results. Estimate 0.5-1.5 focused engineering days after acceptance/rights decisions; source provenance and owner decision time unknown. Target 60 FPS; measure p95 frame time, hidden-tab behavior and sustained long rally on actual devices. No native/hardware performance certified.

| Small future task, disjoint ownership | Concrete output and acceptance |
| --- | --- |
| Evidence owner, notices/source report only | Main decides sports fit first, then asset keep/omit choices and branding. No approval means no code import. |
| Root-code owner, `game.js`/`pong.js` plus one tiny assertion check only | Keep upstream physics/AI; bound resume delta and loop lifetime; missing image/audio handling; no stale held paddle or stale winner on replay. Regression tests goal at 9, no tenth point after stop, score reset, paddle bounds and segment intersection edge cases. |
| Shell owner, entry/CSS/input adapter only, after shared callback contract | Fluid canvas, DOM point/result labels, keyboard focus, true multitouch controls using existing paddle methods, original notices accessible. No modifications to game logic by this owner. |
| QA owner, focused check/evidence only | Play solo and local two-player using normal keys and actual touch, score both sides, play to nine for win/loss, Esc cancel/confirm, restart with zero scores. Demo autoplay is not human-input acceptance. |

Negative fixtures: image 404 yields a usable error or approved text-only path, not endless loading; rejected audio play must not interrupt rally; lost pointer capture/blur clears paddle movement; two touches on opposite sides remain independent; rapid Start never creates duplicate timers; hiding/resuming cannot skip the whole court or instantly award multiple goals; restart after a winner cannot show stale result; resizing preserves logical court collision coordinates. With storage blocked, game still works because it uses none. Fetch the retained local closure through a bounded static server with external networking denied and cold browser cache; measure 20 resets, long rallies and menu/background CPU. Full registered-catalog smoke remains Main's later release gate, not claimed here.

**Decision: HOLD**, with **REJECT as regulation table tennis** unless Main explicitly accepts a paddle-sport abstraction for this slot. Audio/menu artwork have unresolved separate rights, mobile support is absent upstream, and no played result is verified. Owner question: must this slot be authentic tennis/table tennis, or is this existing complete nine-point paddle game acceptable after lawful bounded adaptation? If authentic sport is required, research actual tennis/table-tennis games with serve, scoring, outcomes and explicit code/assets notices; keep this slot unfilled until found. Do not rewrite Canvas Pong into a purported new tennis game.

## Rejected directions and unverified leads

- **Pool's university billboard content:** explicit source/README branding consumer, rejected for copying without rights. University/course association is not a trademark/art license.
- **Canvas Pong tutorial stages:** root tree proves staged runner/bouncing-ball examples exist; reject those as ports. Only the complete root match was investigated.
- **`TheInfernitex/Multiplayer-Table-Tennis-Game` and `LuckyIntegral/ft_transcendence`:** search descriptions name Node/socket.io and Django backend respectively. Deprioritized as metadata-only leads under the static/no-backend preference; code, revision and asset grants were not investigated, so no license or runnable verdict is claimed.
- **`alexroan/tennis-manager`:** search describes Ethereum management, not an on-court sport candidate. Not selected; no assets or code inspected.
- **`gdomiciano/tennis-game` and `emmanuelkamala/pongGame`:** search license metadata was null. This is not proof that no license exists, but it cannot support ingestion. No guessed pins or grant claims. Research remains needed if Main requests more candidates.
- **`jzitelli/poolvr`:** appeared as a WebVR pool lead, but no small dependency/asset closure established. Not a second pool variant or engine-license shortcut.

## Verification, limits and completion record

Source-only HTTP results: **24 successful checks** (3 searches, 2 commit responses, 2 trees, 17 raw text files); **3 failed search requests** disclosed above. Native/browser gameplay passes: **0**. Hardware certifications: **0**. Art/screenshot outputs: **0**. Added games, ingestions, source/bundle/catalog edits, installs and pushes: **0**.

`python3 -B scripts/check_maintenance_docs.py` was run and failed with actual output **`AssertionError: Commit inspected source changes before validating its inventory.`** Concurrent status showed `M Games/Foldwild/script.js`, which this worker did not edit or stage. Do not refresh inventory to hide another task's in-progress source changes. This plan changes no maintenance source/manual relationship. Run again after Main freezes/commits those changes.

Owned scratch consisted only of fetched source text, below 0.3 MiB, and is disposable. Only this report is committed with anonymous `ArcadeWorker` identity and empty email fields. No source assets or local machine paths are included. Commit hash is reported in the completion message rather than self-referentially embedded here. Remaining holds: both selections require Main's decision; pool assets/dependency provenance and rule/input correctness; second-slot sport fit, optional image/audio provenance, mobile/restart/closure verification. No promise of rights outreach, autonomous month work, full-gate success or publication is made.
