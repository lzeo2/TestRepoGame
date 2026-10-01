# Overnight static security, provenance and release review

Delegation 37, 2026-10-01 UTC. Static/Node-only review of branch
`feat/overnight-games`, baseline `528aa48`, snapshot
`9b0a6896942c1eb444a6d2fae115ff52fb655fac`. No browser/GPU run, code/test/catalog
edit, installation, history rewrite or push. Actual environment verified:
`PI_PROVIDER=openai-codex`, `PI_MODEL=gpt-6.1-sol`, reasoning `high`; bounded
to ten minutes. This review does not certify artwork rights or replace Main's
visual judgment.

## Release disposition: HOLD, not approved

1. **Mandatory current full gate remains pending:** after all writers stop,
   clean/freeze HEAD, restore sparse selection, then run the unchanged
   `xvfb-run python3 scripts/smoke_test_games.py` for all **115** registered
   games. The approved `scripts/run_sparse_smoke.py` may materialize bounded
   games serially; no filtering/allowlist weakening. Old 121/121 and focused
   logs are not tonight's full gate. Current full-gate passes: **none claimed**.
2. **Git identity disposition remains an operator sign-off:** inherited local
   author metadata was newly noticed; ticket `pi-912882-1790864408791` remains
   pending per Main. No identity values reproduced here. Ordinary author
   metadata is not automatically a credential leak, but policy disposition is
   unresolved. No published/local history repair is authorized; do not rewrite,
   amend or rebase. This review commit uses `Arcade Worker` and empty author/
   committer emails. Main restores its temporary local config after workers.
3. **Separate artwork/publication holds:** Foldwild delivery creator/CC0
   assertions are unverified; operator authorization covers scoped use, not
   independently established broad redistribution. Three CV vehicles have
   separate pending rights and concept/runtime approval, are unused, and must
   not be represented as accepted vehicle gameplay. No new critical code-flow
   issue was identified in this bounded static review; that is not a general
   security certification.

## Scope and provenance

| Work | Status and evidence | Build / registration |
| --- | --- | --- |
| Tag Relay 223 | Registered ingested MIT game by Leo B / Hack Club; game pin `1450c00a43c5ec09d2c4a8971763226ab447829f`; compiled Sprig 1.0.3 runtime has its separate notice/pin. Fourteen arenas, sprites and tunes retained; lifecycle/audio/timing changes disclosed. | `d18dab3` / `0b60120` |
| Spline Ride 224 | Registered ingested MIT three.js authors' r160 demo, pin `d04539a76736ff500cae883d6a38b3dd8643c548`; sixteen paths and open-ended 20-second lap behavior, not flight physics. Local engine/CurveExtras/OrbitControls notices retained; helper import rewrites disclosed. | `33e29fe` / `0b60120` |
| Foldwild | Explicitly authorized original self-made solo RPG, **unregistered**, future ID unresolved. Eighty supplied species, not eighty newly invented models; ten family prototypes are not vendored species. Optional hidden species is null with no runtime request. MIT is the engine license, not a blanket game/art license. | `a4eb286`, `28f9514`, `c2a143a`, `3636979`, core `b5ddff8`, layout `9b0a689`; no registration |
| Circuit Ward CV deliveries | Three operator-supplied unchanged GLBs, 660120 bytes; vendor/documentation only. Original six-model/game permission scope remains separate. | `3a90d2d`; no game addition |

Source evidence: `tag-relay-sources.md`, `tag-source-search.md`,
`spline-ride-sources.md`, `3d-demo-source-search.md`, `foldwild-sources.md`,
`monster-model-delivery.md`, and `circuit-ward-vehicle-delivery.md`; game credits
and full vendor notices remain local. Source-search artifact preservation records
17/17 hashes/sizes and documentary-only references, not deletion of runtime
assets. No fallback self-made port, third registered addition or new ID assigned.

## Actual static verification

Commands used Node's `--experimental-default-type=module`, Git blobs/trees and
stdlib Python; no sparse-excluded URL was classified missing from filesystem
absence. Actual output:

```text
PASS: catalog=115 unique integer IDs/schema/existing categories/all URLs tracked; original 113 unchanged in order; additions=223,224; Foldwild unregistered
PASS: Node syntax 31 changed authored/vendor JS/MJS blobs
PASS: 35 actual static module imports resolve to tracked local files
PASS: 5 Tag/Spline recorded source hashes; 4 Foldwild vendors exact baseline copies; both Tag full MIT grants/warranty retained
PASS: added GLB JSON examined=83 nonembedded resource URIs=0
PASS: 80 exact roster species; 16/element; 10 families x8; 50 exact normative actions; evolution 12/26 acyclic; hidden null; wheel/schema; 80 tracked/local SHA matches; models=7300844 bytes
PASS: 80 species; all 50 abilities executed; 25 wheel pairs (5 strong/5 reverse); bounds/effects/Wait/switch/KO/teams/capture/replay/immutability/XP/invalid inputs/local-only
Capture reproducibility: hit seed=670, miss seed=671
PASS: world/save exact API; 3 regions/rivals; pools 35/75/80 and 4:2:1 weighting; deterministic unique points/proximity; immutable inputs; strict schema/UID/effects/prototype/unknown ids; canonical resources/progress; storage namespace/quota/security/invalid JSON byte preservation
```

Reproduce the three pure checks:

```sh
for check in data battle world; do
  node --experimental-default-type=module "scripts/test_foldwild_${check}.mjs" || exit
done
```

Detailed syntax output is the temporary artifact `overnight-review-syntax.log`.

