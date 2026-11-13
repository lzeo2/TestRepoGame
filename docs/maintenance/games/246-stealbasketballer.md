<!-- maintenance-game: Games/StealBasketballer -->
# Leo's Steal a Basketballer maintenance manual

## Identity and status

Owner-ordered original basketball sibling, entry
`Games/StealBasketballer/index.html`. Exactly 100 real basketballer text names,
original arcade ratings, no official assets. The owner explicitly authorized
improving/testing PR #8, then merging it after Canberra PR #9, and finally
merging all completed PRs. After the owner reported that it was missing from
the site menu, the existing preview was registered as **246**, Sports, on
14 November 2026. The runtime entry and saved progress keys are unchanged.
The portal now has 134 entries across 140 source projects, six unregistered.
Identity rights remain unreviewed; listing authorization is not an identity
license. Original Footballer is unchanged. See
[credits](../../../Games/StealBasketballer/CREDITS.md) and
[local QA](../../steal-basketballer-local-qa.md).

## Implementation map

`js/game.js` owns roster/economy/progression/local saves and authoritative coins;
`js/match.js` owns seeded fixed-step five-on-five simulation;
`js/world.js`, `court-view.js` and `actors.js` present original procedural
maple courts, smooth rims/laced nets, a seamed ball and articulated generic
athletes. Six merged actor meshes plus an optional numbered badge stay within
seven meshes and 1,600 triangles. The sampled maximum is 1,284 triangles.
The shared hardwood texture is generated locally at 512 by 512 pixels.
`index.html/style.css/js/app.js` own menus, input, clocks, spectator, subtitles,
reports and synthesized local audio. `data/catalog.json` has 100 identities;
`data/world.json` preserves 12 plots/routes and has 3,333 total static primitives
including arena template. Copied Three.js and fonts remain local with licenses.
`PORT_CONTRACT.md` describes all interfaces. No build/install step.

## Gameplay and controls

Start with 150 coins, recruit from conveyor/store, earn income, steal from NPC
rivals and carry home on foot. Shields/tools repel thieves; staff train players,
upgrades improve income/arena. Roster cap12, starting five PG/SG/SF/PF/C, academy
loans fill gaps. Balanced/spread/inside spacing, three approaches, five presets.
WASD/arrows move, E interact, Space jump, drag orbit, scroll zoom; P or Escape
pauses/resumes. A visible pause button and touch joystick/buttons are included.
An actual first-signing card opens the conveyor; unaffordable signings are
disabled. The first delivered recruit starts a one-time 90-second NPC theft
grace window, retained on reload. Later replacement signings cannot reset it. Album searches 100 text names/roles/generic teams.

Battles: ten actors, possession, pass/dribble/drive/steal/block, 2/3-point shots,
rebounds, fouls/free throws, 24-second clock (14 on offensive rebound), four
90-clock-second quarters at3x and tied overtime. Visible clock bar and commentary.
Z/X/C/V/B/N/M call attack plays, toggle defensive calls, F ready ability. Any home
player can be steered10s with shared20s cooldown; five stoppage substitutions with
no re-entry. Matches begin with an aspect-aware full-court broadcast camera; ball/player
follow, orbit/zoom and actual reward report remain available. Called threes
hold the chosen perimeter receiver and shoot after the catch; passing
trajectories track moving receivers.

## State and persistence

Only `steal-basketballer:v1` plus `:backup`/`:damaged` are accessed. Never touch
football keys. Saves validate identities, caps, kits, coins and tactics; storage
failure leaves session playable with visible feedback. No offline payout,
accounts, cloud or multiplayer. Live battle/carry/market do not resume on reload.
Income pauses during battle; rewards recomputed from valid score and frozen
pre-match permanent income. The app injects an active-time clock into Game;
explicit pause/hidden state stops simulation, club deadlines and earnings.
A reload starts from the real current timestamp without offline income. Explicit DEVTEAM adds a test roster, not coins.

## Dependencies and provenance

Sibling source pin `31680023af77c580121bc9efc34698b8ed2bb58b`; football original by
lzeo2, private `lzeo2/steal-a-footballer` at `30b0c28`, owner-authorized adaptation,
not an open-source ingestion. Original basketball geometry/simulation/UI adaptation
under direct order. Real names manually curated from existing knowledge, not a
live-verified or date-pinned official snapshot; catalog explicitly states this.
No photos, logos, official jerseys, likeness meshes or measured ratings. Three.js
r160 MIT and Bungee/Atkinson SIL OFL notices retained. Font binaries are exact
sibling copies; three imported whitespace defects were normalized in vendor/notice
text without changing code tokens or license words.
Their licenses do not cover game/identity rights. Credits list hashes and rights
hold. No external runtime loads, downloads, packages or local model generation.

