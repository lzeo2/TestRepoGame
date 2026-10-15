# Fleet 2026-10-15: lane2 follow-up triage

## Decision and scope

**Full release gate remains FAILED: 122/125, exit 1 at `5ed48f4`. No push.**
Fresh tests reproduce the two final navigation failures only after Wings in the
same browser. They do not establish independent Server Survival/Astray defects.
Wings renderer/driver interaction remains held; its smoke `ok` is not flight
acceptance. Jetpack Joyride Hacked remains unresolved, not waived as transient.

Only this report is changed. No runtime/minified edits, filter changes, render-gate
bypass, registration, new games, installs, fetches, branch/sparse changes or push.
Read AGENTS, CODE_QUALITY, maintenance README, testing guide and the exact four
manuals. Historical PASS reports were not used as current acceptance.

Evidence names below are relative to the coordinator's external `trg-fleet/`
scratch directory: `lane6/` is the completed full gate; `triage/` contains this
follow-up's commands, process results and logs. No scratch files are committed.

## Completed full-gate evidence

`lane6/result.json` records the actual command:

```sh
xvfb-run -a python3 -B -u -c 'import sys; sys.path.insert(0, "scripts"); import run_sparse_smoke as adapter; adapter.FLOOR = 2*1024**3; adapter.run()'
```

No targeting arguments: all 125 pages visited, unchanged smoke runner, only the
adapter floor raised to 2 GiB. Elapsed 1600.323 seconds; exit 1; restored true;
minimum free bytes 2257891328. Restoration is not gate success. Full-log status
scan found exactly 122 `ok` and three `FAIL` lines:

```text
FAIL Jetpack Joyride Hacked       console_errors=0 failed_reqs=7
ok   Wings                        console_errors=0 failed_reqs=0
FAIL Server Survival              console_errors=1 failed_reqs=0
FAIL Astray                       console_errors=1 failed_reqs=0
== 122/125 games pass ==
```

Jetpack is page 34; Wings/Server Survival/Astray are pages 123/124/125. Both
final failures are `Page.goto: Timeout 15000ms exceeded`, waiting for
`domcontentloaded`. Their entry and dependency GETs returned 200; there were no
reported failed requests. No evidence makes those timeouts equivalent to 404s.

SHA-256 evidence anchors:

- `lane6/gate.log`: `303895caca52f6428ee5559781db8fd1aee22888c3a2915c3cf34775c292a80f`
- `lane6/result.json`: `06ec708c04045f14ea22460088968b7d75f8a707862912a534aa280030e7f979`
- `scripts/smoke_test_games.py`: `ee204d35ee1cd65bd11936decc627fe30644fe7edde5126e2f16e39c2c8f7f6f`
- `scripts/run_sparse_smoke.py`: `5833da8665e512a228d210d2cc5c891740752bd6c32c4b59ba3ed8d02f6052c2`

Both script hashes match `lane6/script-hashes-before.txt`.

## Fresh bounded runs

All used already materialized files, a new Chromium browser for each command,
the unchanged smoke flags/filters, default eight-second wait and 15-second
navigation timeout. Within a command the original runner reuses one browser,
creating and closing a page per game. Ports isolate these runs from other lanes.

```sh
SMOKE_PORT=8981 xvfb-run -a python3 -B -u scripts/smoke_test_games.py --games 'Server Survival'
SMOKE_PORT=8982 xvfb-run -a python3 -B -u scripts/smoke_test_games.py --games 'Astray'
SMOKE_PORT=8983 xvfb-run -a python3 -B -u scripts/smoke_test_games.py --games 'Wings'
SMOKE_PORT=8984 xvfb-run -a python3 -B -u scripts/smoke_test_games.py --games 'Wings,Server Survival,Astray'
SMOKE_PORT=8985 xvfb-run -a python3 -B -u scripts/smoke_test_games.py --games 'Server Survival,Astray'
```

