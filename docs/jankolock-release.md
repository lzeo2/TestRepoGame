# JANKOLOCK build and targeted-QA receipt

2026-10-21. **Built and registered locally; no push, merge or publication.**
Game entry: `Games/Jankolock/index.html`, catalog **240 / JANKOLOCK**.
Catalog **126 games**, exactly one addition in this run. Content: **one arena,
three heroes, six abilities, six items**; no puzzle-level/solver claim after the
operator pivot. This is an explicitly
operator-authorized original game, not an ingested port or a new-game precedent.

## Design-pivot result

The operator resolved the reference as Valve's Deadlock. We translated genre
essence into an original office-themed Canvas2.5D arena: three heroes/two
abilities each, player + ally bot versus two enemy bots, central capture,
kills/respawns, first-to3 rounds and a three-item/one-pick intermission draft.
Tin Courier, Wobble Postmaster and Rattle Clerk have original names/drawings/
copy/synthesized sounds. No reference-game names, assets, text, code or marks
were ingested. A generic roster-name overlap detected by review was removed
from visible copy and runtime IDs. Research alternatives remain historical.

Gameplay is not a shoulder-camera shooter, full MOBA macro simulation or a
faithful port. Online remains documented phase2 only; no fake online control,
signaling/STUN/TURN/proxy/backend/account work. Original supplied bust is kept
unchanged in the optional local three.js lobby, never in combat. A simple pawn
bumps the pedestal; optional smash gag was not implemented or advertised.

Sources and authorization: [provenance](jankolock-provenance.md),
[research appendix](jankolock-research.md), [design](jankolock-design.md),
[interface](jankolock-build-contract.md),
[manual](maintenance/games/240-jankolock.md),
[game notices](../Games/Jankolock/CREDITS.md).

## Actual gates and receipts

### Native two-round gameplay: PASS

Final orchestrator command, pinned system Chromium and RAM-backed output:

```sh
TMPDIR=/dev/shm SMOKE_TMP=/dev/shm CHROMIUM_PATH=/usr/bin/chromium \
  python3 -B scripts/test_jankolock_browser.py --port 8916 --seconds 540
```

Actual final output:

```text
ROUND 1 complete: winner=0 reason=kill influence=[42.06666666666655, 34.76666666666705]
ROUND 2 complete: winner=0 reason=capture influence=[39.999999999999844, 25.466666666666725]
MOBILE PASS: simultaneous CDP touch; cancel stops move/fire; Q tap; pause/resume clock; reset
PASS: rounds=2 checks=3 errors=0 wall=79.12s
```

Hero selection, actual player/bot shots, both player abilities, capture,
combat deaths/completed respawns and two genuine player-team wins were observed.
Continue offered three distinct native item cards; Thick Envelope was selected,
one item per actor applied, player max/current HP120 next round. Restart cleared
items/scores/actors/events to usable hero lobby. Driver used ordinary keyboard/
mouse events guided by detached observations, no score/position/health/time
grants or accelerated clock. Mobile used simultaneous native CDP touch and
cancellation, not mouse substitution. All visible tested controls>=44px; no
horizontal overflow at320px/desktop in either theme. Network/page/console/4xx
capture had **zero errors, no benign filters**, no external or portrait/vendor
requests during Canvas play. This proves the tested route, not every hero's
full native match or human balance.

Ignored stdout receipt: `.swarmforge-logs/jankolock-final-browser.log`.
RAM evidence namespace `jankolock/browser/`: `result.json`,26 screenshots across
lobby/gameplay/draft/two results/restart/touch and both themes. The first worker
attempt's touch-harness error is retained as `attempt1-fail.json`; a corrected
full worker run and the final orchestrator run passed. No failed attempt is
counted as success.

### Portrait integrity and lobby: PASS within software limits

```sh
TMPDIR=/dev/shm CHROMIUM_PATH=/usr/bin/chromium \
  python3 -B scripts/test_jankolock_portrait.py --preview --browser
```

Exact supplied bytes:10,972,672; SHA-256
`abe1b2ee07038d6926813542a2127bca06cb19564f535dd49c593ea60c199fc9`.
Decoded **421,968 triangles /210,986 vertices /1 mesh /1 material /0 external
URIs**, finite accessor bounds/indices and embedded resource closure. Six
malformed-copy cases rejected. Installed `glb_stats` CLI was unavailable; the
retained script implements a compatible strict exact-asset structural check,
not a generic glTF validator. Config presence/integrity gates the feature.

Actual receipts include:

```text
integrity rejection regressions: 6 PASS
VM context loss during asset-fetch: unavailable / no scene or draw / motion / Back PASS
VM context loss during asset-bytes: unavailable / no scene or draw / motion / Back PASS
VM context loss during digest: unavailable / no scene or draw / motion / Back PASS
VM context loss during parse: unavailable / no scene or draw / motion / Back PASS
VM late parsed geometry/material/texture resources: disposed exactly once PASS
browser exact-byte GLTFLoader parse: PASS
browser context loss during asset load / unavailable / motion / Canvas2D / Back: PASS
browser context loss during delayed GLTF parse: resources disposed / motion / Back PASS
browser SwiftShader lobby / WASD pedestal bump / touch cancel / context loss / Back: PASS
browser actual UI lazy hall / motion / module Back / unaffected Canvas match: PASS
```

The exact GLB was CPU-rendered with every triangle and freshly loaded/rendered
in the integrated lobby using system Chromium SwiftShader. This is more than
load-only evidence, **not genuine supported-GPU acceptance**. Missing/disabled
config, invalid bytes and forced unavailable WebGL leave Canvas usable. Runtime
SHA-256 check runs before parse. Late asset/digest/parse context loss is terminal;
Back/abort dispose resources. Duplicate shell/module heading/Back UI was removed
and regression-checked. No dense asset or vendor request occurs during combat.

RAM evidence `jankolock/portrait/`: `exact-file-cpu-front.png`,
`browser-swiftshader-lobby.png`, and
`actual-ui-{desktop,mobile}-{light,dark}.png`. Ignored stdout receipt:
`.swarmforge-logs/jankolock-final-portrait.log`.
Supplier **photorealistic-quality FAIL** remains intact: approximate photo-colored
relief, not a full head scan. No replacement, decimation or false quality score.

### Targeted registered-game smoke: PASS1/1

Only JANKOLOCK selected; no full fleet materialization/test:

```sh
TMPDIR=/dev/shm/jankolock/smoke SMOKE_TMP=/dev/shm/jankolock/smoke \
SMOKE_PORT=8910 CHROMIUM_PATH=/usr/bin/chromium \
  xvfb-run -a python3 -B scripts/smoke_test_games.py --games JANKOLOCK
```

```text
ok   JANKOLOCK                    console_errors=0 failed_reqs=0
== 1/1 games pass ==
```

Ignored receipt `.swarmforge-logs/jankolock-targeted-smoke.log`, exit0.
All eight fetched core/font resources logged HTTP200; no portrait request on
normal Start. Existing smoke exclusions remain unchanged; the independent
interactive gate above uses zero exclusions. Targeted load success is not the
mandatory full-catalog pre-push gate. **Full fleet NOT RUN, no push authorized.**

### Other checks and known checker limit

- Data:3 golden seeds including0/uint32-max,243 four-draft paths,1,423 legal
  inventories, item caps/stats/validation/nonmutation PASS.
- Engine: fixture sweep/LOS/capture/death/respawn/tie/draft/first-to3/trust/privacy
  PASS; deterministic ordinary-input two-round replay341 shots,23 deaths,
  20 respawns. Fixtures instrument only an isolated Node module copy, not runtime.
- Reviewer public-API property simulation:12 matches/36 rounds/all heroes and
  boundary seeds, plus one five-round/four-draft match PASS. Simulation is not
  native play. [Mechanical review](jankolock-build-review.md).
- Every authored/vendor JS syntax and Python AST check PASS. Catalog126,
  required schema/unique integer IDs/Git-backed URLs PASS; baseline entries
  unchanged, exactlyID240 added after live recheck (previous max234).
- Exact donor vendor closure4/4,1,414,498 bytes, full MIT retained PASS. No donor
  edits, bulk checkout, installs or sparse-selection change. Shared local fonts
  have existing OFL notices; the game folder alone does not embed those fonts.
- Authored diff whitespace PASS. Full vendor diff retains exactly one inherited
  warning, `vendor/three.module.js:46517: space before tab in indent`; identical
  donor bytes intentionally preserved. No unqualified full-diff PASS claim.
- Maintenance refresh output: `Inventory: 131 games, 126 registered; shared
  runtime separate.` Independent comparison confirms only Jankolock's record
  was added; all prior records/shared runtime unchanged. Recorded inventory
  equals freshly derived Git inventory. Own page has all nine required sections.
  Global `python3 -B scripts/check_maintenance_docs.py` nevertheless exits1:
  `AssertionError: Commit inspected source changes before validating its inventory.`
  Pre-existing Wings source dirt triggers that guard. This is a **blocked global
  checker**, not a PASS; no checker weakening or sibling staging/reset.

## Orchestrator VISION judgment

Reviewed actual current-source desktop light gameplay, dark draft, light round2
result;320px light gameplay/dark native-touch gameplay; exact-file CPU portrait;
and current desktop-light/mobile-dark software lobby captures. Also inspected
initial desktop lobby and mobile duplicate-control evidence before repair.