## Audit findings

### Site listing correction, 14 November 2026

PR #8 successfully deployed to GitHub Pages, but its missing `games.json` row
kept it out of All Games, Sports, search, details and the catalog launch flow.
A fresh live catalog had 133 entries and no basketball row while the direct game
URL returned 200. This correction registers the already tested source as 246,
adds its sitemap URL and reconciles this manual/inventory. No engine, visual,
save format or gameplay changes are involved. The old manual path remains a
pointer for historical links. See the
[listing verification](../../verification/basketball-site-listing-2026-11-14.md).

### Polish continuation before registration, 14 November 2026

The owner requested better graphics, cloud playtesting and actual previews, with
PR #8 merged after Canberra #9. This supersedes the earlier bounded diagnostic
budgets below. At that checkpoint the game was unregistered. See the
[current receipt](../../verification/basketball-polish-2026-11-14.md) for final
browser results, actual captures, source hashes and the reported fleet/hardware
limits. Earlier failures below are retained history, not current acceptance.

Original 512px procedural maple grain, navy paint, coral arena trim, smooth rims
and cross-laced nets replace the flat presentation. Exactly 44 specified
non-colliding rim/net fragments are visually replaced; all 3,333 data primitives
and original collider/court coordinates remain. Added arena details cost 1,248
triangles in six draws. Generic athlete heads/torsos and bent elbows/knees use
six merged meshes plus an optional numbered jersey badge; sampled maximum 1,284
triangles stays below the existing 1,600 budget. Names do not select likenesses.
Nearby labels no longer obscure the avatar/court, and match views hide labels.

The responsive shell has separate light/dark panels, a non-overlapping
scoreboard, a first-signing action, disabled unaffordable signings, and actual
pause/resume. Club navigation hides during a match. Touch steering appears only
while a player is controlled. Match dialog clocks and ability/control states
update existing nodes instead of replacing buttons every second; unchanged
conveyor cards and thief-defense buttons also remain stable. Closing menus
restores canvas keyboard focus.

Proven defects fixed: browsing before the first signing consumed the NPC timer
and could immediately lose the only recruit; the one-time persisted 90-second
learning grace now begins on delivery. A THREE pass could catch without shooting;
the receiver now holds its chosen perimeter spot and launches the shot. Pass
flights track moving receivers. The app also discarded real elapsed time above
50ms, making match clocks depend on frame rate. It now feeds real active elapsed
time (bounded to one second per frame) to Match's existing 50ms fixed steps,
chunks economy updates to their 250ms contract, and substeps avatar collision
movement. Rendering retains its own bounded dt. No clock rate or quarter length
was shortened for testing; hidden/paused time is excluded.

Focused checks pass: twelve authored/test JavaScript syntax checks, four Python
ASTs, integration/game flow, deterministic match, world geometry and actor suites,
the 80-case offline process verifier, and the actual-app boot/UI boundary fixture.
That fixture now uses 59 bounded RAF callbacks to verify stable actionable match
buttons, genuine pause/deadline freeze/resume and 200ms-frame elapsed-time
retention. The timing regression failed before the app fix and passed after it.
These pure/boundary checks do not establish native rendering or hardware FPS.

The full natural desktop match finished **13:6**, credited **284 coins**, and
retained coins/roster through a save/reload (16 desktop milestones). That run then
stopped on a harness assumption that an absent diagnostic match serialized as a
key rather than being omitted. The actual API now returns explicit null; the
source fixture and subsequent normal browser restart verify it. A separate
23-check continuation passes genuine zero-reward forfeits, a normal rest/restart,
phone touch/layout and clean request/error collectors. Final portrait framing,
both themes and landscape pass seventeen phone checks. The
[receipt](../../verification/basketball-polish-2026-11-14.md) retains the raw FAIL
and PASS statuses and their source revisions instead of claiming one combined
all-in-one pass. No live ability activation or substitution with a granted
reserve is claimed; those engine paths retain pure fixture coverage.

Final visual review uses actual standard-graphics desktop and phone frames.
Portrait starts in ball-follow, desktop in full-court; camera choices remain
available. CSS bars and original SVG chevrons avoid missing-glyph icons.
Non-match actors hide while the arena is active, and saved kit changes refresh
athletes even if the lineup is unchanged. New kit geometry has a focused world
regression. That polish iteration left the portal catalog unchanged and introduced the
unregistered original source project. The subsequent listing correction above
registers that existing project.

