# Wings local playable integration

## Scope and entry

The operator authorized technical integration of the retained copy **for local
testing only**. No push, publication, redistribution, new license conclusion,
dependency installation or asset duplication is part of this work.

- Authored entry remains `Games/Wings/source/games/wings/src/main.ts`.
  Its existing lobby now offers **Factions** using the original numbered menu.
- Modified `src/ui/lobby.ts`, `game.ts`, `spawn.ts`; new `ui/local-factions.ts`
  connects the actual GameSession to the real loopback room, FC authority and
  supplied-model view. It reuses existing HUD objective bars, hint and pause UI.
- Modified `src/sim/{combat,room-engine,loopback}.ts` install the application-tested
  bridge. `geography.ts` and `render/world/ships.ts` retain native carrier launch
  platforms but remove native destroyers from bridged collision/presentation.
  Original fleet AA is suppressed only for bridged rooms. Normal modes restore
  their original fleet behavior.
- Modified `src/render/hud.ts` reads actual capital HP rather than presenting
  passive launch carriers as the Factions objectives. No new dashboard or CSS.
- New original `authoring/local-host-scenario.mjs` uses the existing Type45 and
  Type054A descriptors, measured gun mounts and GLBs. Its two 1000-HP capital
  escorts start 2800 m apart in validated native sea, then converge and fight.
  The enemy starts east, ahead of the native team-0 launch heading.
- New `authoring/local-fleet-view.mjs` binds those same files through the existing
  rig. No targeting/damage logic, new art, model copies or second RAF.

The current source-only **local entry is `.tmp/wings-local-direct-buffer/index.html`**.
Build: Three0.186.0 + esbuild0.28.2, **26 files / 3,809,712 bytes**.
It includes the source-level GLB transport fix supported by the two-launch trace
phase below. This rebuilt entry has CPU/build/HTTP-route checks, not a post-fix
native acceptance capture. The earlier terrain-first build remains preserved
at`.tmp/wings-local-terrain-first/` (26 files /3,808,951 bytes).
The controlled instrumented capture used the preceding observed build
(26 files /3,808,897 bytes), before the terrain-first fix.
The earlier native attempt below used the prior `.tmp/wings-local-latest/`
build (26 files /3,807,760 bytes), before passive startup diagnostics.
The existing builder checked exact dependency versions/notices and generated
imports/HTML/CSS/worker closure. It does not copy models or fonts.

```sh
# Current ignored build, loopback only; automatically closes after 180 seconds.
python3 -B scripts/serve_wings_local.py --seconds 180
# Open http://127.0.0.1:8787/index.html and select Factions.
```

For a fresh build use the existing exact external tools, an empty ignored output
directory and `scripts/build_wings.mjs`; pass that directory as `--build` to the
server. The bounded server exposes only build files and the existing Wings
models/fonts, rejects traversal/other source routes and copies no assets.
`Games/Wings/index.html`, served chunks, models/fonts, `port.patch`, catalog and
publication configuration remain unchanged.

## Actual targeted results

```text
node Games/Wings/authoring/retained-host-bridge-check.mjs
13 actual retained-host integration groups passed (direct patched TS, not native GPU)
node Games/Wings/authoring/local-host-scenario-check.mjs
6 local-host scenario groups passed (mechanical CPU poses, not native-input acceptance)
THREE_ROOT="$EXISTING_THREE" node Games/Wings/authoring/local-fleet-view-check.mjs
6 CPU view groups pass; 18 original hashes unchanged
THREE_ROOT="$EXISTING_THREE" ESBUILD_ROOT="$EXISTING_ESBUILD" node Games/Wings/authoring/local-session-check.mjs
3 actual local session composition groups passed
python3 -B Games/Wings/verification/check-local-factions-browser.py --self-check
PASS local entry/shared assets and negative routes; bounded loopback server closes
```

The last Node suite executes **the actual `ui/local-factions.ts`**, actual native
room/flight/combat, existing FC authority and actual rig/decoded GLB geometry.
Only model image loading and timer driving are explicitly instrumented for CPU
execution; it is not GPU or normal-input proof. Real buffered player cannon
consumes ammo **600→589**, changes the fitted enemy objective **1000→989.2**,
and the actual scene transforms, objective-bar data and hint receive that same
safe state. Pause stops host ticks; leave removes all fleet roots. The natural
AI capital outcome then resets after the native15-second interval without a
view rewind fault. This test caught and fixed that reset boundary.

