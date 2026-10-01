# Overnight full-catalog gate and local handoff

Recorded 2026-10-01 16:02 UTC, delegation 39, documentation only, ten-minute
bound. Verified provider/model: `openai-codex/gpt-6.1-sol`, reasoning `high`.
Branch `feat/overnight-games`, baseline `528aa48`. No checkout, runtime/test/
catalog/source/allowlist edit, installation, history rewrite or push here.

**Full registered-catalog gate: PASS. Release disposition: HOLD for non-gate
sign-offs; no push authorized.** This supersedes the pending gate/restoration
status in the historically dated [overnight-review.md](overnight-review.md),
not its scope, provenance findings or limitations.

## Frozen test and actual result

All writers had stopped. The second test's supervisor required clean status,
original sparse selection and unchanged baseline smoke bytes before launch.

| Evidence | Actual value |
| --- | --- |
| Tested HEAD and after-test HEAD | `3b3bc7a1aebcf64123d4d0dfd6d69b974b5d2a42` |
| Operation | `xvfb-run python3 -u scripts/run_sparse_smoke.py` |
| Outer bound | `timeout --signal=TERM --kill-after=20s 2100s` (35 minutes) |
| Captured process exit / status-file literal | **0 / `0`** |
| Elapsed | **1356.1992332935333 seconds**, approximately **22m36s** |
| Completed rows / visited pages | **115 / 115**; exact catalog order |
| Counted errors in every completed row | `console_errors=0 failed_reqs=0` |
| `FAIL` lines | **0** |
| Final summary | `== 115/115 games pass ==` |
| Sparse selection after test and at report entry | exactly `assets`, `docs`, `scripts` |
| Git status after test and at report entry | empty |
| Peak temporary Games bytes | **195853264**, **186.7802276611328 MiB** |
| Restored Games bytes | **0**; independently checked at report entry |

Actual final log line:

```text
SPARSE RESTORED: pages=115/115, peak_Games_bytes=195853264, remaining_Games_bytes=0; this is not a gate-pass assertion.
```

Temporary artifact identifiers, not committed artifacts:
`circuit-workers/overnight-full-gate-2.log`,
`circuit-workers/overnight-full-gate-2.status`,
`circuit-workers/overnight-full-gate-2.result.json`, and supervisor
`circuit-workers/run-overnight-gate-2.py`. The supervisor captures the real
`Popen.wait()` exit, rather than relying on the first launcher's shell pipeline.
Delegation 39 parsed all 115 result rows and serial visit records, checked
catalog order, read the result JSON/status and compared the original smoke
bytes with baseline. It did not rerun the browser gate.

The existing approved wrapper runs the original `scripts/smoke_test_games.py`
via `runpy`, with **no forwarded filters, timing changes or allowlist changes**.
Its SHA-256 is identical to baseline `528aa48`:
`ee204d35ee1cd65bd11936decc627fe30644fe7edde5126e2f16e39c2c8f7f6f`.
One game at a time is stricter than a fifteen-game batch; the unchanged shared
loader dependencies remain included. No broad Games checkout was needed.

Main launched and monitored this required test as a separate bounded background
operation, not an extended coding worker. Runtime-mismatch escalation
`pi-912882-1790868139772` received **no response**. Main used the clear-default,
non-destructive all-games operation; this is not new permission, an answered
ticket, a gate waiver or permission to scale the Games workspace. The existing
full-gate-only 300 MiB / 1.5 GiB-floor storage approval remained applicable.
Wrapper checks run at each materialization; no continuous minimum-free-space
measurement is claimed.

## First attempt: retain failure evidence

Delegation 38 remained bounded to twenty minutes. Its initial operation had a
1000-second outer timeout and stopped during **War**, page **80/115**. Parsing
`circuit-workers/overnight-full-gate.log` confirms **79 completed rows**, all
with zero counted console/request errors, and no `FAIL` rows. Restoration
reported zero remaining Games bytes. This was **not a full-gate pass**.

`circuit-workers/overnight-full-gate.status` explicitly records **UNKNOWN**:
launcher `errexit` prevented `PIPESTATUS` capture after timeout; the orphaned
wrapper required a second SIGTERM. No reliable exit was captured, so neither
0 nor 124 is attributed to that attempt. The start/end markers are
15:09:31/15:27:44 UTC, not an exact measured test runtime. Shutdown produced
pending-task/`TargetClosedError` diagnostics; they are retained, not hidden or
claimed as normal gameplay failures. Worker 38 hit its twenty-minute bound and
made no documentation commit. Restoration alone does not establish success.
The complete fresh retake changed no criteria and required no game fixes to
force a green result.

## Coverage and exclusions

The gate covers **113 existing registered games plus two registered ingested
ports**, not unregistered Foldwild or a full campaign of every game. Original
smoke watches console errors, failed requests and HTTP errors, attempts the
existing Play/Start selectors and retains its normal wait. It does **not**
subscribe to `pageerror`; focused new-game browser checks do. A passing loading
smoke is not hardware performance, comprehensive gameplay or security proof.