### Historical diagnostic findings

Node fixtures establish detached engine and geometry behavior, not native play.
The single permitted optional system-Chromium pass timed out after10s waiting
for the bootstrap readiness predicate (snapshot function and enabled PLAY).
No page errors, HTTP failures or external loads were recorded, but console errors
were not captured, and absence of errors is not a load pass. No screenshots were
produced; phone phase not reached. Cause unknown. No second pass under the user's
single-pass budget. Native start/movement/full-match/report/touch/visual/performance
acceptance remains held. Hermes follow-up ticket `pi-3273687-1794449864222-14f2c074`.

New separately authorized safe diagnostic (`BASKETBALL-NATIVE-READINESS-20261112`)
launched once, then stopped before any game request: effective-argv CDP query
failed because `--enable-automation` was not set. Effective argv and sandbox
state were not positively verified; no native boot/play result or screenshots.
No retry or production repair. The subsequent scratch-lock path correction was
source-only, not a new launch. See [exact safety hold and admission](../../steal-basketballer-native-readiness.md),
ticket `pi-3273687-1794462997886-5cd8599f`. Earlier QA/source receipts are unchanged.

Rules intentionally omit out-of-bounds adjudication, traveling, double-dribble,
disqualifications, injuries, and-one, held-ball and timeouts. Arcade proportions
and one-way substitution limit are not official rules. Read-only diagnostic
snapshot, not a state-grant API. Procedural bodies are not likenesses.

## Safe iteration

Maintain the existing registered preview 246. The owner's missing-site report
clarifies the intended listing after the source merges; do not allocate another
ID for this game. Preserve source notices, generic art and identity limitations.
Never change original footballer for this task or share saves. Preserve same-style
exception and local vendor notices. Use bounded source fixtures and the explicitly requested cloud browser
playthrough/previews. No mass simulations/downloads. The historical fleet
hold is reported separately; no failure filter or security setting is changed. Exact free disk must be >=2GiB before writes
and browser checks. System Chromium only, one shared slot and bounded server.
Source changes require this manual and Git inventory check. Do not mistake a
source PASS or mockup for rendered/browser acceptance.

## Verification

Current orchestrator rerun: all five authored JS and four fixture syntax checks,
Python browser-script AST, fixture entry (14 local dependencies, exact100 unique
IDs/names, six stats, rarity40/30/20/8/2, recruit/theft/deposit/5v5/reward/reload and
save isolation), match fixtures (one4:0 compressed match, fixed30/60fps comparison),
world fixtures (12 routes, aligned hoops/collision, ten actors, max6 meshes/488
triangles per actor), catalog schema/Git URLs132 unchanged, and whitespace PASS.
Integration additionally asserts matching visible/scoring arc radius48 and
free-throw x55, manual assigned roles and replacement-slot preservation.

Optional browser attempt is NOT PASS, as above. Only design mockup exists at
`docs/steal-basketballer-design/ui-mockup.png`, created before UI edits. Final
mockup/render comparison, desktop/phone captures and hardware checks unverified.
Full-fleet, downloads, mass simulations, release tests and publication skipped.
Maintenance checker runs after committed assembly/inventory refresh; local QA
records actual result and exact commits.

Source-only follow-up `BASKETBALL-BOOT-SOURCE-20261112` adds
`scripts/check_basketball_boot.mjs`: unchanged production app/Game/World/actors
reach setCamera and the exact readiness predicate with DOM/fetch/storage/RAF
and WebGLRenderer boundary doubles. No source exception reproduced; runtime and
inventory unchanged. Existing fixture/local closure and maintenance checks pass.
No browser/frames run; the original native timeout and acceptance hold stand.
See [hypothesis, proof and unresolved stages](../../steal-basketballer-boot-source-followup.md).

Safe native diagnostic/checker syntax and static launch/lock checks use Python
AST without starting a browser. The optional old checker no longer requests
unsafe renderer flags and explicitly requests sandboxing, but it was not run.
The new diagnostic refuses game loading until effective argv and renderer
sandbox are verified; its consumed pass stopped at that pre-game gate. Neither
requested sandboxing nor this source check supplies native sandbox proof.

