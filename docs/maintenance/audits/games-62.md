# Delegation 62: legacy/compiled game source audit

## Scope and evidence

Documentation only, source baseline **`8c8a055`**, actual provider/model
**`openai-codex/gpt-6.1-sol`** (printed from PI environment). No runtime changes,
Games materialization, sparse changes, registration, new games, source downloads,
dependency installs, browser servers or push. Fifteen registered games covered;
Main owns legal/release decisions, UI review and full catalog native gate.

The assigned trees contain **1,154 files / 465,098,935 logical bytes**. Git blobs
were accessed without broad checkout; bounded text/excerpts used temporary
storage, not a scratch repository. SWF/WASM/compressed engines were not decoded.
Large JS bundles received parser scans and selected interface review, **not full
human review**. Every manual names reviewed and unreviewed boundaries. Binary
art/music/model rights remain unverified. A local bootstrap is not proof the
movie/engine is offline or fully playable.

Historical `docs/audit_batches`, catalog fragments/source papers and wiki were
searched/read for assigned-game evidence. Old grades and partially played
reports are history, not current passes. Relevant report extracts were bounded;
no historical file was rewritten. Current catalog is **115**, not the historical
120-game assumption.

## Ranked source findings

All findings below are **static-only, open, no runtime fix authorized** unless
explicitly marked historical. Suggested native repro is a future check, not
something run by this worker. File paths are repository-relative; matching
anchors are stable when vendor line numbers are compressed or huge.

| Priority/severity | Path / line or matching anchor | Impact and minimal root fix | Recommended repro / status |
|---|---|---|---|
| 1 HIGH rights | `Games/CookieClicker/index.html`, copyright/no-rehosting comment; `readme.md` | README's broad reuse claim conflicts with explicit supplied notice. Obtain authoritative permission; preserve notice, do not infer MIT or delete. | Owner/legal evidence review; confirmed source conflict. |
| 2 HIGH privacy | `Games/Superhot/main.js`, first-line attribution; `Games/DriftBoss/game.js`, cannon metadata around 49215 | Personal contact data in existing source. Main must preserve legitimate attribution while resolving repository privacy policy; no values reproduced. | Escalated via operator help, source untouched. |
| 3 HIGH save integrity | `Games/CookieClicker/main.js`, `Game.localStorageSet` around 1952 / `Game.WriteSave` around 2184 | Swallowed write failure can report saved when stale data still exists. Return actual write success and preserve export/backup. | Existing save, deny next write, request Save and compare reload. Static defect. |
| 4 HIGH save recovery | `Games/TempleRun2/bundle_original.js`, `LocalStore.getItem`/`JSON.parse`, around 162983 | Corrupt `TR2_GAME_STATE` aborts restore; unguarded write can fail. Validate/guard the shared persistence boundary. | Corrupt key, denied/quota writes, recover without losing backup. Static risk. |
| 5 HIGH save recovery | `Games/Vex7/vex7.min.js`, SaveGame constructor / `saveProgress` | Raw parse/read/write of `vex7_sg` can fail; cookieEnabled is not storage capability. Guard and validate SaveGame centrally. | Invalid JSON, storage denied, checkpoint save/reload. Static risk. |
| 6 HIGH conditional offline | `Games/Vex7/gamedistribution/js/main.min.js`, IMA URL list / `gd__resume__button` | Local telemetry rewrite does not close other remote SDK script/image branches. Trace reachability and use approved inert local ad semantics. | Activate ad/continue branches while recording blocked requests. Not observed egress here. |
| 7 HIGH historical play/offline hold | `Games/BloonsTD/btd/index.html`, `player.load`; `storage/ruffle/ruffle.js`, allowNetworking default | Prior report found BTD1 depended on remote MochiAds movie. Obtain a legitimate complete local source or compatible local policy; never enable remote loader to claim offline play. | Boot all four children, not hub alone. Historical failure, not rerun. |
| 8 MEDIUM progress | `Games/BaldisBasics/index.html`, `UnityProgress(gameInstance,"complete")`; `TemplateData/UnityProgress.js` | Numeric math receives string, creates NaN percentages and misses `==1` hiding. Pass numeric 1 or a separate completion API. | Inspect style values/runtime callback completion. Deterministic static mismatch. |
| 9 MEDIUM geometry | `Games/BaldisBasics/index.html`, `.webgl-content` top rules | `top:auto !important` defeats `top:50%`, with translateY(-50%). Correct competing centering rule. | Computed geometry and desktop/portrait screenshots. Static conflict. |
| 10 MEDIUM support fallback | `Games/CutTheRope/scripts/ctr.js`, `ft` / `_gaq.push`, around 163 | Unsupported-feature fallback references absent analytics global. Remove dead analytics call, retain local unsupported-browser message. | Disable a required feature and inspect fallback. Static missing dependency. |
| 11 MEDIUM storage | `Games/CutTheRope/scripts/ctr.js`, `za`, 109-110 | Storage operations after initial probe are unguarded. Handle denial/quota centrally and expose unsaved state. | Denied writes/read failure, preferences and level progress. Static risk. |
| 12 MEDIUM loader | `Games/FancyPantsAdventure3/index.html`, `loadLocalRuffle` / window load | Fallback has no own error handler and player creation assumes Ruffle exists even if both scripts fail. Chain readiness/errors and player load once. | Fail both scripts; delayed fallback is a separate timing check. Missing recovery confirmed; ordinary-load race not established. |
| 13 MEDIUM loader | `Games/Vex7/index.html`, `addScript` | Missing script onerror leaves spinner with no actionable state. Add error handling at shared helper. | Fail version or game script. Static missing recovery. |
| 14 MEDIUM readiness | `Games/TempleRun2/index.html`, canvas-or-tries interval | Canvas existence/timeout hides loader without proving ready or showing failure. Use actual ready/error signal. | Fail a late dependency after canvas creation. Static false-readiness criterion. |
| 15 MEDIUM dialog action | `Games/GeometryDashLite/index.html`, DOMContentLoaded OK scan | Programmatically accepts any matching OK button. Remove broad automation; retain user acknowledgement. | Force compatibility warning, verify no automatic click. Static behavior. |
| 16 MEDIUM dismiss | `Games/DriftBoss/index.html`, controls-hint pointer-events / dismiss span | Click-through parent also prevents normal dismiss click; span is not keyboard control. Use a pointer-enabled native button with focus/44px size. | Pointer and Tab/Enter dismiss. Static defect. |
| 17 MEDIUM malformed saves | `Games/DriftBoss/game.js`, `ig.Storage.get` / `loadAll`; Cookie minigame `M.load` | Raw text fallback and unvalidated fields/indices can corrupt restore or throw. Validate at restore boundary, retain original backup. | Malformed JSON/object/minigame records. Static risk; no payload executed. |
| 18 HIGH conditional offline | Papa/Temple entry `var external`, XHR/fetch overrides; Cut `CTRBKCodes` around 393 | Host denylist/two transports cannot prove total offline closure; redemption backend reachability is unverified. Trace requests then constrain boundary, not remote repointing. | Scheme/transport and real movie/SDK branches; no observed egress here. |