Counts above are **after the original exclusions**, not a claim of no raw
warnings/HTTP failures. Unchanged generic exclusions include favicon/devtools/
source-map noise, software-WebGL fallback, duplicate resource console messages,
Unity audio/boot diagnostics, local HTTP 501 and neutered ad-slot messages.
Request exclusions include existing analytics/ad/storage paths, Unity statistics,
first-run Retro Bowl save probes, `snd.mp3`, blank-document and Safari-only CSS.
The unchanged per-game exceptions are Ovo, Papa's Pizzeria, BitLife, 10 Minutes
Till Dawn, Subway Surfers, Subway Surfers Hacked, Super Hot, Retro Bowl,
Stranded In Isekai, Character Alsen, Cut the Rope, Thumb Fighter and Gladihoppers.
Their exact strings remain reviewable in the original smoke script. No exception
was added or weakened by this run; historical limitations are not waived.

## Scope, provenance and phase results

| Phase | Final local result and boundary |
| --- | --- |
| Tag Relay 223 | Ingested Leo B / Hack Club MIT game, pin `1450c00a43c5ec09d2c4a8971763226ab447829f`, compiled Sprig 1.0.3 with notices. Build `d18dab3`, register `0b60120`. Existing `action` / ASCII `TR`. Focused regression exit 0: fourteen arenas, 127 legal moves, Red 7-6/Blue 7-0, keyboard/two-touch/restart, one RAF, zero normal page/console/request/HTTP/external errors. Negative fixture remains separate. Delegations 25/29 timed out after genuine implementation evidence and before paperwork; no replacement invention. |
| Spline Ride 224 | Ingested three.js authors' MIT r160 math demo, pin `d04539a76736ff500cae883d6a38b3dd8643c548`. Build `33e29fe`, register `0b60120`. Existing `simulation` / ASCII `SR`. Focused PASS: sixteen paths, real twenty-second lap, Ride/Orbit, touch/reset/disposal/resize and zero normal errors. Not flight physics or an invented win/lose game. Delegation 27 timed out; 30's accepted final evidence retains earlier trial failures separately. |
| Foldwild | Explicitly authorized original self-made solo RPG, **unregistered**, future ID unresolved, not 225 reserved. Pure data/battle/world regressions PASS in review 37 and Main's rerun; Main also reran 31 world/save checks. Core 32 hit twenty minutes; core 35 landed `b5ddff8` with native PASS. Layout `9b0a689` has native PASS. No RPG multiplayer. |
| Circuit Ward CV assets | Vendor-only `3a90d2d`, three unchanged GLBs: 132580 + 221300 + 306240 = **660120 bytes**. Triangles/caps **1060/1600**, **1776/2400**, **2476/4000** pass. Local r160 Node loader parsed **3/3**, zero requests. Strict concept audit **0/3, exit 1** remains a finding, not integration approval. |
| Static review 37 | PASS: 115 schema/unique IDs/Git-tracked URLs; 31 JS/MJS syntax checks; 35 local imports; 83 GLB headers with no external resource URIs. Original 113 entries unchanged. Protected Character AI/Eaglercraft/GPL ownership/proxy/Netlify/original smoke and old Ward runtime diffs unchanged. No new separate LAN test. |
| Source preservation / portal | Seventeen candidate files preserved byte-identically outside Git, manifest `a9442c6584779d7d5473ff353c2ebccb1e64568afb97d87305d1ca35d3c9c4e7`, 17/17 checks. No destructive actor-file deletion. `9eba518` only removes eight stale Nintendo thumbnail mappings; eight legacy folders were removed before this baseline. No GRAY rights reclassification, owner outreach or new 2048/Hextris polish. |

Catalog independently rechecked here: **115**, unique integer IDs/schema,
all URLs resolved against Git trees despite sparse exclusion; **only 223/224**
added, all original 113 unchanged in order, no Foldwild registration. Full
baseline diff whitespace warnings are retained in two distinct upstream source
files: pinned three.js indentation at both vendor copies, and Tag original EOF.
They are not a code failure or a broad vendor exemption. Current working diff
was clean; source bytes were not changed to hide diagnostics.

Foldwild supplies **80 models / 7300844 unchanged bytes**: 75 family-shared,
five unique; ten prototype models excluded. Contract: fifty actions, four per
species, evolution levels 12/26, sixteen species per element, three-member party
with one active. Core native evidence includes twelve-second held movement,
two-finger pointers, real capture, team/switch/Wait, Continue positions/resources,
confirmed reset, cancel preserving old bytes, corrupt-save and fallback fixtures,
zero normal errors. It is a playable RPG vertical slice, **not** verified full
three-rival campaign, natural XP/evolution, hardware FPS, WebGL1-only campaign or
true hidden-tab performance. Source performance targets are not measurements.
Optional hidden species remains null and does not block the eighty base species;
no placeholder or runtime fetch. Future unique GLB target is 10,000-15,000
triangles, hard cap **15,999**, not 16,000. The world hint visible during battle
is a low-priority WONTFIX, not a critical defect.

