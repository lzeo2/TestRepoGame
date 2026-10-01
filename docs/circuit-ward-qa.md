# Circuit Ward implementation and QA, 2026-10-01

## Current release status

**Current build approved; release criteria green. Not yet pushed or remotely
verified.** Operator personally supplied six Dot-generated models and gave direct
GO for public publication in this repository/site. This scoped permission is not
verification of provider legal identity, broader terms or embedded CC0 claims.
See [circuit-ward-models.md](circuit-ward-models.md). Actual push and remote
verification remain the orchestrator's pending actions; this is not a shipped
claim. The planned vehicle amendment is not part of this green build.

## Completed six-model regression

Commit `63b150a` records the completed browser regression. Temporary evidence
`circuit-ward-model-qa/regression.log` was read in full, including the earlier
pointer-lock click failure and the subsequent successful bounded check. Its final
write timestamp is **2026-10-01 19:21:58 +10:00**; it is not a new test run by this
docs worker. Runnable command from the repository root:

```sh
xvfb-run python3 scripts/test_circuit_ward.py
```

Exact final output:

```text
Circuit Ward browser checks passed: solo controls/reset, win/lose/repair/friendly-fire, six local GLB replacements, keyboard/touch aiming, touch movement/fire, 320/390 layouts, four-peer sync/input/pause/departure/fallback at 640x360, paused transport heartbeat
Screenshots: desktop 1280x720; mobile 390x844; coop-host 640x360
Regression exit: 0
```

Four native peers used 640x360 windows under SwiftShader. Trusted W input targeted
BODY, not a form; guest Z changed from 6.5 to 6.200299999999974. Host simulation
advanced 0.3666 seconds over 4.7631 real seconds. Software rendering remained slow;
no production defect or hardware FPS result is established. Production stale-input
and timeout safeguards were not weakened. The five captures were reviewed by the
orchestrator: `desktop-menu.png`, `desktop-combat.png`, `mobile-menu.png`,
`mobile-combat.png`, `coop-host.png`, in temporary `circuit-ward-model-qa` evidence.
No captures were taken by this docs-only worker.

Earlier primitive-only success at `77dbd71`, two failed four-window movement
attempts and the pointer-lock click failure remain historical context, not the
current result. The normal sparse gate's historical 1/121 result reflected 120
missing local legacy payloads, not proof of deployed breakage.

## Completed unchanged ALL-games gate

At `3557812`, after `c818e1a` (Ovo sibling materialization) and `3557812` (Ovo
Canvas2D texture guards), the bounded wrapper ran the original full gate with
**no subset, wait, timeout, browser-argument or failure-filter changes**.
Temporary evidence `circuit-workers/release-full-gate-2.log` spans server timestamps
**2026-10-01 20:19:14 to 20:43:16**; `release-full-gate-2.status` contains `0`.
All 121 passing rows were matched against the current catalog in order, with no
FAIL rows. Exact matched rows and summary:

```text
ok   Ovo                          console_errors=0 failed_reqs=0
ok   Circuit Ward                 console_errors=0 failed_reqs=0
== 121/121 games pass ==
SPARSE RESTORED: pages=121/121, peak_Games_bytes=195853264, remaining_Games_bytes=0; this is not a gate-pass assertion.
```

The original bounded pass in `circuit-workers/release-full-gate.log` was
**120/121**, with Ovo's `PAGE: Page.goto: Timeout 15000ms exceeded.` This failure
was not ignored. The reproduced missing sibling dependency and separate Canvas2D
callback defects, plus the limits of attributing the original timeout, are
recorded in [ovo-smoke-review.md](ovo-smoke-review.md). The later ALL-121 pass
supersedes that release failure, not its diagnostic evidence.

Gate SHA-256 remains
`ee204d35ee1cd65bd11936decc627fe30644fe7edde5126e2f16e39c2c8f7f6f`.
Its existing BENIGN, KNOWN_BENIGN and BENIGN_REQS exclusions still apply; it
captures console/request failures but has no pageerror listener. Green loading
under those unchanged criteria is not zero raw errors or complete gameplay
certification for every legacy game.

## Build and delivery milestones

Circuit Ward is **one self-made game**, id **222**, under the dated exception in
ticket `pi-912882-1790827041648`. No new game is added by this docs update.