Flat house palette, distinct silhouettes/team badges, useful scores/capture/
health/cooldowns, native drafts and readable buttons. No gradients, borrowed
characters or decorative launch layer. Duplicate hall controls are fixed. Mobile
HUD/buttons fit without clipping; arena characters/labels are small at320px,
so desktop/landscape is preferable for precision. Bust/pedestal/pawn are visible
in lobby captures, with clearly approximate cropped/soft relief detail. No
numeric self-score or photorealism/hardware claim substitutes for these findings.

## Delegations, sampling and drift

Build #6 engine, #7 data, #8 UI, #9 portrait; #10 native QA, #11 mechanical audit,
#12 context-loss repair. Every call pinned `openai-codex/gpt-6.1-sol`, xhigh;
returned model sol, no subdelegation, fast mode or model drift observed.
Bounded20min maximum tasks, no hidden overrun. Logs tee to ignored
`.swarmforge-logs/jankolock-{06..12}-*.log` plus harness logs. After each cycle,
orchestrator sampled first25/last12 lines of every lane log, verified `git log`
and reviewed actual authored additions/patches line-by-line. Read all authored
runtime/tests, full current correction diffs and binary decoded receipt.
Vendor is byte/license/import/syntax reviewed, not human59k-line code reviewed.

Review found one medium async portrait race, repaired/retested in `73f5829`;
no unresolved demonstrated critical/high runtime finding. UI duplicate controls
and generic hero-name overlap corrected by orchestrator. Operational drift:
initial touch harness cancellation failed then corrected; portrait driver needed
bounded focus/wait corrections. Evidence remains in logs, not rewritten to PASS.
Original external portrait production used a different supplier model; those
workers were not invoked by this swarm and are not misattributed as sol work.
Advisory ticket `pi-1677441-1792543928830-d08a02a0` timed out; the functional
portrait tooling blocker was solved independently, not approved by advice.

## Commits and ownership

Branch `feat/jankolock`, unchanged main base `a1e7128`. Research/pivot commits
precede this build; see the historical handover for those. Build/QA milestones:

| Commit | Scope |
| --- | --- |
| `d3c2d6a` | Original data/roster/drafts |
| `ff6b0b9` | Engine/bot/combat/capture/round loop |
| `68603c5` | Canvas UI/native controls |
| `52b9c8a` | Exact portrait/local vendor/integrity lobby |
| `d460a17` | Lobby reference disposal |
| `24db25b` | Lobby framing/input proof |
| `c318d69` | Native two-round/touch runnable QA |
| `363fbea` | Independent mechanical review |
| `73f5829` | Terminal context-loss repair/regression |
| `940cbba` | Final name/UI cleanup, current notices/manual/docs, registration240 |
| Closing docs commit | Scoped inventory/index and final receipt |

Final commits are identified by subjects here, avoiding self-referential hashes;
`git log` supplies their IDs. One self-made game added; no game ingestion.

## Storage, final guard and three limitations

Build-start free root bytes **2,670,514,176**. Pre-registration sample
**2,651,078,656**: shared-host consumption19,435,520 bytes, not solely attributed
to this swarm. Current game15 files /12,476,881 logical bytes before any later
doc-only commit; supplied GLB/vendor dominate. Peak/final observations remained
above2,147,483,648. Browser profiles, screenshots and smoke temp use RAM. No
outside deletion, gc/history rewrite or broad/narrow game checkout.

Closing precommit free-space sample **2,649,178,112 bytes**; shared-host delta
from build start **−21,336,064 bytes** (about20.35MiB), with501,694,464 bytes above
the floor. Main remains `a1e7128`; original sparse selection matches the entry
snapshot. Ports8910/8915/8916 were bind-checked closed. Final native receipt
hashes match all five current core runtime files. Targeted-smoke log SHA-256:
`406cb66749d638709b439cf17f7adcad3d903664fdb19554d9040a9f893c5de2`.
Owned paths are committed at handoff; unrelated sibling dirt remains untouched:
`Games/Wings/verification/check-speedboat-browser.py`,
`Games/Wings/verification/generate-models.py`, `scripts/build_wings.mjs`.
Shared worktree cannot honestly be called globally clean. Main/Character AI/
other swarms' audits/proxy are untouched. Test servers terminate on exit.

Three honest limitations:
1. Canvas genre translation omits third-person/vertical/full-MOBA depth; bot
   balance and all-hero complete native matches are not comprehensively proven.
2. Dense lobby-only portrait remains approximate/photorealism FAIL; rendering
   is SwiftShader, not supported target hardware/performance acceptance.
3.320px arena labels are small; real handheld ergonomics and online phase2 are
   unverified. Full fleet/pre-push gate remains NOT RUN.