CV nonindexed TRIANGLES are legal glTF; the reused species helper's indexed-only
constraint is too strict for these assets. Roughness/dimension/declared-axis and
concept discrepancies need future validation; strict rejection does not prove
three broken GLBs. Their actual unchanged hashes are in
[circuit-ward-vehicle-delivery.md](circuit-ward-vehicle-delivery.md).
No CV runtime consumer, amendment approval, drivable tiers or added game is
claimed; all original six Ward models remain unchanged. Rights and concept/
runtime amendment GO are separate sign-offs despite Main's prior two concept
image reviews. Foldwild archive creator/CC0/provider identity assertions remain
**unverified**; scoped operator use is not broad redistribution clearance.

## Main's visual review, not this worker's judgment

Main reports personally approving final Tag desktop menu and two fresh gameplay
captures; all three final Spline PNGs and both dark desktop/mobile-Ride JPEGs
(the two dark reviews occurred after delegation 37); and Foldwild core captures
plus all three final layout JPEGs (**174658 bytes**). Main approved flat/readable
shells, 44px controls/no overflow and zero layout page errors. Foldwild has one
light shell, not an invented second theme; 320px Flee uses ordinary scrolling.
This documents Main's judgment, not personal screenshot inspection by delegation
39. No formal all-AA accessibility certification is asserted.

Focused artifacts: `tag-relay-qa/regression.log`,
`spline-ride-qa/regression.log`, `foldwild-core-qa/regression.log`, and
[foldwild-layout.md](foldwild-layout.md). Core has six JPEGs, **197716 bytes**,
and three world models observed, not all eighty models browser-loaded.

## Storage and local cleanliness

Actual `git ls-tree -r -l` blob sizes, splitting metadata before the TAB path:

| Snapshot | Tracked logical bytes |
| --- | ---: |
| Baseline `528aa48` | 1919284804 |
| Layout milestone `9b0a689` | 1930421148 |
| Frozen tested `3b3bc7a` | **1930434837** |
| Baseline to frozen delta | **+11150033** |

This is tracked logical content, **not physical disk/Git-object growth or
reclaimed space**. Final report additions are outside the frozen metric to avoid
self-referential counting. No physical baseline measurement exists. Report-entry
`df -h / | tail -1`: **2.3G available**, 92% used; observed available bytes
**2373201920**. `du -sh .git`: **816M**. Peak Games **195853264** stayed below
300 MiB; after restoration independently measured **0**. No positive continuous
minimum-free claim. Original sparse selection is exactly the three directories
listed above; no Games materialized by this worker.

Report-entry Git status was empty. This worker commits only
`docs/overnight-gate.md` and `docs/overnight-decisions.md`, with explicit
`Arcade Worker` author/committer names and empty emails, without changing local
config. Final report commit is shown in Git log/Main handoff; it changes no
tested runtime. Clean post-commit status must be verified at handoff.

## Complete local milestones through tested snapshot

Actual `git log --reverse --oneline 528aa48..3b3bc7a`: **15 commits**.
This list cannot include its own final report commit hash.

```text
b37c87d docs: verify bounded official 3D demo source candidates
b773e06 docs: verify reusable local tag game sources
a4eb286 feat: ingest Foldwild roster data and supplied local models
28f9514 feat: implement pure Foldwild turn battle contract
c2a143a feat: add Foldwild 3D view and integration shell
33e29fe feat: ingest verified Spline Ride MIT demo
3636979 feat: add pure Foldwild world and guarded save contract
d18dab3 feat: ingest reviewed Tag Relay MIT port
0b60120 feat: register Tag Relay 223 and Spline Ride 224
9eba518 fix: remove stale Nintendo thumbnail mappings
e4ba427 docs: record overnight defaults and pending sign-offs
3a90d2d chore: vendor pending Circuit Ward vehicle deliveries
b5ddff8 feat: integrate Foldwild solo expedition and offline saves
9b0a689 fix: keep Foldwild battle models beside accessible controls
3b3bc7a docs: record bounded overnight security and release review
```

## Remaining release decisions

No push. Leo decides release/push. Foldwild future ID remains unresolved;
CV independent rights plus concept/runtime amendment and Foldwild art
redistribution remain pending. Git identity disposition ticket
`pi-912882-1790864408791` remains pending: ordinary author metadata is not
necessarily a secret, but policy is ambiguous. No inherited values reproduced
or historic/published/local repair authorized. Main reports its outside-repo
backup restored prior local Git config, preserving other actors' preferences.
Runtime-duration ticket remains unanswered but the required all-games test is
now complete, so it is no longer a full-QA blocker. Gate coverage is not release
or push sign-off. All current work is local.