| Log in `triage/` | Process cap | Actual result |
| --- | --- | --- |
| `server-isolated.log` | 85 s | 1/1, exit 0, 25.843 s |
| `astray-isolated.log` | 85 s | 1/1, exit 0, 20.727 s |
| `wings-isolated.log` | 100 s | 1/1, exit 0, 17.135 s |
| `wings-server-astray.log` | 150 s | 1/3, exit 1, 48.418 s; Wings `ok`, both successors time out |
| `server-astray-control.log` | 60 s | 2/2, exit 0, 40.614 s |

The three-game run reproduces the full gate's final failure pattern without
sparse materialization or the preceding 122 games. The two-game control passes
without Wings. This is evidence of a Wings-triggered shared-browser/environment
interaction, not a claim that every platform or every Wings session fails.
Targeted results never replace the failed 122/125 full gate.

### Raw context diagnostic

An additional temporary `triage/diagnose.py` uses the same Chromium flags,
viewport, page order and smoke interaction selectors. It logs all console
levels, page errors and failed requests, plus entry/return around the original
`HTMLCanvasElement.getContext` using `Reflect.apply`. It does not replace the
context, fake rendering, filter errors or modify the runtime files. Its command
is `DEBUG=pw:browser xvfb-run -a python3 -B -u "$TRIAGE/diagnose.py"`, where
`TRIAGE` is the external triage directory; process cap 90 seconds, port 8986.
This instrumentation is diagnostic only, not a second acceptance gate.

Observed in `context-diagnostic.log`:

```text
4.911 Wings console warning THREE.WebGPURenderer: WebGPU is not available, running under WebGL2 backend.
4.913 Wings console log TRIAGE getContext enter webgl2
4.954 Wings console log TRIAGE getContext exit webgl2 true
6.594 Wings console warning THREE.AttributeNode: Vertex attribute "uv" not found on geometry.
21.087 Wings close end
23.185 ServerSurvival console log TRIAGE getContext enter webgl2
36.701 ServerSurvival ERROR Page.goto: Timeout 15000ms exceeded.
37.401 Astray console log TRIAGE getContext enter experimental-webgl
52.096 Astray ERROR Page.goto: Timeout 15000ms exceeded.
```

Neither successor logs a context return before its timeout/page close. The
instrumented sequence therefore reproduces blocking inside native context
creation after Wings, not merely slow HTTP dependency loading. The process
completed in 54.670 seconds, exit 0 because the diagnostic catches and logs
navigation errors; **that exit is not a test PASS**. Chromium closed normally.
The missing-UV warning does not identify the responsible shader or prove the
underlying driver/compiler root cause. Server Survival constructs its WebGL renderer
synchronously at `game.js:334` during native-module startup; Astray constructs
its renderer in its document-ready callback at `index.html:296`.

Wings' recorded source patch starts its scene before flight and awaits a real
first draw; it has a 20-second first-draw timer. The smoke runner does not assert
that draw, visible aircraft, diagnostics, or flight controls. Its short window,
console-error-only collection and existing exclusions cannot establish renderer
health. Do not increase timeouts, remove the first-draw guard or restart browsers
inside the mandatory gate merely to turn these failures green.

## Jetpack: tracked-source inspection only

No checkout expansion or native Jetpack rerun occurred. The current tree
`0bdb30cf0188a3f0ea7c7fc48860c9b893e80fe4` and entry blob
`351b15e272de13fc24b8e55669eaf356918d0861` match the inventory.
Read the tracked HTML; syntax-checked the tracked `game3.js` through a temporary
copy, exit 0. The obfuscated engine was not comprehensively decoded/reviewed.
HTML still loads local Phaser/game3 and offline ad no-ops; the cheat/storage
wrappers retain their manual's unresolved findings. No small safe fix is proven.

The gate reports seven failed requests but retains only three samples because
its result tuples slice `fails[:3]`. All three retained samples say
`net::ERR_NETWORK_CHANGED`; the other four URLs/reasons are not recoverable from
this log. Each retained basename exists in Git beneath
`Games/JetpackJoyrideHacked/assets/png/`:

| Basename | Tracked bytes |
| --- | ---: |
| `4aYqZlweZQJUE6g` | 9466 |
| `wMXRK79F5qhS4vvr` | 210 |
| `Du1uY8ZeNd9PYmqJ` | 522 |

