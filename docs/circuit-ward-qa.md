# Circuit Ward implementation and QA, 2026-10-01

## Current release status

**Not released; no push.** Operator personally supplied six Dot-generated models
and gave direct GO for public publication in this repository/site, contingent on
passing release gates. This scoped permission is not verification of provider
legal identity, broader terms or embedded CC0 claims. See
[circuit-ward-models.md](circuit-ward-models.md).

The latest integration regression has **two failed four-window movement runs**,
not a current green result. The reported host simulation reached only 2.16 seconds
after 30 seconds of real time under software rendering (approximately 54k
triangles per window, four windows). This observation is not a confirmed root
cause or hardware benchmark. A separate worker owns regression diagnosis and
`scripts/test_circuit_ward.py`; its updated result is **pending**. Earlier
primitive-only regression success does not establish current integration success.

The normal sparse full gate in temporary evidence
`circuit-workers/models-full-gate.log` exited 1:

```text
ok   Circuit Ward                 console_errors=0 failed_reqs=0
== 1/121 games pass ==
```

The other 120 legacy games lacked sparse-excluded local files/assets. This is
neither a clean all-games gate nor proof of deployed breakage. **Updated bounded
all-games gate result: pending.** The orchestrator will delegate a final evidence
update after diagnosis and the complete gate finish; no result is inferred here.

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
No new screenshots or browser tests were taken for this docs-only update.
Historical primitive screenshots and regression logs remain historical only.

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
195853264 bytes; a plan/self-check is not a browser gate pass.

Full checkout is forbidden: approximately 1.872G game assets with 2.47G free
would leave about 0.6G. Commit all worker changes before the bounded gate; do not
edit or commit concurrently. Restore the original **assets, docs, scripts**
sparse selection and sparse configuration exactly, release temporary game
assets and establish clean Git status afterward, including on failure or
interruption. Restoration success alone is not a passing gate.

Final evidence update must record the actual updated regression command/result,
ALL-121 gate log/count, restoration, disk delta and clean status. Public GO does
not waive green full-gate or remote verification requirements. No push until
these complete. This docs-only worker verified `PI_PROVIDER=openai-codex` and
`PI_MODEL=gpt-6.1-sol`; it owns only the three assigned docs, not the diagnosis,
gate execution or release.