All fifteen games also have unresolved game/assets redistribution evidence;
Ruffle/component notices are not game permission. Retro Bowl's Echo MIT notice
and New Star Games attribution have different evidentiary scope. Geometry's
`DefaultCompany`/`GeometryDashLife` metadata cannot prove official origin.
Papas/Baldi/Temple mirror comments name acquisition sources but were not compared
against authoritative licensed upstream code. No copyright owner was guessed
from a familiar franchise.

## Historical holds and corrected assumptions

- `playtest_r1.md` recorded Retro Bowl `cpd;` and blank canvas. Current source has
  **zero `cpd;` matches** and parses. Virtual option/save filenames still occur;
  their absent physical files alone are not a proven game defect.
- Legacy cloak, shared Ruffle and icon references previously called 404 now exist
  in Git. Shared cloak is a no-op. Fancy's “cdnScript” is local; do not audit its
  variable name as a CDN request.
- `playtest_2.md` did not establish Papa's pizza shift play. `playtest_r1.md`
  reached Dawn's menu but did not complete survival; Super Hot's software-GL
  failure was environment-limited. None is a new result.
- Cut's reported video abort needs actual intro/outro panel tracing, not failure
  filtering. Current entry no longer includes the old cloak/icon references.
- `playtest_r4.md` held Drift's menu-start input and Cookie's uncompleted wipe.
  These remain play-validation holds even where static controls/reset exist.
- Engine eval/function constructors, XML namespaces, commented donation markup
  and debug/documentation URLs are not automatically demonstrated XSS/egress.

## Individual manuals

