# Ovo sparse smoke review

## Source and old failure

Reviewed on 2026-10-01 with verified `openai-codex/gpt-6.1-sol`, bounded to
10 minutes. Existing catalog target: `Games/Ovo/1.4.5/index.html`.
Its HEAD and origin/main bytes match (SHA-256
`ba6d634e06df95d95949cb64a382f0638567f7232f1a31dd838e1bfb2306d4f6`).
No new game or attribution claim is introduced.

The supplied `release-full-gate.log` records:

- `== 120/121 games pass ==`; sole failure: Ovo,
  `PAGE: Page.goto: Timeout 15000ms exceeded.` No failed requests recorded.
- At 19:27:03 the server served the index, CSS, jQuery and GameAnalytics.
  Tween, html2canvas and gritter were only logged at 19:27:30, after failure.
  Neither c2runtime nor the module loader was requested in that excerpt.
- `SPARSE RESTORED: pages=121/121, peak_Games_bytes=195853264,
  remaining_Games_bytes=0`; restoration does not mean gate success.

These are server response timestamps, not browser request-start timings.
They cannot distinguish HTTP connection backlog, cold SD-card reads, host
CPU scheduling or browser execution. The original timeout was not reproduced
below; no particular transient cause is proven.

## Dependency trace and what changed

Cached callers include the 1.4.5 index's deferred module
`../src/modloaders/modloader.js`. A recursive trace of relative imports finds
30 tracked modules, all under `src/modloaders`; the old sparse plan excluded
that sibling tree. The loader subsequently fetches backend/changelog JSON,
`data.js`, skin textures, replayruntime and loader images. Backend defaults
activate `community.js` for CTLE; it fetches community-level configuration
and constructs paths beneath `src/communitylevels/`.

Only `scripts/run_sparse_smoke.py` changed: the 1.4.5 plan adds narrow
`src/modloaders/util`, `src/mods/modloader/config`, `src/img`, `src/skins` and
`src/communitylevels` folders. Cone ancestor files supply modloader.js and
community.js. Legacy loaders, other Ovo versions and vanilla asset trees
remain excluded. Shared plans are unchanged. On-demand menu navigation to
Ovo's separate assets tree was not exercised or added to this smoke plan.

The production index and engine are untouched. So is
`scripts/smoke_test_games.py` (SHA-256
`ee204d35ee1cd65bd11936decc627fe30644fe7edde5126e2f16e39c2c8f7f6f`).
No timeout, wait, browser argument, filter or failure criterion changed.

## Two diagnostic rounds only

Both used the current gate through `runpy`, with arguments `--games Ovo`,
separate local ports, native headful Chromium under Xvfb, its existing five
launch arguments, 15000ms DOMContentLoaded navigation and 8000ms wait.
Temporary observers recorded monotonic timings without changing gate results.
Logs are temporary external artifacts named `ovo-smoke-round1.log` and
`ovo-smoke-round2.log`; no captures were taken.

| Round | Games bytes | goto elapsed | Result |
| --- | ---: | ---: | --- |
| 1: original sparse plan | 95985660 | 0.808s | `0/1 games pass`; HTTP 404 modloader.js and ERR_ABORTED |
| 2: corrected plan | 110225996 | 0.856s | `1/1 games pass`; console_errors=0, failed_reqs=0 |

Both runtime observations after the normal wait were
`ready=complete, runtime=True, loading=False`. Round 1 requested c2runtime
0.112s and modloader 0.113s after goto began. Round 2 requested them 0.219s
and 0.223s after goto began. The missing dependency is therefore a separately
reproduced wrapper defect, not an established explanation for the old timeout.

Round 2's extra pageerror observer also recorded six uncaught
`Cannot read properties of null (reading 'loadTexture')` exceptions.
Existing loader utility and community image callbacks directly call
`runtime.glwrap.loadTexture`; the native gate disables GPU. A null WebGL
wrapper is a plausible cause, not a verified stack diagnosis. The gate does
not subscribe to pageerror, so its targeted pass is not a claim of clean
runtime behavior. This finding was escalated; no engine patch or suppression.

Each round restored the original assets/docs/scripts sparse patterns and
configuration byte-for-byte in `finally`, checked unchanged HEAD and baseline
status, and released all temporary Games files (`Games_bytes=0`). Round 2
retained only the owned script edit. Per-round reported free-space delta was
-4096 bytes; free space remained about 2.1 GiB. The 300 MiB Games cap and
1.5 GiB floor held; logs total 80542 bytes, below the normal artifact cap.

## Checks and release decision

- Self-test: `URL safety, cone ancestor budgets and Ovo-only loader closure OK`.
- Static trace: `30 tracked module imports covered by Ovo-only plan`.
- Plan: `121 registered games; maximum predicted Games bytes=195853264`.
- Catalog: `121 catalog entries: schema, unique IDs and tracked URLs OK`.
- Wrapper syntax and `git diff --check` pass. No external loads were added.

**Diagnostic only, not release green.** A new full 121-game lifecycle pass
is required after this wrapper fix. Capture host CPU/I/O and request-start
telemetry if the original timeout recurs. No third reproduction round, no
push, and no games added. The uncaught runtime finding remains separate from
the unchanged gate's known console/request exclusions.