| Milestone | Commit |
| --- | --- |
| Approval / one-run exception | `b15c1c0` |
| Pinned local three.js | `e02d5d8` |
| Native manual peer transport | `14ce629` |
| Primitive game build | `0a9a6b9` |
| Pairing, shell, camera, heartbeat and initial regression | `77dbd71` |
| Catalog registration | `024c179` |
| First five operator-supplied GLBs | `bc57a17` |
| Pinned local GLTFLoader and first audit | `50ff282` |
| Five pooled model visuals | `6e71fa4` |
| Supplied arena wall | `91adf55` |
| Complete six-model structural audit | `3b91483` |
| Instanced wall integration | `b0e19ae` |
| Bounded unchanged full-gate wrapper | `7c906ab` |
| Completed six-model/native four-peer regression | `63b150a` |
| Ovo sibling materialization fix | `c818e1a` |
| Ovo Canvas2D guards; successful ALL-121 gate revision | `3557812` |

All six models are audited: **691300 bytes, 5692 triangles**. The wall is
**101652 bytes, 836 triangles**, within its 2000-triangle ceiling. Missing-wall
ticket `pi-912882-1790843183570` is fulfilled. Embedded provenance/license claims
remain unverified; the three.js MIT license covers the library, not artwork.

All six GLBs load once into shared visual pools; 24 wall instances replace the
primitive walls. Primitive fallback remains on failed loads. The simulation
prefix (`const LIMIT =` to before `let live =`) was compared directly with
`0a9a6b9`: **8317 bytes, byte-identical**, SHA-256
`e8b6860195f0ba9aaa1ba98b9062289df6fa8fb03e8a264845202fff85551d4d`.
Prior worker Node/simulation and structural checks are retained evidence, not a
substitute for current browser regression or the full release gate.

## Implemented behavior and measurement limits

Six solo waves, shield, unlimited-pulse blaster, repair cells, pooled co-op score,
win/loss, retry/menu, keyboard/mouse and touch controls. Optional 2–4-player co-op
uses manual full WebRTC offer/answer exchange, browser-host authority and
`iceServers: []`. No STUN/TURN, signaling service, account, proxy, host migration
or mid-run join. Solo is offline; all runtime dependencies are local.

Initial five-model integration evidence reports **7 draws / 49456 triangles**
in a synthetic stress scene. Completed wall integration reports **8 draws /
69520 triangles** in synthetic stress. These are renderer counters, **not
hardware FPS measurements**, maximum-wave certification or a 60fps claim.
These synthetic counters remain historical measurements. The current six-model
regression and five orchestrator-reviewed captures are recorded above; primitive
screenshots are not evidence for the completed model integration.

Separate-device LAN/school Wi-Fi, Chromebook FPS, explicit WebGL1-only runtime,
a natural complete six-wave play-through and actual hidden-tab timer throttling
remain unverified. Simulation win/loss assertions do not prove a natural run;
a paused transport fixture does not prove real hidden-tab scheduling.

## Authorized bounded full gate

Operator choice `pi-912882-1790844894029` authorizes **one unchanged ALL-121-game
pass** using per-game materialization, via `scripts/run_sparse_smoke.py` in
`7c906ab`:

```sh
xvfb-run python3 scripts/run_sparse_smoke.py
```

The wrapper runs the original `scripts/smoke_test_games.py` without weakening
failure filtering or selecting a subset. During this gate window only, the
30MB workspace cap has an exception: **at most 300 MiB Games payload and at
least 1.5 GiB free disk**. Its plan reports peak predicted Games payload
195853264 bytes; the completed browser lifecycle actually observed the same peak,
below 300 MiB, and released all Games payload. A plan/self-check alone would not
establish a browser gate pass.

Full checkout is forbidden: approximately 1.872G game assets with 2.47G free
would leave about 0.6G. Commit all worker changes before the bounded gate; do not
edit or commit concurrently. Restore the original **assets, docs, scripts**
sparse selection and sparse configuration exactly, release temporary game
assets and establish clean Git status afterward, including on failure or
interruption. Restoration success alone is not a passing gate.

The wrapper's successful restoration verifies the original sparse patterns and
configuration byte-for-byte and clean baseline status. This docs worker also
observed the restored **assets, docs, scripts** selection, **0 Games bytes** and
clean status before editing. Free space was **2428133376 bytes (about 2.3 GB)**;
no gate-wide free-space delta was recorded in the supplied log. Persistent Games
payload delta is zero. The scoped docs diff and catalog schema/unique-ID/tracked-URL
checks pass for **121 entries**; no game code or runtime external loads were added.

Public GO and green current release criteria do not imply publication. Push intent
remains pending actual push and remote verification by the orchestrator. This
docs-only worker verified separate fields `PI_PROVIDER=openai-codex` and
`PI_MODEL=gpt-6.1-sol`; it owns only the three assigned docs, not gate execution,
art capture, game checkout or release.