Full baseline diff whitespace check exits **2**: the same pinned three.js
`46517` indentation at two local vendor copies and Tag `original.js:586` trailing
blank line. These are **two distinct preserved upstream source files**, not a
broad vendor exemption. Current working diff check exited 0. No source bytes
changed to conceal diagnostics.

All changed UTF-8 blobs and 83 GLB JSON headers received bounded path/email/
common-token scans. The sole candidate was the detection regex itself in
`scripts/audit_circuit_vehicles.py`, not a personal identity. No matching new-game
nonvendor franchise terms or executable URL/dynamic-execution candidates were
found. Upstream reference URLs and generic loader APIs are not themselves
runtime third-party requests. GLB scans do not establish authorship or rights.

## Trust-boundary and protected-scope trace

Read all authored Foldwild `data.js`, `battle.js`, `world.js`, `view.js` and
`script.js`, and traced callers of normalization, save APIs and model loading.
LocalStorage JSON enters `readSave` then strict version/known-ID/bounded
roster/team/resource validation. Creature projection and canonical recreation
ignore user-derived stats. Invalid/unknown-version bytes remain untouched;
entry autosave is disabled until native replacement confirmation. Writes
validate before the namespaced `setItem`; quota/unavailable storage reports
failure. UI strings use text nodes/textContent, not user-derived HTML.

Model selection comes from canonical species constants, passes a local `.glb`
path guard and uses `new URL(path, import.meta.url)`; save data supplies no model
URL. Stock GLTFLoader can load arbitrary URLs in general, but these callers and
embedded-resource assets do not request remote resources. Missing models expose
fallback diagnostics, not fabricated rendering success. One core-owned RAF,
held-input release, modal/pause/visibility guards and unload disposal were
inspected; this is not hardware performance or natural hidden-tab QA.

Tag entry/game lifecycle and Spline entry were also read: restart cleanup,
terminal timer/audio shutdown, native input paths, real elapsed lap counting and
geometry disposal are implemented. No runtime/editor dynamic code execution
was added. Baseline Git diff shows **zero changes** to Character AI, Eaglercraft,
proxy/Netlify boundaries, the smoke script or existing Ward runtime JS/HTML/CSS.
Existing offline/GPL/ownership boundaries are not newly retested or waived.
CV filenames occur only in Ward credits, not its six-name constructed loader.

## Preserved native evidence, not rerun here

| Source log | Actual result and limit |
| --- | --- |
| `tag-relay-qa/regression.log` | Exit 0; Red 7-6, Blue 7-0, 127 legal moves, two-touch 320/390, one RAF, zero normal page/console/request/HTTP/external errors. Deliberate negative fixture reported separately. Delegations 25/29 timeout history remains disclosed; no third implementation retry. |
| `spline-ride-qa/regression.log` | PASS; all sixteen paths, real 20-second lap, controls/touch/reset/resize/disposal checks, zero normal errors/external requests. Three PNGs plus two theme JPEGs; natural hidden-tab behavior not tested. |
| `foldwild-core-qa/regression.log` | PASS; 12 seconds held WASD, actual Sootnub capture, paper-kite draw call 1, two allies/team persisted via Continue; cancel preserved old bytes, confirmed replacement/reset; zero normal errors/external requests. Six JPEGs total 197716 bytes. Three world GLBs listed, **not all eighty models browser-loaded**. |
| `foldwild-layout.md`, commit `9b0a689` | Worker 36 records native viewport PASS, zero errors, 44px controls, three JPEGs total 174658 bytes. CSS fixed offscreen battle presentation; at 320px Flee still uses normal scrolling. Not rerun or visually signed off by this reviewer. |

Main reports personal Tag/Spline/core screenshot inspection; final subjective
layout/theme approval remains Main's responsibility. Archive evidence of 308/308
CRCs and 90/90 structural GLBs includes source-only prototypes and is **not**
eighty-model browser proof. Full natural evolution, all three rivals/campaign,
Chromebook FPS, WebGL1-only campaign, true hidden-tab behavior and new LAN/co-op
retesting remain unproven. Existing Ward co-op release evidence is historical.

Re-ran `PYTHONDONTWRITEBYTECODE=1 python3 scripts/audit_circuit_vehicles.py`:
**strict concept audit failed, 0/3, exit 1**; decoded triangles 1060/1776/2476
are within 1600/2400/4000 caps. Prior local r160 Node loader parsed 3/3 with no
network, not browser QA. Missing indices are legal nonindexed glTF; the reused
species helper's indexed-only rule is a known limitation, not proof of broken
GLBs. Roughness, dimensions, declared axis and roof/open-seat concept concerns
remain pending. No weakening, silent rotation/transcode, visual tier or complete
flat-normal pass is claimed.

## Storage and freeze handoff

At the reviewed snapshot, tracked logical bytes from `git ls-tree -r -l`:
**1919284804 baseline**, **1930421148 HEAD**, **+11136344 bytes**. This measures
tracked logical content only, before this review's docs; it is not physical
space reclaimed, Git-object growth or an exact workspace delta. Current
`du -sh`: `.git` 816M, `Games` 13M. Root available 2360905728 bytes, rounded
`2.2G`; no measured exact baseline physical delta is available.

Sparse selection still includes Ward/Foldwild/Tag/Spline plus original
`assets`, `docs`, `scripts`. Main must restore the original selection before
the final gate snapshot. Ordinary 2 GB guard remains; approved full-gate-only
exception is at most 300 MiB materialization and 1.5 GiB floor, serial narrow
reuse preferred over broad checkout. Gate worker 38 waits for writers 35/36/37
to stop and a clean frozen tree. No push or release approval from this review.