Production scenario: reciprocal measured AI fire/damage, **143 muzzle checks**,
capital outcome at **138.70 simulation seconds**, winner1, homeHP0/enemyHP620.
No accelerated presentation clock or HP/damage boost. Native AA events are
**0 bridged /136 ordinary**. Full swept hull/approach routes pass actual native
terrain/water queries. Fresh generated Astra/solo/lighting regressions also pass.
JS/Python syntax, scoped whitespace and catalog checks are required at commit.
Worker reported104 original room/combat tests passing; its initial broader run
had five timing/timeout/dependency failures, not claimed as a whole-suite PASS.

## Native queue and remaining acceptance

Runner: `Games/Wings/verification/check-local-factions-browser.py`, explicit
`/usr/bin/chromium`, loopback server,240-second deadline, no state grants,
actual Factions selection/spawn/flight/fire, presented fleet transforms, HUD,
pause/menu/fresh session and batched desktop/mobile captures. It rejects live
Chromium/Chrome processes. No persistent server, downloaded browser or concurrent
browser is allowed. Native results are recorded below only after an actual run.

Citisten's reservation`citisten-water-save-browser-20261026-2157.json` was
respected through22:17UTC. Queue ticket`pi-667665-1793052132544-3cc2ed01`
answered with the released/expired-reservation plus zero-live-browser condition.
Both actual Wings attempts checked that condition and released their own leases
with zero browser roots; no peer was contacted, interrupted or run in parallel.

[Native receipts and reviewed captures](wings-local-native/):

1. Attempt1 failed before any page in3.021s: Chromium's process-singleton Unix
   socket path exceeded its limit under the assigned long evidence directory.
   The runner now uses short owned`.tmp/t`; no game/renderer checks changed.
2. Attempt2 launched system Chromium and the actual original menu/Factions item,
   then **FAIL**,77.715s. The existing renderer gate reports
   `Unsupported renderer (webgl2, low): First scene draw timed out`, before
   GameSession/player creation. Two retained requests for`models/carrier.glb`
   and`models/destroyer.glb` aborted with`net::ERR_ABORTED`; no external requests.
   The runner's startup capture succeeds; a later redundant diagnostic reports
   `Event loop is closed! Is Playwright already stopped?`, retained as a collector
   limitation, not the renderer's cause. No native flight/fire, fitted fleet pixels,
   pause/restart or mobile capture is accepted. The original menu and fail-closed
   modal were actually inspected. Error filtering/timeouts/first-draw requirements
   are unchanged, and there was no unchanged third launch.

The exact next native gate is a distinct supported-renderer route or diagnosis
of the existing`render/scene.ts:createSceneHost` first-draw stall, before the
new session is reached. Advice ticket`pi-667665-1793053224217-0db97ad8` is now answered; the passive
source-only follow-up and retained native HOLD are recorded below. This is a renderer/tooling hold, not a local-permission question.

Remaining bounded limits: real native flight/aim/texture/performance acceptance,
full roster, host missile/bomb/ASW/AA interaction and ordinary-mode supplied ship
reuse are not established by these CPU results. Existing seven aircraft and
controls remain; ships are AI objectives, not selectable vehicles. Publication
review stays separate. No new game, catalog ID or push.

## Passive startup diagnosis follow-up

`8521b605` adds a detached, bounded `window.__wings.startup` snapshot before
`hostRef` exists. It exposes phase/blockedAt, callback/paced-frame/completed-render
counts, backend, copied render counts, world readiness/streamer stats and bounded
error strings. It exposes no world/renderer/control handles. Four CPU/static
checks execute the real observer/failure slices and verify removal restores the
exact pre-patch source bytes: rendering, quality, pacing,20-second timeout and
readiness/draw gates remain unchanged.

The collector now captures this snapshot while Playwright is still alive. Its
one CPU fault fixture proves both failure captures precede browser/driver cleanup
and preserve the original exception. The synthetic fixture's printed FAIL is
explicitly labeled; it launches no browser and writes no native receipt.
The bounded loopback server/negative-route self-check also passes.

Source-grounded interpretation, **not measurements from the previous run**:

