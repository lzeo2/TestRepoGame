# Racing research: delegation 87

Research only, 2026-10-02 UTC. Actual worker: `openai-codex/gpt-6-astra`, confirmed by `PI_PROVIDER` and `PI_MODEL`. Main retains direction, source/license decisions, images, catalog and integration. Exactly two proposed slots follow: **HexGL** and **racing-game**. Both are **HOLD**, zero ingestion GO. These are existing upstream games, not permission to build replacements. No IDs allocated, runtime files changed, installations, ingestion, screenshots or push.

## Scope and evidence baseline

Read `AGENTS.md`, `docs/CODE_QUALITY.md`, maintenance index, rights/sparse guide and `docs/maintenance/3d-outlook.md` before selection. At inspected HEAD `c4dfad0edddf09120d28bb1c684d03a11870e9a5`, parsed all current catalog records and checked required fields, unique IDs and Git-tracked URLs. Actual output: `catalog: 115 unique/schema/tracked URLs OK`. Neither candidate appears among the 115 entries or the maintenance index's five unregistered games. JavaScript Racer 208, Spline Ride 224, Drift Boss 81 and Mario Kart Super Circuit 117 are not additions. Spline Ride is not counted as a race. No Circuit Ward vehicle integration is proposed.

Sparse selection observed: `Games/Foldwild`, `assets`, `docs`, `scripts`; unchanged. Initial `df -h / | tail -1` reported 2.4G available. Only metadata and small text files were fetched using Python stdlib HTTP; no archives, clone, art/audio/font/model binaries or output asset images. Owned temporary source text totaled **117,017 bytes**, below 2 MiB. Tree byte counts below are GitHub metadata sums, not downloaded bytes or memory measurements.

Current maintenance guard was run and failed: `AssertionError: Inventory stale: inspect changes, then run --refresh.` The worker does not own inventory or runtime and did not refresh it to hide the mismatch. This predates any runtime change by this task, which makes none. Source/code coverage and rights are independent from this repository-wide documentation hold.

## 1. HexGL: conditional lightweight 3D time-attack slot

### Identity, immutable source and decision

- Factual title/credit: **HexGL**, by **Thibaut Despoulain (BKcore)**, as stated by upstream README, LICENSE and in-game credits.
- Repository: <https://github.com/BKcore/HexGL>.
- Fresh resolved `master`/HEAD revision: **`6addc95a2fce3bf05f4d751823cc054c61a16d68`**. Metadata says not archived; inactivity is not maintenance assurance.
- Root license: <https://github.com/BKcore/HexGL/blob/6addc95a2fce3bf05f4d751823cc054c61a16d68/LICENSE>.
- README: <https://github.com/BKcore/HexGL/blob/6addc95a2fce3bf05f4d751823cc054c61a16d68/README.md>.
- **HOLD, not approved for ingestion.** Fresh evidence preserves the earlier pending status: explicit NC exceptions, incomplete asset grants and old runtime issues remain. A small payload or MIT root does not clear these.

### What the existing game actually does

`index.html` -> `launch.js` starts a Cityscape time attack after control help/loading. `Gameplay.js` runs a countdown, records elapsed/lap time, and finishes after three checkpoint laps. `ShipControls.js` accelerates, turns, air-brakes, triggers boosters, damages shield on collisions and marks destroyed after shield exhaustion or falling. This is racing with player steering and measurable outcomes, not a camera tour.

Source keyboard bindings: Up accelerates; Left/Right steer; Q or A applies left air brake, D or E right air brake. Down sets a `backward` flag, but inspected update code does not use it, so do not advertise reverse/braking on Down. Escape invokes reset. Touch uses a left-side drag stick and right-side acceleration; three touches restart and four reload. Replace obscure multi-touch reset gestures with explicit controls rather than claiming they are accessible. Finish screen click/touch reloads the page. No AI opponents or working online competition should be advertised.

Outcome caveats matter: the active `gameover` branch in `HexGL.displayScore` displays a time and returns before the older Finish/Destroyed text and storage branch. A destroyed run must not masquerade as a completed race in the adapted result screen. `ShipControls.reset` does not visibly clear `falling`; restart-after-fall needs a targeted fix/test if confirmed. Existing source provides a real loop, not a claimed native pass.

