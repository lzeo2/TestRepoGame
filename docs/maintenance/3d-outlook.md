# Four-week 3D refurbishment and source-first outlook

Planning/research only. Baseline is `8c8a055813b35bbd5d8b632423328333b4252d43`, with **115 registered games**, Circuit Ward 222 and Spline Ride 224 already occupied, and Foldwild unregistered. No ID is reserved here. Historical `next-3d-wave-scope.md` counts/allocations describe an earlier milestone and must not be reapplied. A few more lightweight playable 3D experiences is a conditional owner goal, not permission to fabricate games when sources/rights fail.

Main owns design, written scope, candidate selection, subjective screenshots and final integration. Each later mechanical task uses actual `openai-codex/gpt-6.1-sol`, disjoint paths and <=20 minutes, normally shorter. No month-long background agent, automatic build queue, registration/publication or push is promised. Runtime remains read-only in this delegation.

## Week 1: restore trust in current behavior

1. Main reproduces Foldwild's unchanged foreground M2 single-tap close failure at 390-to-320 resize, preserving the exact event/readiness assertion. Existing CSS heading basis fixes reflow, not proven root cause. Seven-stage traced success and three negative fixtures are developer evidence with altered timing; obtain stable uninstrumented native evidence before closing the hold.
2. Trace `collection-close` -> native dialog `close` -> `closeInspection` canvas reparent -> `showWorld`/resize/focus. Patch only a demonstrated shared cause. No repeated tapping, mouse substitution, timeout inflation or weaker failure filters.
3. Triage context-loss start/fallback paths in Circuit Ward/Foldwild/Spline Ride. Preserve Foldwild button/text gameplay and saves when graphics fail; Circuit's lost-context Menu must not start an invisible simulation.
4. Confirm scoped rights records for current game code/art; keep original meshes and pending candidate bytes immutable. Deliver a ranked hold list with exact anchors, a small authored regression for any runtime fix and Main's desktop/mobile screenshot judgment.

Checkpoint: existing experiences reliably start/pause/reset/restore with bounded failure UI, or explicit unresolved failures. No new port before this checkpoint's required fixes/rights decisions. A lack of stable native evidence is an honest hold, not a documentation gap to fill with a pass claim.

## Week 2: high-value refurbishment, not an engine rewrite

Address Spline Ride repeated toggle keys, keyboard orbit/zoom needs and idle rendering only after interaction review. Measure paused Circuit rendering and resource teardown; retain four-cover simulation, six waves, primitive fallback and manual LAN pairing. Foldwild work focuses on save refusal/backup, release guards, inspector/camera controls and readable mobile battle HUD. Existing fonts/native controls/flat solid shell are sufficient; no new runtime font, CDN, shader-effects suite or decorative launch screen.

Gather real native screenshots for desktop/mobile in both relevant themes and document exactly which flows were exercised. Natural creature acquisition/evolution and all-model accessory fit are independent from seeded fixtures. Full campaign finale, class ranks, per-limb character animation, frontier and hidden horror encounter remain deferred unless separately scoped. Three uploaded Circuit vehicle GLBs remain unused deliveries: there is no driving, merge tier or 1–4 vehicle ability implementation to refurbish yet.

Checkpoint: bounded authored patches and fresh focused checks, existing original models unchanged, source/source-license records intact. Main chooses any new feature separately after reviewing current identity and usefulness.

## Week 3: conditional 3D source slots

Research up to three candidates in short source-only tasks. Select none rather than invent a replacement if rights/dependency closure fails. Candidate requirements: real play/start/progress/outcome/reset, source revision pinned, code license **and** model/texture/audio/font grants verified, local offline closure, actual keyboard/touch play proof and resource size suitable for storage/device budget. A permissive engine alone is not a licensed game.

### Actual bounded upstream research, 2026-10-02 UTC

GitHub repository/default-branch metadata, commit and recursive Trees API were queried using stdlib urllib; small raw notices/entries were fetched at the resolved commit. All three tree responses had `truncated=false`. No clone/archive/engine/art download, package installation or browser occurred. Tree sums below include all repository blobs, not an optimized runtime bundle, compressed transfer size, GPU memory or permission-cleared ingestion size. Moving branches are explicitly recorded; these pinned observations do not automatically adopt later updates.