| Observable | What it distinguishes |
| --- | --- |
| phase `renderer-init` | Renderer initialization has not returned; world does not exist yet. |
| zero callbacks after `loop-scheduled` | No animation callback observed; do not blame terrain completion yet. |
| callbacks but zero paced frames | Callback/pacing boundary, before world update or render. |
| frames but zero completed renders, blockedAt `world-update`/`shadow`/`effects`/`render-call` | Exact synchronous boundary not yet returned. |
| completed renders, worldReady false | FirstDraw still waits on terrain readiness even if draw calls occurred. |
| worldStats.pending/nonready LOD | Outstanding worker/fallback jobs; counts alone do not prove worker failure. |
| worldReady true with zero actual draws | Existing explicit zero-draw rejection remains mandatory. |
| shaderError populated | Existing shader callback reported failure; empty text alone does not certify GPU health. |

`createSceneHost` resolves firstDraw only after a render **and** `world.ready()`.
`createWorldView.ready()` delegates to `TerrainStreamer.ready()`, which checks
nearby cluster LOD completion. Backend fallback catches synchronous worker
construction failure only; async worker/job failure is a possible missing-ready
path, **not an observed cause**. Fleet GLB loads are not awaited by this ready
predicate, so the two retained ship aborts do not by themselves prove why it
never resolved. Earlier null `__wings.stats` meant hostRef had not yet been
assigned; it did not establish zero GPU draws. The new observer closes that gap.

Ticket`pi-667665-1793053224217-0db97ad8` is answered: preserve native HOLD,
source-only passive diagnosis, no third launch in this phase. **No browser was
launched for this follow-up**, no new native result or screenshot is claimed,
and no gate/error/timeout was weakened. A new native capture requires release
of that HOLD and a supported renderer route; it must collect these observations
rather than rerun the uninstrumented hypothesis. No license/publication decision
is reopened. The collector/server changes and this checkpoint are parent-owned.

Follow-up commits:`8521b605` observer/static checks and`c9bf0c7d` collector,
server default and receipt. Inventory refresh changes only Wings to240 files /
24,404,891 bytes, tree`0cb3136cdfeef5b6a4c390b4ece6269a9bbc47b8`.
Coverage still exits1 solely on the existing missing Brainrot manual. This
follow-up measured2,614,738,944→2,608,513,024 root-free bytes, decrease6,225,920
bytes, below its10MB bound and always above2GiB. No games added, served/model/
font/catalog/publication changes, installs, outside cleanup, captures or push.
After the inventory/checkpoint commit the worktree is clean.

**Earlier HOLD, subsequently released once:** the operator authorized one
instrumented local startup capture with the committed capture-before-cleanup
collector. That release was consumed by the controlled capture below. It did
not authorize an identical retry or a second post-fix browser run.

## Controlled capture and terrain-first fix

Operator release: ONE instrumented startup capture, no flight inputs or identical
retry. `ab661996` adds/CPU-checks `--startup-only`, which stops after the startup
result rather than continuing into flight. Fresh queue checks found no active
reservation or browser; root-free capacity was**2,603,474,944 bytes** at launch.
Pinned system Chromium ran once; its lease/profile/server closed with zero owned
browser roots. A later Citisten browser belongs to that peer and was untouched.

[Exact controlled receipt](wings-local-native/controlled-startup.json) and
[first failure capture](wings-local-native/controlled-startup-failure.png):

```text
FAIL, exit1, 96.942s; GameSession not created
phase failed; blockedAt render-return
callbacks3; pacedFrames2; completedRenders2
WebGL2: drawCalls16; triangles85001; shaderError empty
worldReady false; clusters0; visibleClusters0; pending2; shoreProgress0
failed requests0; external requests0
```

This refutes the earlier zero-draw inference. It identifies the unmet terrain
readiness gate while full scene rendering was already occurring. It does **not**
prove whether the outstanding jobs failed or GPU/compiler work delayed their
main-thread delivery. The firstDraw timeout remains a real FAIL; empty shader
error text/nonzero submission counts are not accepted gameplay or GPU health.
Both startup and final diagnostic snapshots were retained before cleanup; the
previous collector's closed-event-loop failure did not recur.

Evidence-driven source fix`7ff95b21`: after normal world/shadow/effect updates,
before the first expensive render, return for that frame if minimum terrain is
not ready. The existing animation loop continues servicing updates/replies.
Once startup succeeds, temporary terrain gaps do not suppress normal rendering.
No early readiness resolution, replacement scene, new RAF, quality/shader/model
change, firstDraw timeout increase or draw-gate bypass. The same20s timer and
actual full-render/nonzero-draw/world-ready checks still determine success.