### Rights matrix: code is not all content

| Component | Fresh evidence | Disposition before any port |
| --- | --- | --- |
| Root code/default resources | MIT, copyright 2015 Thibaut Despoulain; README says MIT **unless specified in the file** | Retain root notice; not an all-files MIT finding |
| Gameplay, ShipControls, HexGL and Cityscape files | Each inspected header explicitly says Creative Commons Attribution-NonCommercial 3.0 Unported | HOLD until Main resolves intended-use compatibility and exact grant scope; never strip headers as supposedly stale |
| Ship/model and track textures | Entry credits Charnel for HexMKI base model and Nobiax for track texture; source references `geometries/ships/feisar/feisar.js` and matching texture paths | Credits do not establish original grants. Trace actual models, derivatives and every texture. Filename/visual inspiration is not clearance; no commercial vehicle/team marks or copied franchise assets permitted |
| Skybox, HUD, particles, title/help art, remaining geometry | Enumerated by tree/Cityscape; no independent original grant chain examined | HOLD; Main must verify each retained resource and any exceptions. Do not copy promotional imagery as a thumbnail |
| Audio | [audio/LICENSE](https://github.com/BKcore/HexGL/blob/6addc95a2fce3bf05f4d751823cc054c61a16d68/audio/LICENSE): boost by IFartInUrGeneralDirection, wind by kangaroovindaloo, destroyed by beman87 under CC BY 3.0; crash by qubodup and bg by mu6k asserted public domain; Licson edits and baleboy OGG conversion | Preserve exact author/adapter notices; original sources and file-to-grant correspondence still need verification. This is an upstream statement, not independently proven ownership |
| Fonts | `css/fonts.css` references BebasNeue EOT/WOFF/TTF/SVG; generator comment is not a license | HOLD retained font files. Simplest adaptation can use already licensed portal/system fonts, not another unverified download |
| Runtime dependencies | Local legacy Three, shaders/postprocessing, Stats, DAT.GUI, controller helpers; TouchController credits a Seb Lee-Delisle demo | Full per-file licenses and dependency origin still unreviewed. Root MIT is not a substitute. Preserve any retained dependency notices |

### Files, bootstrap, saves and source coverage

Static hosting is supported by README; compiled JS is committed, so CoffeeScript/npm installation is not necessary for the observed bootstrap. Entry directly loads `libs/Three.dev.js`, `ShaderExtras.js`, EffectComposer/RenderPass/BloomPass/ShaderPass/MaskPass, Detector/Stats/DAT.GUI, controller helpers, Timer/ImageData/Utils, RenderManager/Shaders/Particles/Loader, Audio, HUD/RaceData/ShipControls/ShipEffects/CameraChase/Gameplay, Cityscape, HexGL and launch. Do not substitute modern Three imports into this old API.

Cityscape's low-quality manifest uses `textures/`, nine geometry paths, collision and height analyser PNGs, HUD images, six expanded skybox face paths and five OGG sounds. Higher quality selects `textures.full/` and additional normal/specular maps. Loader expands `%1` cube paths to px/nx/py/ny/pz/nz. Audio uses same-origin XHR and Web Audio decode, with HTMLAudio fallback. Geometry/images/audio must be available locally; file opening is not equivalent to a served static game.

Existing network violations: entry dynamically inserts Google Analytics and uses remote favicon URLs. Unsupported WebGL redirects to an external site. Leap mode connects to a controller service; remove that mode and its library from the approved runtime closure, not just its menu label. Legacy non-active result branch builds social-share links and refers to Ladder. Remove or explicitly keep unreachable only after consumer tracing; do not advertise a leaderboard. The exact closure is not yet certified.

`Gameplay.start` reads `race-<track.name>-replay` inside a try/catch for replay mode. Ordinary launch uses time attack. The old score-writing branch lies after the active gameover return and contains `JSON.Stringify`, not `JSON.stringify`; do not promise persistent scores/replays from it. Prefer session results initially; do not add accounts/storage architecture. If replay is retained, validate import schema/size and storage-denied/corrupt values before enabling it.

Fully read the fetched README/LICENSE/audio notice, entry, launch, Gameplay, HexGL, ShipControls, Cityscape, Audio, Loader, TouchController and font CSS. Did **not** inspect complete Three/addon/helper sources, other CoffeeScript inputs, actual binary assets or every exception. No browser, keyboard/touch run or visual/IP clearance occurred.

### Bounded adaptation and budget

Retain existing track, physics and timed-lap identity if rights clear. Use its existing menu rather than a decorative wrapper screen. Convert clickable menu divs and result return action to native labeled buttons, visible focus and 44px minimum targets. Add explicit left/right air brake and restart controls for touch, test simultaneous steering/acceleration and canceled touches, and clear held controls on blur. Preserve page zoom, provide readable DOM lap/time/shield/result text, avoid constantly announcing every timer tick, and offer mute. Apply flat solid house styling only to our shell; local Bungee/Atkinson or readable system fallback, black action buttons, no gradients or copied franchise branding. Main owns actual art judgment.

Use LOW initially: source halves render dimensions and avoids high-quality shadows/bloom/particles. That establishes a switch, not performance. Fresh tree: **198 blobs, 20,421,268 bytes**, including an unused package archive and editor sources. Proposed low-only closure **estimate 4-8 MiB**, pending exact manifest, licenses and consumer audit; do not download full tree merely to remove it later. The owner must approve any ceiling change. Renderer memory, decode peak and N100 frame time are **unknown/unmeasured**. Real target remains N100/8 GB/64 GB; 30 FPS low and 60 FPS desirable are future measurement goals, never inferred from triangles. No hardware certification.

### Conditional small-task breakdown and acceptance

These are proposed future contracts, not running assignments. Rights task must finish before ingestion. Each mechanical slice should fit a separately bounded <=600-second worker task; stop/re-scope rather than silently extend. File names are proposed ownership boundaries, not created files.

| Slice and exclusive ownership | Work and exit evidence |
| --- | --- |
| Main: source/asset evidence only | Resolve NC use, every asset/dependency grant, brand/model provenance and exact low manifest. Reject on incompatible terms or protected IP; record pinned notices. No outreach promised |
| Entry/UI worker: future HexGL `index.html`, `launch.js`, shell CSS only | Remove Analytics/remote icons/redirects and Leap loading, keep factual credits, native menu/result actions, visible load/retry error, LOW default; no engine changes |
| Input/gameplay worker: `bkcore/hexgl/ShipControls.js`, `Gameplay.js`, `HexGL.js`, TouchController only | Sequential after UI handoff: clear stuck/canceled input, distinguish finish/destruction, verify reset-after-fall and repeated resets, expose session result correctly; do not add rivals or new tracks |
| Loader/audio worker: `bkcore/threejs/Loader.js`, `bkcore/Audio.js` only | Bounded missing/decode-failure handling, user-gesture audio unlock/mute; each loader error terminates loading with retry rather than hanging. Schedule separately from gameplay worker if shared assumptions change |
| Verification worker: one future focused regression script only | Leave a runnable source-level regression for result/reset/error behavior and separate browser scenarios. No framework install, no state grants counted as normal play |
| Main integration/manuals/catalog | Review real desktop/mobile screenshots in both themes only after legitimate ingestion is separately authorized. Update manual/inventory; allocate free ID only at registration decision |

Normal-input acceptance: choose keyboard/LOW, start, steer onto a boost, complete three real laps with time, intentionally collide/fall to a destroyed result, restart each path and repeat five times. Separately play with native touch, not mouse emulation. Verify restart returns shield/position/lap/control state and no extra animation loops or lingering audio. Check checkpoint order/reverse-line crossing cannot award false finish.

Negative fixtures: deny WebGL; lose context mid-race; fail one geometry, collision PNG or OGG decode; deny/corrupt storage if replay enabled; cancel a held touch; blur with Up held; resize 390 to 320; attempt restart during loading and just after a fall timer. Require readable, focusable recovery, no invisible simulation and no uncaught exceptions. These are future tests, not passed results.

Local closure acceptance: cold context, service workers/caches absent, outside-origin requests blocked from first load, capture requested URLs and ensure every runtime file is local and notice-covered. Measure transfer bytes, decode/load time, frame-time percentiles, memory and repeated-restart growth on real N100 in the same route/settings. Report hardware unavailable as HOLD. Full unmodified registered-catalog smoke is Main's later pre-push gate, not replaced by this plan.

Owner questions: Is NC use compatible with intended hosting? Is there existing authoritative ship/texture/font evidence? Is a low-only time attack acceptable? If any rights hold fails, reject this content port and research another complete 3D game with explicit per-asset grants. Trigger Rally and OpenLara below are **not** fallbacks to ingest. No replacement models, AI game or Circuit Ward driving work is authorized to rescue this slot.

## 2. racing-game: compact 2D checkpoint time-trial slot

### Identity, immutable source and decision

- Upstream repository title is **racing-game**, HTML title **Race**, credited **Uroš Hekić** by its MIT notice. Keep factual attribution; no franchise title or invented commercial brand.
- Repository: <https://github.com/uroshekic/racing-game>.
- Fresh resolved `master`/HEAD revision: **`779ac368d23c6ab7f6590b3fd07365ff6a72548b`**; repository metadata says not archived.
- License: <https://github.com/uroshekic/racing-game/blob/779ac368d23c6ab7f6590b3fd07365ff6a72548b/LICENSE>.
- Entry/source: [index.html](https://github.com/uroshekic/racing-game/blob/779ac368d23c6ab7f6590b3fd07365ff6a72548b/index.html), [race.js](https://github.com/uroshekic/racing-game/blob/779ac368d23c6ab7f6590b3fd07365ff6a72548b/race.js), [trackGenerator.js](https://github.com/uroshekic/racing-game/blob/779ac368d23c6ab7f6590b3fd07365ff6a72548b/tracks/trackGenerator.js).
- **HOLD:** promising low-budget existing lap racer, but track-PNG provenance/terms and owner's acceptance of open-ended time trial are unresolved. Not an invented licensed success, not counted as finite win/loss racing.

### Existing play, goal, failure and restart

`race.js` creates a capsule-shaped canvas car and four track definitions. Track 0 and Speedway are 1000x600; Track 1 is 1500x800; each defines a start and two ordered checkpoints. Infinity is 1000x600 with coordinate wrapping and **no checkpoints**, so it is a driving sandbox, not the proposed primary race. Default Track 1 is a lap-time course. Goal is to drive checkpoint 1 -> checkpoint 2 -> start, record a lap time and improve it; a previous-lap position shadow supplies comparison.

Enter starts a three-second countdown. Up accelerates forward, Down decelerates/reverses, Left/Right rotate, Space brakes. Colliding with off-road geometry restores position and reverses/reduces velocity; the attempt loses time, not a life. Each successful lap appends a time and increments laps. There is **no finite race victory, knockout, opponent or game-over screen** in current source. Empty P pause branches are not a working pause. Do not claim any of these.

Changing the native track select calls `loadTrack` and resets car/counters/menu; there is no explicit same-track restart button, and `lapTimes`/held keys are not comprehensively cleared there. Proposed adaptation is a labeled same-track Restart invoking the corrected shared reset, not a new game engine. A completed lap is the actual success outcome; a slower/collision lap is a poorer time, not an invented loss state. If the owner requires two conventional finish/lose races, this slot remains vacant pending different upstream research rather than fabricating opponents or a deadline.

### Rights matrix

| Component | Evidence | Disposition |
| --- | --- | --- |
| HTML/JS game code | Root MIT, copyright 2013 Uroš Hekić, actual text fetched | Keep complete notice and credit; source license verified |
| Capsule car, collision and checkpoint logic | Canvas arc drawing and rectangle/checkpoint definitions in inspected JS; no car sprite/model dependency | Code-backed drawing, no separately loaded car art found; do not replace with commercial car logos/images |
| Eight track PNGs | Complete tree lists `track0.png`, `track0_h.png`, `track.png`, `track_h.png`, `speedway.png`, `speedway_h.png`, `infinity.png`, `infinity_h.png`; README gives no separate asset grant | HOLD PNG rights/provenance; repository MIT alone is not assumed to establish ownership of every image |
| Track generator | Inspected source draws a geometric Track 1 route and exports a data URL | Useful origin evidence for one route, but binary-to-generator correspondence and the other tracks are unverified. Do not silently regenerate art or claim it proves all PNG rights |
| Audio/models/fonts | No audio, model or font file appears in complete tree; inspected entry uses system fonts | No external asset grant needed for nonexistent payloads; do not add music/models. No custom-font licensing claim |
| Libraries/build assets | No runtime third-party library in entry/source/tree; native Canvas and browser APIs | No dependency installation or build needed |

### Bootstrap, network, save and inspected limits

Static `index.html` loads one local `race.js`. It calls `loadTrack(1)`, constructs `tracks/<filename>.png` and `<filename>_h.png`, loads visible/hidden images, draws collision mask to hidden canvas and reads pixels into a JS boolean array. `frame()` polls loading then uses requestAnimationFrame; separate intervals update timers/FPS/debug. Runtime uses no server data/API, sockets or storage in the fully read entry/script. One outbound author attribution anchor is navigation, not a runtime fetch. Preserve author/source text; do not confuse link presence with analytics.

Fresh nontruncated tree: **15 blobs, 250,950 bytes**. Exact HTML + race.js + eight PNG metadata sum is **247,620 bytes**; this is a plausible all-track runtime list, not a downloaded or browser-confirmed closure. README, LICENSE and generator account for additional source/docs. All five fetched text files (README, LICENSE, index, race.js, generator) were read fully. No PNG bytes, historical commits or generator HTML were inspected. Actual track visuals and all-grants matching remain pending.

No save is implemented: results/ghost data are session memory, reset/reload discards them. Do not invent a persistent leaderboard. New persistent storage is unnecessary for the base port; if later requested, it is a separate scope. The real performance risk is not mesh complexity: collision mask is a large JS boolean array, physics is frame-based and the current-lap shadow grows indefinitely until a completed lap.

### Minimal adaptation, 2D budget and concrete tasks

Retain 2D top-down car, collision maps, ordered checkpoints and timed laps. It is distinct from HexGL's shield/boost three-lap race and avoids Three/GPU models entirely. Preserve existing geometry/art if cleared, not a house-color repaint. Use a responsive canvas viewport with stable logical collision coordinates and readable adjacent DOM timing/lap output; replace fixed 1208px outer layout. Label track select, remove useless one-option car selector, add Start/Restart and 44px directional/brake buttons, visible focus, keyboard scope that does not steal select/menu navigation, pointer-cancel/blur cleanup, reduced-motion ghost option and text instructions. Apply flat house shell and system/local licensed fonts. These are wrapper/input fixes, not permission to design new tracks.

Provisional footprint target **under 0.5 MiB** including notices and small shell changes, grounded in tree size but still a future budget. Real N100 memory/frame-time/load measurements are **unknown**. Preserve game speed across 30/60/120 Hz by a small, tested fixed-step or delta-time correction only if scope permits; do not claim rAF guarantees consistent driving. Bound recorded shadow duration explicitly, disable ghost when its documented limit is exceeded, rather than letting a never-finished lap accumulate indefinitely. Exact limit requires Main approval and measurement, not arbitrary performance certification.

| Future exclusive task ownership | Work and exit evidence |
| --- | --- |
| Main: rights/source report | Verify original PNG grant and generation lineage, decide if lap-time trial qualifies. If not, do not ingest |
| UI worker: future Race `index.html` and shell CSS only | Responsive canvas/stats layout, native Start/Restart/select, controls/focus/labels and factual attribution; no art replacement |
| Logic worker: future `race.js` only | Wire native input to existing keys; repair one shared reset; resolve loading failure/rapid track-switch races; clear input on cancel/blur; cap ghost recording and stabilize simulation timing. Break into sequential <=600-second commits if needed, not competing writers |
| Verification worker: one future small regression script only | Runnable checkpoint/reset/stale-load tests without new framework; normal keyboard/touch evidence remains separate from injected fixtures |
| Main integration/manual/catalog | Review desktop/mobile screenshots in both themes; notices/manual/inventory and final candidate acceptance; no automatic registration |

Normal input: select Speedway, start with Enter, accelerate/steer/brake, hit a boundary and recover, complete two actual checkpoint laps and observe times/shadow; restart the same track, then change to Track 0 and complete a lap. Repeat with genuine simultaneous touch steering/throttle and touch brake. Confirm Infinity is clearly free drive, never presented as a lap-completion race. Acceptance does not require inventing loss/win states absent upstream.

Negative fixtures: cross start without checkpoints and reverse checkpoint order (no free lap); switch track while the old images are pending; fail a visible or hidden PNG (bounded error/retry instead of endless `loadTrackFinish` polling); unexpected mask dimensions; hold acceleration while blurring/canceling; restart during countdown and while held keys remain; run a long incomplete lap to verify the ghost cap; resize 390 to 320 and verify pointer mapping. Seeded checkpoint fixtures prove guards, not natural lap completion.

Performance/local closure: cold-cache browser with external network blocked and all eight constructed PNG paths accounted for; no console errors, invalid canvas reads, external requests or accumulating timers after repeated resets. Measure longest-track collision mask initialization, sustained frame-time distributions and memory across five restarts plus a long lap on N100. Compare speed/lap timing at different refresh rates. No N100 FPS/memory claim is made now.

Owner questions: Does an open-ended lap trial satisfy the compact racing slot, or is finite finish/loss mandatory? Is there authoritative track-PNG provenance beyond root MIT? Is retaining three timed courses and clearly separating Infinity acceptable? Fallback is further source-first research for an existing compact race with explicit asset terms and real completion/reset, not a renamed clone, an engine demo or an AI-generated replacement. The tutorial candidate below is rejected rather than promoted to fill the slot.

## Rejected candidates and useful source problems

These are research exclusions, not additional numbered slot plans.

| Investigated candidate | Fresh pin/notices and concrete reason |
| --- | --- |
| Trigger Rally Online Edition, CodeArtemis | <https://github.com/CodeArtemis/TriggerRally>, HEAD `079ac53216b74598b652ce3bf11478beb5c6832b`; [LICENSE.md](https://github.com/CodeArtemis/TriggerRally/blob/079ac53216b74598b652ce3bf11478beb5c6832b/LICENSE.md) and README fetched HTTP 200. GPL v3 source is separate from Content. Clause 3.1 prohibits modifying/redistributing content without a separate owner license; FAQ says publishing a copy is generally not allowed. **REJECT current-content port**, regardless of static branch. Cars, tracks, textures and audio are not freed by GPL source; no total conversion is authorized |
| OpenLara, XProger | <https://github.com/XProger/OpenLara>, HEAD `3b268ca4bf986c380f44a26ffd9218bf6d376249`; [LICENSE](https://github.com/XProger/OpenLara/blob/3b268ca4bf986c380f44a26ffd9218bf6d376249/LICENSE) and README fetched HTTP 200. BSD 2-Clause engine, explicitly classic Tomb Raider engine/demo, not a racing game or game-data redistribution grant. **REJECT**; no franchise assets, demo-level copying or user-owned-file product substitution |
| Pseudo-3d-Racer, ssusnic | <https://github.com/ssusnic/Pseudo-3d-Racer>, HEAD `12dfc34d7d055b83441016d9a2e774c585fdfdc3`; [LICENSE](https://github.com/ssusnic/Pseudo-3d-Racer/blob/12dfc34d7d055b83441016d9a2e774c585fdfdc3/LICENSE), README, `source/part2/main.js` and `player.js` fetched HTTP 200. Nontruncated tree: 24 blobs, 1,128,311 bytes. MIT root does not separately clear sprites. More importantly, inspected Player always advances at maxSpeed and wraps road length; main's GAMEOVER is empty. README calls it a prototype and parts cover straight-road rendering/player/camera. **REJECT as complete racing-game candidate**, do not add missing game systems just to claim a port |
| Already cataloged/excluded | JavaScript Racer is registered; selecting its original/tutorial again would not meet additional-game intent. Spline Ride is already registered and is an experience, not racing. Commercial-brand search hits were not downloaded or treated as cleared |

## HTTP/source-check log and limits

All checks below were performed **2026-10-02 UTC**, approximately 08:04-08:08, using stdlib `urllib.request` with bounded requests. No network failure occurred in this delegation; historical Trigger repository-guess 404 in the outlook was not repeated and is not new evidence. **38 successful HTTP requests: 12 API metadata/search/tree requests and 26 pinned raw text requests.** Counts are requests, not 38 independently verified licenses or runtime passes.

API requests (all HTTP 200):

- Search: <https://api.github.com/search/repositories?q=javascript+racing+game+license:mit&sort=stars&per_page=15>. Actual returned candidates included `jakesgordon/javascript-racer`, `ssusnic/Pseudo-3d-Racer` and `uroshekic/racing-game`; a search license filter was only discovery, never rights clearance.
- `/repos/BKcore/HexGL/commits/HEAD` twice; `/repos/CodeArtemis/TriggerRally/commits/HEAD`; `/repos/XProger/OpenLara/commits/HEAD`; `/repos/uroshekic/racing-game/commits/HEAD`; `/repos/ssusnic/Pseudo-3d-Racer/commits/HEAD`, under `https://api.github.com`.
- `/repos/BKcore/HexGL/git/trees/6addc95a2fce3bf05f4d751823cc054c61a16d68?recursive=1`, `/repos/uroshekic/racing-game/git/trees/779ac368d23c6ab7f6590b3fd07365ff6a72548b?recursive=1`, `/repos/ssusnic/Pseudo-3d-Racer/git/trees/12dfc34d7d055b83441016d9a2e774c585fdfdc3?recursive=1`. All returned `truncated False`; blob sizes quoted above are exact metadata sums.
- `/repos/BKcore/HexGL` and `/repos/uroshekic/racing-game`: both `default_branch master archived False`.

Pinned raw fetch format was `https://raw.githubusercontent.com/<repository>/<40hex>/<path>` using the revisions above. Actual HTTP 200 text paths:

| Repository | Paths actually fetched |
| --- | --- |
| BKcore/HexGL | `LICENSE`, `README.md`, `audio/LICENSE`, `index.html`, `launch.js`, `bkcore/hexgl/Gameplay.js`, `bkcore/hexgl/ShipControls.js`, `bkcore/hexgl/tracks/Cityscape.js`, `css/fonts.css`, `bkcore/hexgl/HexGL.js`, `bkcore/Audio.js`, `bkcore/threejs/Loader.js`, `bkcore.coffee/controllers/TouchController.js` |
| uroshekic/racing-game | `LICENSE`, `README.md`, `index.html`, `race.js`, `tracks/trackGenerator.js` |
| CodeArtemis/TriggerRally | `LICENSE.md`, `README.md` |
| XProger/OpenLara | `LICENSE`, `README.md` |
| ssusnic/Pseudo-3d-Racer | `LICENSE`, `README.md`, `source/part2/main.js`, `source/part2/player.js` |

Examples of actual response output: `HTTP 200 14496` for pinned `racing-game/race.js`; `HTTP 200 18010` for pinned HexGL Cityscape; `HTTP 200 1790` for pinned TriggerRally LICENSE.md. Complete bytes were read for these small files; no archive or asset image request was made.

Rights/product questions and the stale inventory were escalated through Hermes ticket `pi-1312771-1790928415963`; no answer within the 20-second wait. HOLD is maintained, not interpreted as approval. No rights outreach is promised.

Completion evidence: **two slot plans, two HOLD, zero GO; three additional investigated upstream rejections; 115 catalog entries unchanged; native/runtime checks 0; hardware checks 0; screenshots 0; games added 0; no source/bundle/catalog changes.** This Markdown is the owned research log. Main must review source/rights judgments, resolve holds and authorize any later implementation separately. No unattended month work or release promise.