| Id | Manual | Source files | Source bytes |
|---|---|---:|---:|
| 53 | [Papa's Pizzeria](../games/053-papaspizzeria.md) | 5 | 9,523,385 |
| 54 | [Retro Bowl](../games/054-retrobowl.md) | 36 | 5,592,513 |
| 55 | [Super Hot](../games/055-superhot.md) | 8 | 45,537,221 |
| 56 | [10 Minutes Till Dawn](../games/056-tenminutestilldawn.md) | 7 | 50,485,494 |
| 57 | [Fleeing the Complex](../games/057-fleeingthecomplex.md) | 12 | 60,666,680 |
| 58 | [Infiltrating the Airship](../games/058-infiltratingtheairship.md) | 12 | 55,918,858 |
| 59 | [Baldi's Basics](../games/059-baldisbasics.md) | 12 | 37,508,155 |
| 60 | [Temple Run 2](../games/060-templerun2.md) | 120 | 26,868,963 |
| 62 | [Cut the Rope](../games/062-cuttherope.md) | 344 | 26,063,657 |
| 63 | [Fancy Pants Adventure 3](../games/063-fancypantsadventure3.md) | 4 | 42,038,294 |
| 64 | [Vex 7](../games/064-vex7.md) | 119 | 30,646,277 |
| 66 | [Geometry Dash Lite](../games/066-geometrydashlite.md) | 33 | 54,991,081 |
| 79 | [Cookie Clicker](../games/079-cookieclicker.md) | 336 | 5,801,012 |
| 80 | [Bloons TD](../games/080-bloonstd.md) | 9 | 5,918,198 |
| 81 | [Drift Boss](../games/081-driftboss.md) | 97 | 7,539,147 |

The fifteen manuals initially totaled **86,188 logical documentation bytes**;
finish-only review corrected the fallback timing finding without changing runtime.
This audit is additional sub-megabyte prose, not a game-engine copy. Initial
temporary text evidence occupied about 2.3 MB; finish-only extraction adds less
than 0.3 MB. Shared filesystem growth is not attributed to this task. Disk checks
remained at displayed **2.4G free**, above the 2 GB normal floor.

## Verification actually run

Finish-only delegation 70 reread all fifteen manuals, this audit, prior task log,
all fifteen frozen entries, selected small CSS/bootstrap sources and selected
save/SDK excerpts. It corrected Fancy's unproven ordinary-load race to the
source-confirmed missing fallback failure recovery. Runtime trees were compared
with `8c8a055` and all fifteen still match their supplied tree IDs. Large compiled
engines remain sampled, not fully human-reviewed.

Fresh finish-only output:

```text
PASS 15 identity markers, 135 required sections, frozen/current source entry/tree IDs, privacy/copy checks
PASS catalog 115 unique IDs; 15 assigned entry URLs resolve in Git
TREE totals: 1154 files / 465098935 bytes
PASS 33 external JS stdin checks; 17 executable assigned-entry inline checks
PASS 5 paired Ruffle metadata/notice blob comparisons
PASS: 120 game documents cover 115 registered + 5 unregistered games; Git inventory current.
Coverage only: section presence does not certify documentation accuracy or gameplay.
```

The coverage checker was run without inventory refresh. Native runs remain zero;
no other worker's browser evidence is attributed to this task.

- Source SHA, entry/tree identities and assigned catalog URLs checked via Git.
- Printed output: `PASS 15 identity markers, 135 required sections, source
  entry/tree IDs, privacy/copy checks`.
- Printed output: `PASS catalog 115 unique IDs; 15 assigned entry URLs resolve
  in Git`.
- Stdin `node --check` passed on 33 selected external JS blobs, including large
  engine bundles, local SDKs/loaders, Cookie minigames and supporting libraries;
  17 executable assigned-entry inline scripts also parsed. This is syntax,
  **not API compatibility, gameplay, licensing or security certification**.
- Fleeing/Airship README/package/license blob comparisons returned `True`.
- `git diff --check` on owned manuals produced no errors. Final owned-path check
  and explicit-path anonymous commit are recorded in worker completion.
- **Native runs 0; screenshots 0; full catalog smoke 0.** Do not interpret these
  parser results as a release gate. Main performs unfiltered serial smoke and
  subjective desktop/mobile screenshot review independently.

Reproducible source checks require no Games checkout, for example:

```sh
git show HEAD:Games/CookieClicker/main.js | node --check
git show HEAD:Games/Vex7/vex7.min.js | node --check
git ls-tree -rlz HEAD Games/BloonsTD
```

Use the per-game Verification sections for recommended interaction/save/network
checks. A later Main-approved narrow lease must preserve sparse selection, disk
floor and bounded-server cleanup. No worker full-catalog browser run is implied.

## Month priorities and handoff

Week 1: owner rights/privacy review and reproduce held Papa/Bloons/Drift play
paths; export saves before any runtime work. Week 2: smallest approved wrapper
progress/loader/dismiss/focus fixes, plus validated save recovery with one runnable
regression per nontrivial boundary. Week 3: real desktop/mobile replay, offline
branch capture and hardware profiling for old Unity and dual-canvas builds.
Week 4: source/notice pins, save migrations and rollback evidence before release.
New 3D experiences remain Main's research/permission plan, not fabricated ports
or standing authorization. No added game, new art/font/backend or publication is
part of this delegation.