Parent independently reran the actual-loop regression: **4 preserved CPU/static
checks +10 CPU cases**, covering both direct rendering and the post pipeline.
Cold frames update without drawing/resolving; terrain delivery permits the full
render; post-start gaps render; zero draws and shader failures still reject.
The actual local-session/player/fleet test also passes3 groups (ammo589, enemy
HP989.2, pause/disposal and native15s reset). CPU collector tests verify the
startup-only branch cannot send flight keys. Source build/import/worker closure
passes with the exact existing tools and no installs or asset copies.

At that checkpoint **no browser had tested the fix**. The first controlled
capture was consumed without retry. The subsequent separately authorized
post-fix startup-only validation is recorded below; no gameplay, clean-loading
or publication PASS is inferred from partial startup observations.

Controlled-step commits: capture bound`ab661996`, ordering fix`7ff95b21`,
evidence/local-build checkpoint`70de2942`. Inventory refresh changes only Wings
to240 files /24,411,514 bytes, tree`f3ae5da3d28bc4a0029a7ea2c5ff42802caeefe5`;
129-game catalog unchanged. Coverage still reports the pre-existing missing
Brainrot manual, not a PASS. Root-free bytes measured2,603,474,944 at capture
preflight and2,596,306,944 at closing checkpoint (decrease7,168,000 bytes),
always above2GiB. No installs, asset copies, outside cleanup, publication or push.
Worktree is clean after the inventory/checkpoint commit. The only new browser
run was the one explicitly released capture; own processes/profile were closed.

## Post-fix startup-only validation

The operator authorized ONE instrumented validation of`7ff95b21`. Fresh queue
checks found no active owner or browser; launch root-free bytes were
**2,591,784,960**. Collector`73818c77` also rejects renderer/error/request failures
in its startup-only success path; its CPU positive/negative fixtures pass, and
that path cannot issue flight keys. No application/render code changed for this
validation. One pinned-system-Chromium run occurred; owned browser/profile and
bounded server closed with zero owned browser roots. No retry or second run.

[Exact retained result](wings-local-native/post-fix-startup.json): **FAIL, exit1,
90.647s**, specifically`Page.screenshot: Timeout 10000ms exceeded` after fonts
loaded. The final diagnostic screenshot also timed out at5000ms. Only the
[original menu image](wings-local-native/post-fix-menu.png) was captured; no image
of the running Factions scene is accepted. Three`net::ERR_ABORTED` requests are
retained: native`models/carrier.glb`,`models/destroyer.glb`, and supplied
`models/derived/wings_type054a_jiangkai_ii.glb`. Their timing/cause relative to
capture/cleanup is not established and they are not filtered. External0,
console/page errors0; no renderer/shader error was observed.

**Specific new progress, not a clean validation PASS:**

```text
GameSession state spawn, actual player p1/team0, input sequence0
host tick30→640; FC tick10→213; elapsed500→10666ms
one live fleet root, both model containers visible
both container positions equal the authoritative moving unit positions
last renderer: blockedAt empty, error empty, shaderError empty
callbacks85; pacedFrames64; completedRenders5
28 draw calls;264171 triangles;19 visible terrain clusters
shoreProgress0.75; pending2
reported software-renderer FPS sample0.197 (not a hardware benchmark)
```

The original firstDraw gate was crossed: the actual GameSession/player and fleet
composition were created, which could not happen before that gate. This confirms
the terrain-first change removed the prior boot blocker in this run. At the last
snapshot`worldReady` was false during later camera/LOD movement; that is not a new
firstDraw rejection, and post-start terrain gaps intentionally keep rendering.
There were no aircraft/seat/fire inputs, no gameplay-state grants and no natural
player-combat claim. Initial fitted fleet motion progressed from the0.5s to10.666s
simulation samples, but pixels/loading/performance and the screenshot gate remain
unaccepted. The remaining failed checks are screenshot responsiveness and
retained resource aborts, not the old pre-session terrain-readiness timeout.
The exact compositor/abort cause is unproven.
No timeout extension, forced rendering, quality reduction, request filtering,
install, security change, publication or push was used to hide that failure.

Validation/receipt commits:`73818c77` and`c1eaf6b0`. Inventory refresh changes
only Wings to240 files /24,412,619 bytes, tree
`5b084815a167ecafa0c3a13a8842ea71cdaecc21`; catalog129 and all other rows
unchanged. Coverage still exits1 on the existing missing Brainrot manual.
Measured root-free bytes:2,591,784,960 before launch→2,591,010,816 at closing
checkpoint (decrease774,144 bytes), always above2GiB. No new game, asset copy,
install or outside cleanup. Worktree is clean after the inventory/checkpoint
commit. Native flight and clean visual/capture acceptance remain unverified;
this record preserves both real startup progress and the specific failed checks.