`BASKETBALL-SANDBOX-PROCESS-VERIFIER-20261112` is source-only tooling preparation:
`scripts/diagnose_basketball_readiness.py` now obtains actual NUL-delimited argv,
executable, UID, parent and start tick from `/proc`, replacing the unavailable
CDP argv query without changing launch arguments. It requires exactly one new
system Chromium descendant of this checker, its ephemeral repo profile and
Playwright pipe. Reads are checked twice; missing/ambiguous identities, ancestry,
permission/race failures or forbidden arguments stop verification. The installed
binary path/profile naming are pinned prerequisites, not fallback guesses.
Positive sandbox-page text remains mandatory. Existing `SystemInfo.getProcessInfo`
renderer IDs must all map to actual `/proc` descendants of that same stable
browser, with matching executable/UID, `NoNewPrivs=1`, `Seccomp=2` and safe argv;
missing PID evidence is a HOLD, not silently omitted.

Offline RED: `Unavailable CDP argv query still used`. GREEN:
`python3 -B scripts/test_basketball_process_verifier.py` passes 52 fake-process
cases, including NUL/stat parsing, missing/ambiguous/reused PIDs, profile identity,
unsafe arguments and missing/negative sandbox/renderer evidence. AST/diff and
maintenance checks pass. No Chromium/Playwright import or launch, game request,
changed launch flag, worker, download or gameplay-suite rerun. Runtime/catalog,
retained safety receipt and raw native failure are unchanged. Real process
selection, sandbox safety and native play remain unverified; this commit does
not authorize another diagnostic launch. Ticket `pi-3273687-1794462997886-5cd8599f`
remains a historical native safety hold.

`BASKETBALL-UI-ORDINARY-PATH-20261112`, base `1864eeac`: extended the existing
`scripts/check_basketball_boot.mjs`, retaining its exact readiness predicate.
The unchanged app's installed PLAY handler hides loading/shows HUD, then actual
parsed SHOP -> VIEW CONVEYOR -> SIGN PLAYER buttons dispatch registered click
handlers. One real market recruit costs 50 or 70 of the initial150 coins, with no
roster/coin grants or direct Game.action calls. Installed BATTLE creates the real
Match; 22 queued app RAF callbacks (at most1.05s) produce five players per side,
ten real World/ActorFactory actor groups at matching positions, Q1/score/declining
shot-clock HUD, active spectator/play controls, paused income and a valid
Basketballer save. All storage accesses stay in `steal-basketballer:v1` and its
companions; Footballer main/backup/damaged sentinels remain untouched.

Focused command: `node --experimental-vm-modules scripts/check_basketball_boot.mjs`.
Ordinary path passed (first observed signing Alex Caruso70/150); changed-file
`node --check`, repeat focused check, whitespace and maintenance inventory checks
pass. No genuine production RED occurred, so runtime, catalog and existing game
fixtures were not changed. No browser/server/Playwright, workers, installs,
full-match completion, synthetic result, screenshots or native diagnostics run.

Limits: the restricted HTML/button/event/focus/hidden/inert model is not a real
DOM parser, layout engine or user-input implementation. Actual app-generated
button attributes feed dispatch; app/Game/Match/World/actors are not replaced.
Three math/geometry are real; DOM/2D canvas, fetch/storage, scheduling and
WebGLRenderer remain doubles. Absent AudioContext follows the production
fallback, not native sound proof. The few simulated RAF callbacks do not prove
GPU rendering, sandbox safety, native timing, touch or a complete match/report.
Retained QA/native failure receipts are byte-identical. Native remains blocked;
Leo's newly approved single native pass is separately queued and was not run
under this source-only assignment.

`BASKETBALL-NATIVE-VERIFIED-PASS-20261112`, pinned `56d4c8b4`, subsequently invoked
the bounded diagnostic once with a distinct approved receipt directory and
unchanged launch flags. Required offline52-case verifier/AST gates passed, as
did fresh resource/exclusive-slot/system-binary admission. Pre-launch `/proc`
baseline scanning then hit EACCES on the exe link of pre-existing PID1064:
`launchAttempted=false`, zero Chromium launches, zero game requests/captures,
elapsed3.80s. Actual browser argv/sandbox/renderer and all native gameplay gates
were not reached. Driver cleanup warnings were tooling-only; no retry, process
skipping, permission relaxation or production edit followed. Port/browsers were
closed, old receipts preserved and disk remained above the floor. See
[accepted/unaccepted gates and exact evidence](../../steal-basketballer-native-approved-pass.md),
ticket `pi-3273687-1794466551296-0f6ec794`. The unused launch allowance does not
permit auto-resumption within this ended scope; native remains blocked.

