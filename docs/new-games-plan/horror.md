# Horror: two source-grounded slot plans

Research only, delegation 83, 2026-10-02 UTC. Actual provider/model reported by the running session: **openai-codex/gpt-6-astra**. Main owns direction, final source/licensing decisions, images and catalog. No ingestion, registration, game edits, asset downloads, installs, browser execution or push is authorized by this document.

**Recommendation: zero ingestion GO.** Two real games were inspected: one rejected current-content candidate for the suspense slot, one held survival/escape candidate. These are not two promised additions. The first slot remains vacant rather than being filled with an invented replacement.

## Baseline and method

Read `AGENTS.md`, `docs/CODE_QUALITY.md`, `docs/maintenance/README.md`, `docs/maintenance/site/rights-and-sparse-workflow.md`, `docs/maintenance/3d-outlook.md`, current `games.json` and inventory identity before selection. Baseline HEAD was `c4dfad0edddf09120d28bb1c684d03a11870e9a5`. Actual local check output:

```text
catalog: 115 unique/schema/tracked URLs OK
inventory catalog_entries 115 games 120
Candidate-name tracked matches:
(none)
```

The catalog was parsed, required fields and unique IDs asserted, and all catalog URLs checked against `git ls-files`, not sparse filesystem existence. Both proposed titles were absent from catalog/inventory. A Dark Room and 10 Minutes Till Dawn are already registered and are not additional horror slots. IDs 222, 223 and 224 are occupied; no ID is assigned here. Sparse selection was inspected and left unchanged. Foldwild, including its optional hidden horror material, was not read, borrowed or activated.

HTTP research used Python stdlib `urllib.request`, GitHub Search/Commits/Trees APIs and small raw text files. No archives, clones, images, audio, models or promotional screenshots were fetched. Disk check initially reported 2.4 GB available, above the 2 GB floor. Owned scratch consists of eight text files totaling **123,004 bytes**, below 2 MiB. Tree sizes below are metadata sums, not downloads or runtime measurements.

HTTP evidence, all checked 2026-10-02 UTC:

| Request | Actual result |
| --- | --- |
| [Repository search: horror js13k](https://api.github.com/search/repositories?q=horror%20js13k&per_page=8) | HTTP 200; discovered both investigated repositories below. |
| [Repository search: horror javascript license:mit](https://api.github.com/search/repositories?q=horror%20javascript%20license%3Amit&per_page=8) | HTTP 403, `rate limit exceeded`. |
| [Repository search: psychological horror html5](https://api.github.com/search/repositories?q=psychological%20horror%20html5&per_page=8) | HTTP 403, `rate limit exceeded`. |
| [Unseen Network HEAD](https://api.github.com/repos/js13kGames/the-unseen-network/commits/HEAD) | HTTP 200; resolved `0b709e0144a52153dbbadf3fb05ee03fd09ec455`. |
| [Cat Shooter HEAD](https://api.github.com/repos/dkozhukhar/cat-shooter/commits/HEAD) | HTTP 200; resolved `72bf9b9b4fd78871a00ad858c2d07901d6ece29d`. |
| [Unseen Network recursive tree](https://api.github.com/repos/js13kGames/the-unseen-network/git/trees/0b709e0144a52153dbbadf3fb05ee03fd09ec455?recursive=1) | HTTP 200, `truncated=false`; 7 blobs, 42,867 bytes. |
| [Cat Shooter recursive tree](https://api.github.com/repos/dkozhukhar/cat-shooter/git/trees/72bf9b9b4fd78871a00ad858c2d07901d6ece29d?recursive=1) | HTTP 200, `truncated=false`; 17 blobs, 510,312 bytes. |

After the two search failures, search stopped and Hermes was asked, ticket `pi-1312769-1790928311646`. No answer arrived during the 15-second wait. The tool instructed continuation on available work. Core metadata and raw-file endpoints subsequently succeeded; no additional search retries occurred. Rate-limited queries supplied no results and are not evidence of candidate absence. Each of the eight pinned raw source/notice requests listed under the slots returned HTTP 200. Totals: **13 successful HTTP requests, two failed requests, eight text files read, native/runtime passes 0**.

## 1. Suspense investigation slot: The Unseen Network

### Identity, availability and disposition

Actual title: **The Unseen Network**. Source: <https://github.com/js13kGames/the-unseen-network>, revision **`0b709e0144a52153dbbadf3fb05ee03fd09ec455`**. This is the js13kGames contest distribution repository, not proof of an independently verified personal development repository. Its license names **Kipkat**, copyright 2020; repository search description credits account `imscary`. Preserve the license name and do not invent a real-name linkage or claim that a contest mirror settles all component rights.

**REJECT current-content port; slot remains HOLD for replacement research.** There is an actual complete small narrative game, not an engine demo. However, its central rescue path involves a fictional market selling children, buying the player's kidnapped sister, and hiring a killer. Other pages include corpse sales and simulated stolen-card markets. This is substantially more disturbing than a mild suspense/exploration brief, not something to conceal behind a generic horror tag. Main must make the audience decision. Removing the core story would be a new narrative conversion, not a small wrapper patch, and is not proposed as an unauthorized AI replacement.

Pinned HTTP 200 source files, fully read:

- [LICENSE](https://raw.githubusercontent.com/js13kGames/the-unseen-network/0b709e0144a52153dbbadf3fb05ee03fd09ec455/LICENSE), 1,063 bytes: `Copyright (c) 2020 Kipkat`, MIT grant.
- [.website/README.md](https://raw.githubusercontent.com/js13kGames/the-unseen-network/0b709e0144a52153dbbadf3fb05ee03fd09ec455/.website/README.md), 506 bytes: labels horror/puzzle/narrative and says, `A dark puzzle game where you explore the dark web and save your kidnapped sister. Try not to get hacked!`
- [index.html](https://raw.githubusercontent.com/js13kGames/the-unseen-network/0b709e0144a52153dbbadf3fb05ee03fd09ec455/index.html), 309 bytes: warning and automatic five-second relative navigation to `net.html`.
- [net.html](https://raw.githubusercontent.com/js13kGames/the-unseen-network/0b709e0144a52153dbbadf3fb05ee03fd09ec455/net.html), 19,012 bytes: entire game, styles, generated pages, procedural sound and state.

### Concrete play loop and outcome

Explore a simulated browser directory, follow clues in chat and shop pages, write notes, manage fictional currency and increasing hack risk, discover the kidnapper's identity, rescue the sister and resolve the final target. `iHaveMySister && !kidnapperAlive` triggers the win alert. The simulated wallet/shop economy supplies progress, not a conventional score. None of the fictional addresses is an actual browser/network navigation target: `gotourl()` selects entries in the local `db` object.

Loss is a simulated hack/kidnapping sequence: `nodeHacked > 4`, then a render-count threshold triggers an alert and page reload. Leaving the dangerous page quickly using the Home control is part of normal play. Current restart is reload; winning does not stop the loop and can repeat the alert every frame. Existing controls are mouse movement/down/up over canvas links, typing a simulated address plus Enter, native prompt/alert forms and a notes textarea. Keyboard cannot currently reach the canvas links; touch has no implemented coordinate/pointer path. These are source findings, not tested controls.

### Code versus assets matrix

| Component | Evidence and grant | Disposition |
| --- | --- | --- |
| Game HTML, JS, CSS and embedded narrative | Root MIT software notice names Kipkat; game text lives directly in `net.html`. | Code notice verified. Main still reviews story suitability and author/source linkage. |
| Canvas illustrations/page decoration | Generated by `fillRect`, paths, text and procedural drawing in the same source. No runtime image reference found. | No imported image grant needed for a separately downloaded file, because none is proposed. Do not claim clearance for all repository art. |
| Sound generator | Inline block explicitly labelled `zzfx micro`; upstream component notice/version is not supplied in the fetched game. | **HOLD:** independently identify the exact embedded ZzFX variant and retain its applicable notice before any port. Root game MIT is not a substitute for this check. |
| Recorded audio/music | No recording loaded; active sound is synthesized. Commented music experiments are not active assets. | No sample grant claimed. Generated sound comes from the held component above. |
| Fonts and emoji | CSS uses generic monospace; emoji are text rendered by the user's platform. | No font files downloaded or bundled. Do not extract platform emoji art for thumbnails. |
| Models | None. | Not applicable. |
| `.website/cover.jpg`, `thumbnail.jpg`, `game.zip` | Tree existence/size only; bytes not fetched and separate image terms not established. | **HOLD/exclude from any proposed ingestion.** No promotional-art permission inferred from MIT code. |

### Bootstrap, closure, state and source limits

Entry -> five-second timer -> relative `net.html` -> inline initialization -> `gotourl(q)` -> `requestAnimationFrame(renderPage)`. Runtime source footprint is **19,321 bytes** before adaptation, excluding license. No package manifest, build dependency or backend appears in the complete seven-file tree. A source token scan of the full runtime found zero matches for HTTP URLs, fetch/XHR/socket calls, external script/link loads or image tags. This supports a local static closure hypothesis, not a cold-offline pass.

State lives in memory. Notes are not persisted. One unguarded `localStorage` trophy write follows the loss reload call, keyed with `OS13kTrophy`; navigation timing and denied-storage behavior need testing. A reload discards randomized addresses, money and notes. This is not an existing resumable campaign.

The dynamic page renderer calls `eval(db[toRender])`; `addTask()` uses string-valued timers with interpolated text, including a path from entered target information. These violate current code-quality rules. The entire `db` dispatch needs conversion to ordinary callbacks if Main ever revisits this candidate. Rendering swallows errors. Browser-vendor-specific text hitbox guesses, fixed 800-pixel canvas/sidebar offsets, five-second forced intro and render-count death timing are additional concrete port blockers. Full source was read, but no route was executed and the archived distribution zip was deliberately not inspected.

### Conditional adaptation and bounded work

This is a rejection analysis, not an instruction to spend implementation time. If Main separately reverses the content decision and closes rights, retain the source story and puzzle logic rather than quietly inventing a different game.

| Task and sole owner | Exact boundary | Deliverable and limit |
| --- | --- | --- |
| Main: suitability/source gate | Source report and retained notices only | Decide audience, verify contest-author linkage and embedded sound license. Stop before runtime work if either fails. No promised outreach. |
| Runtime worker, serial slice A | Future approved game `net.html` only | Replace page-string evaluation and string timers with ordinary functions while preserving routes. A bounded proof on a few routes first; estimate 2-4 hours total, uncertain, split into <=10-minute checkpoints. Stop if this becomes a rewritten game. |
| Same runtime owner, later slices | Same `net.html`, never concurrent with slice A | One terminal outcome transition; deliberate restart; actual simulation pause including hack timing and sound; denied-storage guard. Each change leaves a small runnable regression. |
| Shell worker after runtime contract | Future approved `index.html` only | Replace forced timer with explicit warning/Play/Back controls. Honest content warning, mute before play, visible focus, native labels, flat shell, black action buttons and existing local fonts or system fallback. |
| Main integration and input owner, serial | `net.html` after its prior owner finishes | Responsive canvas coordinates plus native, keyboard-focusable link actions from the existing page data, >=44px targets and touch pointer handling. Do not claim accessibility by adding only WASD. |
| Main verification | Evidence/report paths, no source ownership overlap | Compare real desktop/mobile play, readable notes, silent play and both shell themes. Images/catalog remain Main-only and separate gates. |

A 2D simulated desktop is the existing game identity; a 3D conversion adds cost without improving this clue loop. Provisional port cap, **estimate not measurement**: under 100 KiB game text plus notices, no newly downloaded media, 30/60 FPS goals at phone/desktop sizes. Current animation is continuous even on static pages. Timing and high-contrast full-page flicker need repair before any comfort claim; no N100 or mobile GPU cost has been measured.

Acceptance, if ever reopened: use ordinary clicks/typing to follow the clues, obtain the funds, rescue and reach one win; separately trigger hack loss and restart into genuinely fresh state. Verify Home escape during hacking, stop/resume without accrued damage, silent play with equivalent visible warnings, and no repeated win dialogs. Negative fixtures: invalid simulated address stays inside the game, cancelled prompt is safe, quoted/backslashed user text remains data, blocked storage does not break loss, pointer cancellation and focus loss clear held input, resized canvas links still match displayed labels. Test 320/390-pixel portrait notes without clipping. Cold-cache offline loading must produce no external request, including after every route, win and loss. Confirm bounded timers and exactly one animation loop after repeated restarts. None of these has passed here.

### Owner questions and fallback

- Is this explicit kidnapping/trafficking/murder story acceptable for the portal's intended audience? Recommendation: no; keep this candidate rejected, not cosmetically sanitized.
- If unusually approved, are the callback conversion and full keyboard-link interface worth the cost? Recommendation: research a cleaner suspense game instead.
- Fallback research lead: `d-jeffery/achluophobia-game`, surfaced by the successful search as a minimalist js13k horror game. Search metadata provided no license object, which is **not proof that no license exists**. No revision, files, controls or asset grant were checked, so it is not a third selected plan or a licensed fallback promise. A fresh bounded task must resolve the tree, license and actual play routes before selection.

## 2. Survival/escape slot: Cat Shooter Ritual Catacombs, Director's Cut

### Identity, availability and disposition

Actual repository: <https://github.com/dkozhukhar/cat-shooter>, revision **`72bf9b9b4fd78871a00ad858c2d07901d6ece29d`**. License author: **Dmytro Kozhukhar**, copyright 2025. The README identifies the Director's Cut; use that version name factually, not as portal-created branding. The 13-level root game is different from the historical `js13k-2025-version/` entry. Do not substitute the archived/minified build without rechecking its content.

**HOLD, not GO.** This is a real compact survival shooter/escape game with authored maps, enemies, resource gates and endings. There are no external game-asset files in its inspected runtime. Main must nevertheless resolve source provenance concerns, audience acceptance of attacking cat-shaped monsters, and substantial input/comfort/correctness gaps. The upstream postmortem explicitly discloses heavy AI assistance. It is an existing upstream game, not a newly invented worker replacement; that fact does not establish originality of every formula or generated passage. Main must accept or reject that provenance explicitly rather than relabelling it as wholly human-created.

Pinned raw HTTP 200 files, fully read:

- [LICENSE](https://raw.githubusercontent.com/dkozhukhar/cat-shooter/72bf9b9b4fd78871a00ad858c2d07901d6ece29d/LICENSE), 1,073 bytes: `Copyright (c) 2025 Dmytro Kozhukhar`, MIT grant.
- [README.md](https://raw.githubusercontent.com/dkozhukhar/cat-shooter/72bf9b9b4fd78871a00ad858c2d07901d6ece29d/README.md), 1,463 bytes: `Collect glowing shards, open runic doors, survive the ritual of nine lives.`
- [POSTMORTEM.md](https://raw.githubusercontent.com/dkozhukhar/cat-shooter/72bf9b9b4fd78871a00ad858c2d07901d6ece29d/POSTMORTEM.md), 5,857 bytes: source/procedural models/AI workflow explanation. Its five-minute completion and performance statements are author claims, not worker measurements.
- [index.html](https://raw.githubusercontent.com/dkozhukhar/cat-shooter/72bf9b9b4fd78871a00ad858c2d07901d6ece29d/index.html), 93,721 bytes, 2,217 lines: entire unminified runtime including CSS, maps, synthesis, WebGL2 shaders, controls and outcomes.

### Concrete play loop and outcome

Move through 13 fixed ASCII-defined catacomb maps. The early free-exit rooms introduce movement and threats; collect nearby shards to open doors requiring three or six, collect healing spheres, avoid turret projectiles and manage enemies. Shooting a black cat changes it into a temporary white wraith rather than being a straightforward kill. Looking at a nearby wraith drains health, so aiming and avoidance are meaningful competing actions. Door entry advances a map; every third index sets an in-memory checkpoint. HP and shard count are the progress HUD.

The final boss has nine lives; shoot exposed eyes during the vulnerable phase while avoiding gaze damage and orbs. `showEnd('bossWin', ...)` implements boss victory; a separate `ritualWin` branch exists after exhausting levels. The postmortem claims an alternate final passage, but the inspected last map has a boss and no door marker. **Do not promise a reachable alternate ending** until normal-input play establishes it. HP reaching zero sets failure; clicking restarts from the checkpoint. Victory restarts from level zero after an imposed 60-second lock. Some failure paths set `endState='fail'` without calling `showEnd`, leaving inconsistent terminal presentation.

Existing input: WASD move, mouse look while pointer-locked, left click shoot/start audio, right mouse move forward, Escape unlock cursor, square brackets adjust sensitivity. V toggles an aim diagnostic. There is no touch path or keyboard-only look/fire path. Escape currently does **not** pause: the pointer-lock-change handler is empty and the simulation keeps running. Closing a portal view without teardown is not a safe exit implementation.

### Code versus assets matrix

| Component | Evidence and grant | Disposition |
| --- | --- | --- |
| HTML/JS/GLSL game and map strings | Root MIT license; root source contains the actual game, not just a permissive rendering engine. | License text verified. Retain verbatim; Main reviews disclosed AI provenance and any unattributed borrowed routines before source GO. |
| Models | `sdCatModelAt`, `sdCatScaled`, capsules, ellipsoids and boxes in inline GLSL. No GLB/OBJ/model request or runtime model file. | Procedural source is part of the licensed software. No separate model download/grant asserted. Inspect originality/attribution concerns rather than borrowing Foldwild or commercial characters. |
| Textures/art | GLSL material functions and `buildTileTexture()` from map strings. No image input. | Same source-license basis for the embedded procedural implementation, not a blanket image-assets clearance. |
| Audio/music | Web Audio oscillators, noise buffers and scheduling in the same file. Comment says minimal `zzfx`-style shot sound, but implementation uses local oscillator code, not the Unseen Network's minified ZzFX block. | No recorded sample detected. Exact third-party derivation/notice status is not independently proven; **HOLD for Main's provenance review**, not an invented separate audio license. |
| Fonts | `system-ui,sans-serif`. | No bundled font asset; no remote font dependency. |
| Preview PNGs, video thumbnails and video | Listed in README/tree only; not runtime dependencies; not fetched. No independently established promotional-image grant. | **HOLD/exclude.** Main owns any later image decision. Do not download YouTube artwork for the catalog. |

### Bootstrap, local closure, state and defects

Single root HTML -> `getContext('webgl2')` -> renderer sizing -> eager `AudioContext` -> ASCII maps and generated tile texture -> inline shader compilation/link -> `loadLevel(LEVELS[0])` -> input handlers -> one `requestAnimationFrame` chain. No backend, npm/package manifest, network request or external runtime dependency is required by the inspected entry. Repository minification tools and zip outputs are optional historical artifacts, not an instruction to install build tools. Preserve the unminified source and license in any separately approved port.

Complete source scan found zero matches for HTTP URLs, fetch/XHR/socket calls, external script/link loads or image tags, and **zero localStorage/sessionStorage mentions**. README media links are documentation, not runtime loads. No persistent save exists: checkpoint state is only memory and reload starts over. The full 93,721-byte entry plus 1,073-byte notice is a **94,794-byte source closure candidate**, not a measured compressed download. Cold-offline execution remains unverified.

Concrete source risks that make tiny bytes misleading:

- Missing WebGL2/null-context handling: resize calls `gl.viewport` before a useful fallback. Shader failure logs rather than presenting a safe exit.
- No true pause, visibility/input clearing, audio mute or touch input. Simulation delta is not clamped after background time.
- Turret/orb updates and pickup processing occur outside the principal `!gameOver` guards. A victory may be damaged or overwritten by continuing simulation; verify and freeze all gameplay at the shared boundary.
- CPU `MAX_SPHERES` is 17 while shader capacity is 8; source uploads CPU-sized arrays. Real WebGL error behavior must be measured, not assumed harmless.
- GPU rendering selects four nearest cats and four nearest spheres, while more simulated objects exist. Collected spheres can occupy selection slots. Invisible attacks/pickups are a concrete candidate defect to reproduce before performance tuning.
- Map widths are taken from the first row despite uneven row lengths. Validate intended playable cells and escape paths instead of silently regularizing every map.
- Win restart waits 60 seconds; failure paths and the `resetGame()` helper differ. Multiple sound timers/oscillators require real teardown/pause handling.

Coverage: full root runtime, README, postmortem and license; complete untruncated repository path/size metadata. Historical/minified runtime variants, zip contents and preview images were not read. No shader was executed, screenshot reviewed or hardware profiled.

### Conditional adaptation and bounded work

Retain the existing game, ASCII levels, procedural enemy identity and survival mechanics. No franchise reskin, Backrooms branding, commercial promo art, replacement models or new episode. A 3D view is intrinsic to gaze avoidance and aiming, so flattening it to 2D would be a different game. This is research about an existing 3D game, not a new 3D implementation order; Main must reconcile the required implementation-worker model with project rules before authorizing work.

| Task and sole owner | Disjoint boundary or serial handoff | Candidate-specific result |
| --- | --- | --- |
| Main: provenance and suitability gate | Source report/notices, no runtime | Decide disclosed AI-source acceptability, code/audio/shader notice questions, and animal-shaped-enemy content. No art-rights outreach promised. |
| Runtime worker A | Future approved game `index.html` only | First <=10-minute diagnostic slice: reproduce WebGL array-capacity mismatch and visibility-selection bugs. Subsequent small serial slices fix demonstrated shared causes, preserve enemy count/rules, and add one runnable assertion-based check for upload bounds/active-object selection. |
| Same runtime owner, later task | `index.html` after A completes | One play/pause/end transition boundary for motion, turrets, pickups and sound; clear input on blur/pointer unlock; immediate explicit restart/exit instead of forced wait; WebGL/audio failure path. Separate checkpoints, no concurrent editing of the monolith. |
| Input worker B | Future `controls.js` only, after Main agrees a small exported input contract | Map touch move/look/fire and keyboard-only look/fire to the same real actions. >=44px controls, pointer capture/cancel handling and no synthetic-mouse acceptance substitution. No new input framework or duplicated game logic. |
| Main shell integration | `index.html` after prior runtime owners finish; optional `shell.css` owned only here | Explicit Play with sound choice, visible Pause/Resume/Restart/Back, reduced flash/shake, readable HP/shard labels and non-color-only pickup hints. Flat shell, black actions, local house fonts or system fallback; keep upstream scene art unchanged. |
| Main QA | Evidence files only | Ordinary-input full route, failure/checkpoint restart, muted run, desktop/mobile theme review, closure and performance. Later images/catalog remain separate Main-owned gates. |

A single-file game prevents parallel runtime edits; the serial leases above are deliberate. Notice/report work, an agreed input adapter and verification evidence can have disjoint paths, but no two workers should patch the same root entry at once. Estimates, **not commitments or measured effort**: 0.5-1 day source/defect triage, 1-2 days controls/pause/comfort fixes, then 0.5-1 day normal-input testing if the GPU defects are small. Reject if these require a renderer/game rewrite. Every mechanical slice is <=10 minutes where practical and never over the separately approved limit.

Provisional budget: keep source plus notices/adapters under 256 KiB, zero downloaded game media and zero backend. Existing internal resolution presets range 640x480 to 192x144; frame sampling lowers resolution below 55 FPS. Those constants are not achieved performance. The ray marcher can take 128 steps per pixel plus procedural model/material work, so bandwidth-light is not GPU-light. Target 60 FPS desktop, 30 FPS low setting; record frame-time distribution, selected render resolution, readability and memory on actual target hardware. N100/8 GB acceptance and mobile thermals are **unknown**, not certified. Do not hide unseen enemies merely to hit a frame-rate target.

Acceptance after source GO:

- Use real WASD/mouse, keyboard-only actions and actual touch separately to traverse introduction, collect required shards, open locked doors and reach a checkpoint. Confirm shooting changes a black cat into the expected wraith and gaze drain stops when looking away.
- Complete the boss by normal aiming and all nine vulnerable-life reductions. Record which ending is actually reachable; do not count a state grant or direct `showEnd()` call as play proof. Lose normally, restart at the correct checkpoint with HP restored and all per-level pickups/enemies reset; win restart must begin at zero.
- Pause at a turret, during gaze drain and during a shot. HP, projectiles, timers and sound must remain frozen; resume must not apply a background delta jump. Back/Escape must release pointer lock and stop audio safely, with focus returned to a usable control.
- Negative fixtures, separately labelled: deny WebGL2/audio/pointer lock, force context loss, cancel a held touch, resize portrait/landscape, blur with W/right mouse held, revisit ending with a projectile active, and stress CPU/shader array capacities. No crash, stuck movement, invisible active threat or continued damage after outcome is acceptable.
- Reduced-motion/flash mode must suppress shake/muzzle and fear pulses without suppressing hazard information. Muted play must retain visible enemy/door/health cues. Enemy/pickup categories cannot rely on hue alone. HUD must fit 320/390-pixel layouts with readable contrast and focus.
- Cold-cache network-blocked load and an entire run must require only local approved files. Repeat at least ten restarts and level changes; inspect texture deletion, timer/audio-node growth and frame pacing. Full catalog smoke is a later release gate, not substituted by this source review. Native passes here: zero.

### Owner questions and fallback

- Is this existing upstream's disclosed AI-assisted development acceptable for an ingested port? If not, reject rather than generating a replacement.
- Does attacking supernatural cat forms fit the intended audience? Do not quietly rebrand them as unrelated licensed characters.
- Is a larger mobile-input/comfort repair acceptable, or should this slot require touch-ready upstream code? No delivery date is promised.
- Fallback research lead: `jonathan-vallet/js13k-2018`, returned by the successful search as a survival horror game with an offline theme. Only search metadata was seen; no license object was returned. Revision, content and rights remain unverified. Treat it as a lead requiring a new source task, not an approved third candidate or a promise to contact its author.

## Comparison, exclusions and verification limits

| Concern | Unseen Network | Ritual Catacombs |
| --- | --- | --- |
| Distinct experience | 2D clue-based simulated-browser suspense. | 3D movement, resource-gated survival and boss aiming. |
| Scare intensity, source-derived only | Severe subject matter; sudden hack sounds and whole-page high-contrast/filter changes. Not mild psychological exploration. | Pursuit, gaze damage, horror ambience, gunshot transients, flashes and camera shake. Subjective intensity not play-reviewed. |
| Audio accessibility today | Synthesized feedback, no mute; visible page text exists but flash/audio distress remains. | Synthesized ambience/SFX, no mute; HUD supports some silent information but hazard readability is unverified. |
| Pause and safe exit today | No pause; dangerous page can be escaped with Home, which is not a portal exit. | Escape releases pointer lock without stopping danger. No safe game pause. |
| Decision | REJECT current content; suspense slot vacant pending better research. | HOLD for provenance, source defects, input/comfort and runtime evidence. |

Reject franchise/Backrooms routes that depend on copied characters, map art, logos, code or promotional imagery without explicit applicable rights. A public fan repository, engine MIT badge or free Sketchfab model is not a licensed playable game. No such route was advanced here. Search results for unlicensed-looking games were not promoted to licensed candidates merely because GitHub returned them. No original Foldwild assets or hidden encounter was used. No images or screenshots are delivered by this worker.

`python3 -B scripts/check_maintenance_docs.py` was actually run and was **blocked**, with output:

```text
AssertionError: Commit inspected source changes before validating its inventory.
```

At that moment `git status --short` showed ` M Games/Foldwild/script.js`, a concurrent, non-owned change. This worker did not touch it and does not claim inventory freshness for that writer's source change. The document-only work leaves the catalog/game count unchanged. Re-run the checker after the source owner commits and updates its manual/inventory; do not alter its changes to make this gate pass.

No runtime/native tests, offline browser passes, full-catalog smoke, hardware certification or visual approval occurred. Source HTTP checks are not those gates. No game was added, ingested, built or registered; no build/register commit pair exists. Main must separately decide whether any source-cleared candidate merits implementation, then registration, then release. No push or unattended month-long work is promised.