## Collector ordering repair after post-fix validation

`bf91c4e4` repairs two concrete collector defects exposed by the failed capture:
HTTP service previously ended before final diagnostics, and the first renderer
DTO was saved only after the screenshot that timed out. The server now remains
open through metadata/image collection and owned browser/driver shutdown, then
closes last. The first startup DTO precedes the potentially blocking image call.
A screenshot timeout is retained without an identical fallback image attempt;
other failures can still receive their first bounded failure image. Diagnostic
errors no longer replace the primary exception.

Every failed request is still retained, now with monotonic`observedMs` and
`collectorPhase` (`run`,`failure-capture`,`cleanup`). Failures/errors/external
requests arriving during cleanup also force FAIL/nonzero, preventing a premature
PASS. These tags are **future observations**, not a retrospective classification
of the three aborts in the saved native receipt. Their original timing/cause
remains unknown; that receipt and its FAIL are unchanged.

Parent review confirms the gameplay body, pinned executable, quality, viewport,
firstDraw/readiness checks and existing screenshot deadlines are unchanged.
Only collector lifetime/observations and its CPU checks changed; no application
or renderer source, models, served output, catalog or publication configuration.
The small common screenshot/diagnostic paths apply to every existing caller.

Fresh `python3 -B Games/Wings/verification/check-local-factions-browser.py --self-check`
passes the actual bounded HTTP/negative routes and **9 CPU mock cases**:
startup failure/success, renderer failure, image timeout, diagnostic failure,
cleanup abort, cleanup page error, thrown browser-close error and cleanup external
request. They prove service lifetime, capture-before-image/cleanup, primary error
preservation, no redundant image retry, retained phase-tagged aborts, no false
cleanup PASS and no startup flight inputs. No mock result is native evidence.
Python compilation/scoped whitespace also pass.

**No browser launched for this repair.** The one post-fix native authorization
is consumed. The next live action is one targeted screenshot/abort-timing
validation of the repaired collector, requiring an explicit new bounded release
under the same disk, system-browser and single-owner queue controls. No timeout
extension, forced render, quality reduction, request filter, install or push is
proposed. The last actual native evidence remains real GameSession/fleet startup
plus failed screenshot/clean-loading checks, not a generic pre-session hold.

Repair commits:`bf91c4e4` and parent review/extra close-failure case`22cee27a`.
Inventory refresh changes only Wings to240 files /24,417,752 bytes, tree
`12efaefe1260ead77c6b88c5fc33f293187022ff`; catalog129 and other rows unchanged.
Coverage still reports the existing missing Brainrot manual. Root-free bytes
measured2,590,773,248→2,589,102,080 (decrease1,671,168 bytes), above2GiB and
within the5MB repair bound. No app/renderer changes, screenshots, model copies,
installs, outside cleanup or push. Worktree is clean after reconciliation.

**Earlier repaired-collector gate:** the operator subsequently authorized one
targeted screenshot/abort-timing capture under the same controls. Its execution
and failure are recorded below. That one-run authorization is consumed.

## Repaired-collector targeted capture at ba1ed2e2

Exactly ONE authorized startup-only run used pinned`/usr/bin/chromium`, unchanged
visuals/deadlines and the repaired collector. Fresh checks found no browser or
active reservation; launch root-free bytes were**2,586,824,704**, above2GiB.
The browser/profile/driver and HTTP server closed in owned-resource order, and
the lease released with zero browser roots. No retry, installs or push.

[Exact timed result](wings-local-native/repaired-collector.json): **FAIL, exit1,
96.285s**. Primary failure:`Page.wait_for_function: Timeout 60000ms exceeded`.
The first failure image also timed out at5000ms after fonts loaded; no duplicate
image attempt followed. Only the [original menu](wings-local-native/repaired-collector-menu.png)
was captured. The original primary exception and both live diagnostic snapshots
were retained; no running-game image or clean-loading/gameplay PASS is claimed.

The key new classification is no longer ambiguous cleanup timing:

| Request | Observed time from run start | Collector phase |
| --- | --- | --- |
| `models/destroyer.glb` | 14,088.893ms | `run` |
| `models/derived/wings_type054a_jiangkai_ii.glb` | 62,780.710ms | `run` |