`BASKETBALL-PROCESS-FILTER-AND-ONE-PASS-20261112` source phase: actual-reader
in-memory `/proc` regression first reproduced `PermissionError: protected exe`.
The narrow fix reads stable comm/argv/PID/PPID/start/UID metadata first. Only the
exact init-owned `/usr/lib/systemd/systemd --user` service, same UID and older
than the checker, may retain metadata with no exe link resolution; it cannot be
a newly launched checker descendant or supply browser/renderer exe evidence.
All other records still require exe; PermissionError is not caught/ignored.
Metadata and exe are rechecked, and missing/ambiguous/changed identities remain
HOLD. Read-only host metadata independently confirmed that signature for the
previously blocked service; no PID is hardcoded into the filter.

`python3 -B scripts/test_basketball_process_verifier.py`: GREEN66 offline cases,
including unknown/protected browser/renderer argv/exe, misleading service
signatures and a PID-start change during the read. Launch call/flags, positive
sandbox/renderer gates and shared scratch lock stay unchanged. These source
checks do not establish native safety. This new scope separately authorizes only
one subsequent bounded attempt, with third distinct evidence directory
`.tmp/basketball-native-readiness-filtered/`; earlier receipts stay immutable.

Source fix landed as `bef62119`; the single subsequent bounded diagnostic
invocation stopped at `pre-launch-process-baseline` with `Missing UID or
NUL-delimited argv`, elapsed3.24s. Admission/lock/binary gates passed, but
`launchAttempted=false`: zero Chromium launches, zero game requests, no captures.
The receipt identifies neither PID nor which metadata field failed; no root
cause or successful live filter completion was inferred. No retry, further
process scan, source expansion or safety relaxation followed. Cleanup confirmed
no Chromium, free shared lock, released server port and resources above floors.
See [third receipt, exact gates and scope end](../../steal-basketballer-filtered-pass.md),
ticket `pi-3273687-1794467511604-9aa0ae33`. Prior receipts/runtime/catalog remain
unchanged; native stays unverified and browser capacity is released.

## Zombie and sd-pam reader corrections (2026-11-13)

Read-only diagnosis identified both pre-launch HOLD causes on this host: a
reaped-but-unwaited `codex` zombie child (stat state `Z`, empty cmdline) aborts
`parse_process` with `Missing UID or NUL-delimited argv`, and the user
manager's `sd-pam` child denies exe readlink like its parent. The reader now
records zombies fail-closed (identity retained, empty argv/exe, `zombie:true`;
contradictory Z-state records with live argv/exe are rejected) and treats only
two same-UID, pre-existing, provably-unrelated system services as exe-omitted:
the init-owned `systemd --user` manager and its verified `sd-pam` child.
Candidate selection, sandbox and renderer gates are untouched; a zombie can
never satisfy browser/renderer identity. The live `/proc` reader passes on this
host (zombie and both services present), and the offline suite is GREEN 79
cases. No browser launch or game change; native remains unverified.

## Native pass PASS (2026-11-13, approved 3- and 5-minute bounded passes)

With operator approval for deadline extensions (3-minute, then 5-minute, same
gates, one launch each), the corrected verifier carried a full bounded pass to
**PASS**: "bounded native readiness/start/recruit/5v5/album/phone; not full
match acceptance". All 12 gates accepted, including actual-proc browser
identity, positive sandbox page, renderer NoNewPrivs=1/Seccomp=2 (PIDs
3990528/3990560), desktop boot/PLAY, natural affordable recruit (Tyus Jones),
real 5v5 live match (Q1, shotClock 23.4, 5 v 5), 100 unique album names, and
phone boot/PLAY with the 390px capture. errors and external requests: none.
Receipt `.tmp/basketball-native-readiness-filtered/receipt.json`; earlier
HOLD receipts preserved alongside. Reader additions shipped with coverage
(offline suite 80 cases): Debian Chromium single-element cmdline flag view
(`expand_argv`), the build's own `--enable-unsafe-swiftshader` headless default
classified as rendering (not sandbox), one same-launch reload on boot
`ERR_NETWORK_CHANGED`, SwiftShader context loss/restore recorded as
environment events, argv-hidden codex daemon parsed fail-closed, real-input
clicks timed to the per-frame menu re-render, and in-game NPC thief defense
before battle. Live receipt and capture retained; native scope closed for this
pass. A separate rights decision is still required before any public build.

## Future outlook

See the current [polish receipt](../../verification/basketball-polish-2026-11-14.md)
for the latest cloud evidence and actual previews; the earlier failed and bounded
native diagnostics above remain dated history. Target hardware, comprehensive
basketball rules and identity rights remain outside that functional acceptance.
Footballer AI/tactics/UI repairs remain a separate task.