| Candidate | Verified repository/default branch and revision | Tree measurement | Decision |
| --- | --- | ---: | --- |
| HexGL | <https://github.com/BKcore/HexGL>, `master`, `6addc95a2fce3bf05f4d751823cc054c61a16d68` | 198 blobs, 20,421,268 bytes | **PENDING**, not source GO |
| Trigger Rally Online Edition | <https://github.com/CodeArtemis/TriggerRally>, `gh-pages`, `079ac53216b74598b652ce3bf11478beb5c6832b` | 1,150 blobs, 13,607,073 bytes | **REJECT current content port** |
| OpenLara | <https://github.com/XProger/OpenLara>, `master`, `3b268ca4bf986c380f44a26ffd9218bf6d376249` | 606 blobs, 27,986,638 bytes | **REJECT bundled game-assets route** |

An initial `jareiko/TriggerRally` repository guess returned 404. GitHub repository search identified the actual CodeArtemis repository; its metadata/notices then succeeded. No failed guess is provenance evidence. All source URLs below use actual fetched revisions, not model memory.

### HexGL: most relevant play structure, unresolved exceptions

Author verified in root README/LICENSE: **Thibaut Despoulain (BKcore)**. Pinned notices: [LICENSE](https://github.com/BKcore/HexGL/blob/6addc95a2fce3bf05f4d751823cc054c61a16d68/LICENSE), [README](https://github.com/BKcore/HexGL/blob/6addc95a2fce3bf05f4d751823cc054c61a16d68/README.md), [audio/LICENSE](https://github.com/BKcore/HexGL/blob/6addc95a2fce3bf05f4d751823cc054c61a16d68/audio/LICENSE).

Root MIT notice is 2015 Thibaut Despoulain; README states code/resources are MIT **unless specified in the file**. Inspected `bkcore/hexgl/Gameplay.js` and `tracks/Cityscape.js` still carry **CC BY-NC 3.0** headers. That express exception prevents describing the whole game as unqualified MIT or cleared commercial reuse. Separate audio notice lists boost/wind/destroyed under CC BY 3.0 (named creators IFartInUrGeneralDirection, kangaroovindaloo, beman87), crash by qubodup and background by mu6k as public domain, with Licson adjustments and baleboy conversion. Those upstream assertions are scoped per file; a later port must retain attribution/license terms and verify corresponding actual audio files, rather than copying only MIT.

`index.html` credits Charnel's base ship model and Nobiax track texture. Their original grant/source chain and every texture/model/font exception are not independently closed in this research. `css/fonts.css` references BebasNeue local webfont formats but no complete font grant was established here. Do not infer asset clearance from a familiar ship filename or artist credit. These are pending provenance questions, not allegations based on franchise resemblance.

Actual source play structure: `launch.js` offers keyboard/touch/Leap/gamepad and LOW/MID/HIGH/VERY HIGH quality, starts loading Cityscape, and reloads after finish. `Gameplay.js` runs countdown, three checkpoint laps/time attack and destroyed outcome; it reads replay key `race-<track>-replay`. `Cityscape.load` has lower/full texture sets, collision/height image analysers, geometry files, skybox and audio. That is genuinely interactive racing source, unlike Spline Ride; native control mappings/performance have not been verified.

Offline adaptation must remove **actual Google Analytics script creation**, remote favicons and unsupported external redirects in entry; retain useful controls/loading/errors. Many old global Three/addon scripts and postprocessing dependencies remain; **do not replace this legacy engine with r160 by import substitution**. Lowest preset avoids some high material/texture paths, but runtime bytes/GPU draw count/mobile frame pacing were not measured. Next task is source/legal closure plus a bounded lower-preset dependency/asset manifest, not ingestion. If BY-NC is incompatible with intended use or original art/font permission cannot be established, reject. Source headers must not be silently removed as allegedly stale.

### Trigger Rally: explicit content restriction blocks redistribution

Verified creator/copyright attribution: **Code Artemis**, 2012–2013 unless otherwise attributed. [Pinned LICENSE.md](https://github.com/CodeArtemis/TriggerRally/blob/079ac53216b74598b652ce3bf11478beb5c6832b/LICENSE.md) licenses **source code GPL v3** but separately defines Content, permits original-site play/local caching and **prohibits modifying/redistributing Content without separate owner license**. Its FAQ explicitly says publishing a copy is generally not allowed. `server/public/scripts/templates/license.jade` repeats this distinction. Do not relabel this as AGPL or permissive asset reuse.

README at this branch says fully client-side, IndexedDB tracks/runs and JSON sharing, with online features unavailable. Root entry redirects to `server/public/`; inherited `server/package.json` includes legacy server/auth/database/proxy dependencies, but README does not require them for current static play. None was installed, started or approved. Full browser-script/asset closure, track completion/reset, mobile controls and actual N100 cost were not verified. GPL source alone does not clear the car/track/texture/audio content. Reject current-content ingestion; a total conversion would need separately licensed assets and could become a much larger unauthorized original-game project. Do not promise it as a lightweight month slot.

### OpenLara: permissive engine is not game data

Verified [LICENSE](https://github.com/XProger/OpenLara/blob/3b268ca4bf986c380f44a26ffd9218bf6d376249/LICENSE) is **BSD 2-Clause**, copyright 2018 Timur “XProger” Gagiev, not MIT. [README](https://github.com/XProger/OpenLara/blob/3b268ca4bf986c380f44a26ffd9218bf6d376249/README.md) calls it a classic Tomb Raider open-source engine and links an online demo level. That link is not redistribution permission for game data. No approved level/texture/audio grant was found in the fetched evidence; do not ingest demo/franchise assets or ROMs.

Inspected `src/platform/web/index.php` has PHP timestamp output, generated `OpenLara_wasm.js`/asm.js loader, 192 MiB configured memory, local level input (`.phd/.psx/.tr2/.tr4`), audio callback and fullscreen bridge. It also has Analytics and an optional GitHub changes fetch. The repository tree byte sum is source data, **not a measured compiled WebAssembly+level closure**. No compiled binary was downloaded, built or fully audited; no mobile/hardware/native play claim. Reject as this month's supplied-game-assets port. A lawful user-owned-file loader would be a separate explicit product/security scope, not a shortcut to a licensed offline catalog game.

Checkpoint: none of these three has final ingestion GO. HexGL is conditional research; other two are useful explicit rejections. If owner wants multiple new 3D games, broaden source-first research in new bounded tasks rather than forcing three “approved” rows. Existing Spline Ride is already an honest camera demo and is not counted as a new playable racing port.

## Week 4: sustained target-device and release evidence

Actual provisional target: **Intel N100, 8 GB RAM, 64 GB storage**. Hardware is unavailable now. Standard 60 FPS/low 30 FPS remain goals; desktop/headless counters are not proof. On acquired hardware, profile representative scenes with frame-time distributions, memory/context stability, load sizes and touch/keyboard usability. Compare the same route/settings before/after refurbishment; document software renderer results separately. Original GLBs remain immutable and no hidden-candidate optimization derivative exists.

Only separately authorized, source/asset-cleared games that pass real start/play/progress/outcome/reset and local closure may advance to owner registration decision. Revalidate free IDs from current catalog at that moment. Main runs unchanged full registered-game smoke serially after source freeze, reports failures/exclusions and reviews desktop/mobile theme screenshots. A blocked gate means no release or push. Report every new build/register commit pair if a later task actually adds a game; this research adds none.

## Evidence metadata and limits

| Target | Range | Meta method | Source point | Caption actor |
| --- | --- | --- | --- | --- |
| Current three experiences | Pinned Git wrappers/authored modules | Full authored source read; 20 ESM syntax checks | `8c8a055`, three manuals | Documentation worker; no subjective UI approval |
| Candidate repository inventory | Three default-branch pinned Trees API responses | Exact blob count/size sums, no truncation | URLs/revisions above, fetched 2026-10-02 UTC | Documentation worker; no native gameplay claim |
| Art/concept/native evidence | Prior reports only | Dated inherited evidence with holds | Foldwild M2/hidden, Circuit model/vehicle, Spline source reports | Main/operator owns image judgment and approval |

The method labels explain evidence scope; they do not substitute for grants, author verification, source hashes, hardware measurements or native execution. Current research uses small fetched notices/source only and adds no runtime third-party loads.
