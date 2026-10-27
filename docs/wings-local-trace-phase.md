# Bounded local cancellation / RAF trace phase

Operator authorization: at most TWO launches total, one pinned system Chromium
owner at a time, original disk/sandbox/security controls, no installs or push.
The earlier repaired-collector receipt stays FAIL. This phase does not redefine
native acceptance or grant game state. Stop after two launches if diagnosis is
not actionable; report the needed change rather than ask for another generic run.

## Launch 1, documented before execution

Hypothesis: screenshot collection and/or RAF-driven readiness polling contributes
to the observed callback stall and misleading late-ready observation. The prior
collector showed scene counters82/6 unchanged while host ticks35→339 advanced.
Two model aborts were already observed before cleanup; their initiators were unknown.

Changed diagnostic: same cached local app, viewport960x640, low/auto-quality and
existing Chromium args, but NO image calls and NO RAF-based readiness wait.
Click only the existing Factions item. Observe85seconds with passive CDP network
metadata and a read-only1Hz observer. Record native RAF/cancel delegation timing,
explicit JavaScript abort stacks, actual network cancellation flags/initiators,
visibility/focus, startup/render counters and native session/fleet progress.
No fetch interception, retained abort signals/controllers, forced GC, extra RAF,
render forcing, plane inputs, quality change or readiness/timeout relaxation.

The observer logs are bounded; aggregate counters and explicit drop counters
remain available. CDP data is bounded to8MiB, and no response bodies/models are
copied. Evidence is saved before and after owned browser/driver/server cleanup.

Predictions:
- If stalls/aborts recur without any screenshot or RAF wait, those collector
  actions are not necessary causes in this run.
- A JS abort or RAF cancellation stack can identify an application caller.
- Long RAF callback durations with source render-phase data distinguish expensive
  rendering/main-thread work from cancellation or inactive/background scheduling.
- Timer-sampled spawn before a RAF poll would otherwise complete is diagnostic
  timing evidence, not permission to waive the existing acceptance deadline.

## Launch 1 result

Retained [full trace](wings-local-native/trace-phase-1.json.gz),118.099s overall,
85s observation after Factions click. Only loopback origin/repository path prefixes
are normalized; metadata/body byte counts and failures are unchanged. No response
body or model copy is retained. Browser/driver/server closed; browser roots0.

Seven failures recurred without image collection or RAF polling. Each received
HTTP200 and its ENTIRE declared payload before CDP`loadingFailed,canceled:true`:
Apache745072; YF12780572; A10952180; F151176316; FA18912784;
carrier634144; fitted Type054A545888 bytes. No explicit JS abort or RAF-cancel
calls were observed; no navigation/frame detach occurred during the failures.
The initiator stacks route through Three`FileLoader.load`/`GLTFLoader.loadAsync`,
including the real fitted-model preparation caller. Thus partial downloads,
missing files, screenshot teardown and explicit app cancellation are not supported
as causes for these seven observations. The native stream-completion/lifetime
mechanism is not yet proven.

First timer-observed native spawn was at57.552s on the document performance
clock. Factions click acknowledgment was10.297s on the different runner clock;
these values are not directly subtracted. Visible/focused stayed true. Native RAF fired/completed125 times,
max synchronous callback6407.1ms, no callback throw/cancel. Rendering is still
slow: scene callbacks121/completed renders5 stayed unchanged from70.166s through
88.166s, while host ticks438→1518 advanced at60Hz. Hence the whole JS/simulation
loop was not dead during that18s presentation gap. No renderer/shader errors;
19 terrain clusters. One console warning about absent UV, no page errors or
external requests. These are diagnostic observations, not capture/gameplay PASS.

## Launch 2, documented before execution

Changed hypothesis: Three`FileLoader`'s custom progress`ReadableStream` bridge,
rather than missing payload or app abort, is implicated in terminal cancellation
after all GLB bytes arrive. The original loader explicitly supports a native
`response.arrayBuffer()` fallback when`response.body===undefined`.

Use the same app/browser/settings, NO images/RAF readiness polling,85s window,
plus the diagnostic-only`direct-glb-body-probe.js`: delegate original fetch exactly,
then hide ONLY a GLB response's public`.body` property so the loader takes that
existing fallback. Return the same Response; do not consume/change bytes, status,
headers, URL, request args/signals or GLTF parser. Do not hold request/response
objects after normal callbacks, alter aborts or filter any failed requests.
Probe counts/override errors show whether the variant really applied.

Prediction: completed native network events without the full-byte cancellations
would isolate the owned GLB consumption boundary as actionable, allowing a small
source-level native buffer/parse helper instead of a global production fetch
patch or a dependency/bundle edit. If failures recur, do not invent that fix.
Rendering responsiveness is measured separately; curing request completion would
not establish screenshot, visual, performance or player-combat acceptance.
This is launch2of2; no third run is authorized in this phase.