Both `net::ERR_ABORTED` events arrived before failure collection/cleanup while
HTTP remained alive. They cannot be dismissed as cleanup-only aborts in this
run. Their underlying cancellation cause is still unproven; this does not
retroactively classify the three un-timed aborts in the older receipt.
External requests0, console/page errors0, renderer/shader error strings empty.

The first snapshot taken after the failed wait already showed **actual p1/team0
in spawn**, one live fitted fleet root, two visible model containers and authority-
matching positions. It does not establish exactly when the predicate became true
relative to the60s deadline. Between that snapshot and the final snapshot:

```text
host ticks35→339; FC ticks11→113; elapsed583→5650ms
scene callbacks82→82; completedRenders6→6; pacedFrames56→56
28 draws /264171 triangles;19 visible terrain clusters; shoreProgress0.75
reported software FPS sample0.202 (not a hardware benchmark)
input sequence0; no aircraft/seat/fire inputs or state grants
```

Thus the simulation and fleet scene-graph transforms progressed while the
observed scene animation/render counters did not. This is specific render/wait/
capture responsiveness evidence, not a return to the original pre-session
zero-terrain/firstDraw failure. `worldReady` was false in these post-start
snapshots; the source permits later camera/LOD readiness gaps, and the existing
firstDraw gate had already been crossed to construct GameSession. Exact compositor, request-cancellation and polling causes remain
unproven. No timing extension, RAF/render forcing, quality change, request filter,
application patch or second capture was used to turn the failed checks green.

All app/source/served/model/catalog files and earlier native receipts are
unchanged from`ba1ed2e2`; only this retained result/menu and maintenance receipt
were added. The repaired collector demonstrated first-failure preservation,
run-phase abort tagging, no duplicate image retry and cleanup after diagnostics.
The remaining acceptance is actual visual/capture/clean-loading and later player
flight/combat, not whether the native local GameSession/fleet can initialize.

## Current bounded trace phase

The operator authorized a maximum of two changed-hypothesis browser launches,
without per-observation permission gates. [Phase contract and results](wings-local-trace-phase.md)
record passive cancellation/RAF diagnostics. Both launches are complete and
closed. The direct-buffer diagnostic changed seven full-payload cancellations to
11/11 normal GLB completions without failure filtering. The supported source fix
is `render/glb.ts`, shared by aircraft, native ships and local Factions; it uses
native fetch/arrayBuffer plus the existing GLTF parser, not a production fetch
monkeypatch or dependency edit. HTTP/error/base-path regressions, the actual local
session's three CPU groups, fresh26-file build and bounded HTTP-route checks pass.
The server default now points at that fresh ignored build.

Rendering is independently held: software synchronous RAF work reached6.36s,
with presentation gaps while host timers ran at60Hz. The UV warning remains.
No source-render optimization is justified by these traces alone. A responsive
GPU/compositor capture route, or targeted GPU evidence supporting a quality-
preserving fix, is the needed change rather than another unchanged SwiftShader
capture. No third browser launch, screenshot, native flight/combat acceptance,
release, publication or push is claimed. Earlier failed receipts remain FAIL.

## Checkpoint

Workers: `354dd1b6` source hooks/scenario; `f73ced86` scene adapter. Parent owns
GameSession/menu/HUD, source integration, local entry/server and acceptance.
Parent source/UI/local entry commit:`bed4b1be`; runner temp-path fix and native
receipts:`9c61d1e4`. No generated served game bundles are edited. Inventory now
records only the inspected Wings change:239 files /24,394,786 bytes, tree
`385d99a1af3bcc3c62da1c03ac5389da34f5d710`. All other inventory rows and129-entry
catalog are unchanged. The unchanged maintenance checker exits1 on
`Missing docs/maintenance/games/001-brainrotboulevard.md`, not a coverage PASS.
All owned browser/server processes are closed; local branch is clean after the
inventory/checkpoint commit. The local entry remains runnable with the bounded
server command above, while native gameplay acceptance is explicitly held.
Fresh initial disk: **2,650,542,080 bytes free**; after native capture receipt:
**2,616,123,392 bytes free**, observed root decrease**34,418,688 bytes**.
Owned ignored builds/evidence total19MiB plus small source/Git/log changes;
no installs, model copies, outside cleanup or2GiB waiver. Both browser/server
batches ended and released their slots. Inventory refresh follows committed
source; the existing missing Brainrot manual is not repaired by this lane.
No games added, no new catalog ID, no publication configuration changes or push.