No Jetpack HTTP non-success appears in the full server log; these three names
have no corresponding completed GET lines there. Existing encoded asset bytes
are not proof of malformed payloads, and existence is not proof of successful
loading. Network-change errors suggest a transport/environment event, but no
network trace or fresh runtime reproduction establishes its cause. This failure
predates Wings by many pages and must not be attributed to the later Wings run.

## Exact next actions and holds

1. **Wings source recovery:** coordinator must supply the existing pinned
   anomalyco staging source at `bf5f6277e38ee52e9bfa4ae4a01337b46175c181`
   with the port changes. The prior recovery ticket is pending. Deployed bundles,
   `port.patch`, caches and regression sources are not a complete staging tree.
   New model picker, aircraft tuning/cockpit integration and quality work remain
   blocked despite the two GLBs being present. No fetch/minified-edit workaround.
2. **Renderer investigation:** with that source and coordinator authorization,
   trace the missing-UV material and WebGL2 fallback/context lifecycle; obtain
   compiler/driver diagnostics and supported-GPU evidence. Preserve fail-closed
   first-draw handling. Repeat the isolated/two-game/three-game matrix after any
   reviewed source fix, then native flight and a fresh unchanged full gate.
   No particular shader patch is justified by the present evidence.
3. **Server Survival/Astray:** no runtime patch proposed. Their isolated and
   shared-browser control passes contrast with the post-Wings timeouts. Keep the
   full-gate failures open until the renderer interaction is resolved. These
   smoke checks do not renew gameplay, campaign, touch or restart acceptance.
4. **Jetpack:** after lane4/coordinator releases the sparse-testing hold, authorize
   a narrow isolated rerun with all request failures/URLs and browser network
   events captured outside the unchanged gate, plus actual scene activation.
   Repair only a reproduced dependency/loader defect; otherwise stabilize the
   test environment and rerun the full gate. Retain provenance/cheat-save holds.
5. **Integration:** inventory refresh belongs to its coordinator/owner. The five
   inherited-identity commits `1b1915b`, `3ab3c1a`, `39f4ef3`, `2680ee0`,
   `5ed48f4` remain unchanged and escalated; no amend or history rewrite here.

## Static checks and operational limits

Actual `triage/static-checks.log` output:

```text
PASS: 125 catalog entries, schema, unique integer IDs, Git-tracked URLs
PASS: Wings: 41 materialized tracked files match HEAD
PASS: ServerSurvival: 82 materialized tracked files match HEAD
PASS: Astray: 15 materialized tracked files match HEAD
PASS: tracked Jetpack game3.js syntax only
PASS: git diff --check
```

At inspection the inventory still has 118 catalog entries and lacks all three
newer game records. `python3 -B scripts/check_maintenance_docs.py` exited 1:
`AssertionError: Inventory stale: inspect changes, then run --refresh.`
No shared inventory refresh was made. No new external runtime loads.

No screenshots were captured and no visual/rendered-flight approval is claimed.
The test supervisors record exact commands, PIDs, exit status and elapsed times
in `triage/results.json` and `triage/extra-results.json`, applying process-group
TERM/KILL cleanup after each command. Configured test caps total 570 seconds,
with no test process allowed ten minutes. Actual combined process elapsed time
was 207.407 seconds; none hit its cap. `triage/cleanup.json` confirms no live or
zombie processes in the six owned process groups, no listeners on 8981-8986 and
unchanged sparse selection. No other lane's processes were killed.

Disk remained about 2.3 GB free: initial recorded free bytes 2381455360, final
2380681216, shared-workspace delta -774144 bytes; triage artifacts 1351788 bytes.
The shared delta includes concurrent work and is not attributed solely to this
report. All runs began above the 2 GiB floor. `git diff --check` passed. Before
commit, the only other dirty paths were lane4's
`docs/maintenance/site/accessibility-and-style.md`,
`docs/maintenance/site/portal.md` and
`docs/maintenance/audits/fleet-2026-10-15-lane4.md`; none was staged by lane2.

Commit only this report under the shared Git lock with the requested
nonpersonal author/committer overrides. Existing runtime/source commits are
untouched. No release claim follows from this documentation milestone.