## Launch 2 result and supported source repair

Retained [full trace](wings-local-native/trace-phase-2.json.gz),110.215s overall,
85s observation. **11/11 GLB requests emitted normal CDP loadingFinished; zero
failed requests, page errors, external requests, event drops or cleanup errors.**
The direct-body variant matched all11 GLBs, with0 override errors. Each of the11
current model files was also checked as valid GLB2 with embedded/data-URI buffers
and images only. Metadata is retained, not model bodies. Both launch leases
released with zero browser roots. Exactly2 launches total; no third run.

The same absent-UV warning remains. Software rendering is NOT fixed: maximum
synchronous RAF callback6358.7ms; scene callbacks85/completed renders5 stayed
unchanged across a10s sampled interval while host ticks379→980 advanced. Last
sampled FPS0.163,19 terrain clusters, native p1/spawn and fitted fleet. Visibility/
focus stayed true; JS abort/RAF-cancel counts0. This identifies a separate
presentation/renderer responsiveness hold, not dead simulation or screenshots as
a necessary trigger. Exact browser/driver/GPU scheduling and terminal-stream GC
mechanisms are unproven; this A/B isolates an actionable GLB consumption boundary,
not universal proof of a Three or Chromium defect.

Source fix `5fb5fbf9`: small shared `src/render/glb.ts` fetches the GLB, rejects
HTTP statuses exactly as before (200/0 only), calls native`arrayBuffer()`, then
existing`GLTFLoader.parseAsync` with`LoaderUtils.extractUrlBase(url)`. All three
source callers route through it: cached aircraft templates, native carrier/
destroyer presentation and fitted local fleets. Their cache/retry/placeholder/
dispose logic is unchanged. No global production fetch patch, response-property
change, FileLoader/dependency/bundle edit, request filtering, game-state grant or
quality/timeout relaxation. Current callers use default local loaders; custom
transport/manager options would need forwarding if a caller later adopts them.
The diagnostic fallback is supporting evidence, not a post-fix app capture.

Parent reran actual source helper/error/route assertions and actual local-session
CPU groups: ammo600→589, enemyHP989.1999999999998, pause/disposal and natural
capital outcome/15s reset all pass. CPU geometry/parse instrumentation remains
explicit, not texture/pixel or native-input proof. The real current main.ts also
bundles write:false. Fresh source-only build `.tmp/wings-local-direct-buffer`:
**26 files /3,809,712 bytes**, exact Three0.186.0/esbuild0.28.2, generated import/
HTML/CSS/worker closure pass, no external imports or.ts URLs. No models/fonts
copied. The bounded server default now serves this build; actual HTTP checks
passed index/main/model bytes/content lengths and traversal/source-route rejection,
then closed. Earlier build and traces remain intact.

## Phase disposition

**Diagnostic/source-fix phase complete; native gameplay/capture acceptance HOLD.**
There is no remaining browser launch in this phase and no generic approval loop.
The next needed technical change is a responsive renderer/compositor capture route
(preferably supported acceleration), or GPU-profile evidence enabling a quality-
preserving performance fix. These traces do not justify an invented shader/LOD
patch, looser deadlines, forced frames, hidden errors or accepted blank images.
Actual pixels, normal flight/fire/HUD and stable native play remain unaccepted.
No games/IDs, runtime dependencies, publication changes, installs or push.

Milestones: `8b3dcf34` passive probe;`1b50f500` bounded runner/contract;
`dd217c01` inventory;`b48b48ca` direct-body probe;`cce0732e` H1 trace/H2
hypothesis;`8841d8e2` inventory;`5fb5fbf9` shared source transport fix.
Parent delivery/reconciliation follows these commits. Wings inventory is refreshed
only for inspected source; the unchanged global coverage blocker remains
`Missing docs/maintenance/games/001-brainrotboulevard.md`.

Initial phase root-free bytes2,409,234,432; final source-build/HTTP-check reading
2,399,068,160 (observed decrease10,166,272 bytes, including shared-root activity).
No disk-floor waiver or destructive cleanup. No browser/native action after2/2.

## CPU evidence before any launch

`node Games/Wings/authoring/local-trace-probe-check.mjs`: fake-native delegation,
IDs/cancel/error/abort forwarding, bounded DTOs, no signal reads/retention, one
observer interval, zero observer RAF requests, no state/resource handles, duplicate
initialization safe. CPU fixture data is not native evidence.

`python3 -B Games/Wings/verification/trace-local-startup.py --self-check`: exact
existing browser argument parity, initiator/cancel metadata and no cookie/header
retention. No browser is launched by either check.
