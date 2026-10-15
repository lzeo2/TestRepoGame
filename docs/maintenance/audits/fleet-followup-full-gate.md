# Fleet follow-up: completed full gate (2026-10-15)

## Final disposition

**COMPLETE: 124/125, exit 1. Release HOLD; no push.** Gate17's running checkpoint
is superseded by the completed receipts, not treated as success. Final report
ownership was explicitly transferred to this documentation lane. The tested HEAD
was `2d2eb6159bac85218a1e56b47a4937e6e3849820`; it remained identical through
restoration. This handover changes documentation only, not that runtime.

Independent log counting confirms **125 visits, 124 `ok`, one `FAIL` (Ovo)**.
Jetpack Joyride Hacked, Wings, Server Survival and Astray all logged `ok` with
zero retained console errors/failed requests. Earlier **122/125, exit 1** remains
historical evidence, not the latest result. Across these two recorded full runs,
**zero successful full gates out of two**. Targeted successes cannot replace them.
Catalog/inventory remains 125 registered / 130 projects, five unregistered plus
separate shared runtime. No games added, ingested, self-made or registered;
new-game build/register commits: none. Two previously approved original generated
models are integrated into existing Wings source/simulation, not accepted flight.

## Actual invocation and failure receipt

Evidence label: `trg-fleet/final-gate/` in external temporary storage. Read
`gate.log`, `result.json`, `cleanup.json`, `HANDOFF.md`, `original-sparse-list.txt`
and `snapshot-manifest.json`; the latter's private configuration locations are
not reproduced. `HANDOFF.md` records the earlier active state and ownership transfer.

```sh
SMOKE_PORT=8986 PYTHONDONTWRITEBYTECODE=1 xvfb-run -a python3 -B -u -c 'import sys;sys.path.insert(0,"scripts");import run_sparse_smoke as adapter;adapter.FLOOR=2*1024**3;adapter.run()'
```

The adapter runs unchanged `scripts/smoke_test_games.py` through runpy over all
125 entries. No targeting/wait arguments, no individual retry, no filter change.
Default post-DOM wait **8000ms**, navigation timeout **15000ms**. Only adapter
`FLOOR` changed in memory to **2,147,483,648 bytes (2 GiB)**. No script was edited.

Exact summary:

```text
FAIL Ovo                          console_errors=0 failed_reqs=3
== 124/125 games pass ==
  Ovo:
    req: utils.js :: net::ERR_NETWORK_CHANGED
    req: hooks.js :: net::ERR_NETWORK_CHANGED
    req: render.js :: net::ERR_NETWORK_CHANGED
SPARSE RESTORED: pages=125/125, peak_Games_bytes=195853427, remaining_Games_bytes=0; this is not a gate-pass assertion.
```

The receipt retains basenames, not complete request paths; do not guess which
same-named Ovo modules failed. The transport-error category appeared on a different
title than the earlier Jetpack failure. This **does not prove a host/network root
cause**, nor justify blanket retries, exclusions or weakened filtering. Pending
operator ticket `pi-364975-1792055134651` asks for stable-host diagnosis/rerun.
This documentation lane launched no browser, gate or retry.

Existing broad exclusions remain unchanged; **exclusion counts are not logged**.
These are load checks under existing filtering, not unfiltered clean loading,
full gameplay, offline closure, rights, supported-GPU or release acceptance.
**No smoke screenshots.** Main's separate desktop-dark/mobile-light picker review
found fitting labels and visible focus but a crowded failure toast/footer. Those
unavailable-context/fixture images are not flight or converted-material proof.

## Restoration, hashes and storage

`result.json`: `gate_exit=1`, `restored=true`, `hashes_unchanged=true`, clean
`status_after`, identical `head`/`head_after`, `port_closed=true`.
`cleanup.json`: `hard_timeout=false`. Elapsed **1628.989 seconds**.
The adapter first restored its narrowed baseline (`remaining_Games_bytes=0`);
the supervisor then restored the true original sparse selection/configuration.
This lane independently compared all three configuration snapshots byte-for-byte
and the exact sparse list, without printing private contents. They match.
Supervisor **456227**, gate **456255**, watchdog **457638** are gone; independent
`ss` inspection for port **8986** returned only its header. Restoration is not PASS.

| Free-space measurement | Bytes |
| --- | ---: |
| Before gate | 2,347,466,752 |
| Minimum sampled | 2,221,498,368 |
| After original restoration | 2,346,995,712 |
| Measured gate interval delta | -471,040 |
| Peak materialized Games | 195,853,427 |

Minimum remained above 2 GiB. This is shared-filesystem interval accounting, not
a guessed overall fleet storage delta or an isolated artifact budget.

SHA-256 before/after and current files match:

| Tracked input | SHA-256 |
| --- | --- |
| `scripts/run_sparse_smoke.py` | `5833da8665e512a228d210d2cc5c891740752bd6c32c4b59ba3ed8d02f6052c2` |
| `scripts/smoke_test_games.py` | `ee204d35ee1cd65bd11936decc627fe30644fe7edde5126e2f16e39c2c8f7f6f` |
| `games.json` | `46ce897e2d5db2aa48f269c36ae4a3ddae5987c3323629ae2265df97f7c68902` |

External receipt digests:

| Evidence | SHA-256 |
| --- | --- |
| `gate.log` | `0f328ee957905133fd52e00c97fe7b7456efd762ede42e1a72726b5f06aae78a` |
| `result.json` | `e3f6f1b9e16799d9747a43815df830b473d9fb972e844762083b532d37ef5e59` |
| `cleanup.json` | `9500a5be15de601f3cbfa5e1ec4dfd06fdb9328b5fe0ae9124d41020ee0a40b4` |
| `HANDOFF.md` | `292a8b990e896bbe736e9736efedd8991eebdea07ff27ec7266700c5768915b2` |
| `original-sparse-list.txt` | `a04135f6ffad1f13e4a80aa0bd60f4848001412f4a70a93c06731d2752cfbb16` |
| `snapshot-manifest.json` | `dec1f0436a881983134a985570d903530e75753f84ec33979e9bd113913ae99e` |

## Follow-up delivery and continuing holds

See [handover](fleet-followup-handover.md) for the preserved eight-entry identity
map and detailed source/model receipts. This lane independently verified all eight
old/new trees and subjects and all **19 mapped/follow-up commit identities** through
`2d2eb61`, without printing personal values. Five inherited identity findings are
resolved by the approved rebase, not pending. Evidence:
`trg-fleet/followup/identity-map.json`, SHA-256
`47804ca565be35b1180c51811ebc0cb5fa5dad96380288246c8a39fc82529069`.

Follow-up commits verified with actual Git log:

| Commit | Delivery |
| --- | --- |
| `766d387`, `c88a762` | Jetpack diagnosis/metadata and receipt clarification |
| `bdf82dc` | One recent-history snapshot per portal sort |
| `3b9e92d` | Lazy Wings renderer on explicit launch |
| `f71f298`, `29a43ac` | Static descriptions and postcommit checks |
| `d435f12` | Astra picker/spawn/flight-source integration |
| `a9d5e4f`, `edc6ff4` | Model-document status and integrated handover/inventory |
| `b5a7158` | Rebuilt test artifact without host-path comments |
| `2d2eb61` | Current Wings inventory reconciliation |

- Restored Wings source pin remains read-only. Both immutable Astra models
  (46,840 / 55,712 bytes; exact hashes in handover) pass handling/simulation/native
  picker checks. Actual converted-material attempt timed out at 40s; supported-GPU
  native flight, thumbnails, cockpit, combat/restart and rights remain held.
- Recent sort reduced 1,374 reads/parses to one; focused runner passed. Original
  5000ms readiness runner failed twice; full fullscreen reached real Snake but
  timed out at 650s without final PASS. No further retries or invented root cause.
- Static descriptions cover 124/124 nonprotected entries; Character AI unchanged
  and read-only; no tracking added. This is metadata coverage, not engine auditing.
- Jetpack's three diagnostic boots had zero transport failures and this full gate
  passed its load check. SDK `src='#'` HTML-as-JavaScript, audio, input/save/cheat
  findings remain independent holds.
- `b5a7158` rebuilt the test-only artifact from 884,415 to 539,850 bytes; current
  host-path comments are gone. Historical `d435f12` content remains unremediated;
  ticket `1792053112900` for separately authorized history cleanup is pending.
  Completed identity remediation did not fix that later content finding.
- Global `git diff --check e787681..HEAD` still returns **exit 2, 22 diagnostics**
  in generated vendor/shader literals. No hand-edit or suppression. Owned-document
  whitespace success is not a global PASS. Source/portal hold ticket
  `1792052078368` remains pending. No history operation is performed here.

## Final documentation checks

Fresh nonbrowser checks in this lane, all exit 0:

```text
python3 -B scripts/check_maintenance_docs.py
PASS: 130 game documents cover 125 registered + 5 unregistered games; Git inventory current.
Coverage only: section presence does not certify documentation accuracy or gameplay.
python3 -B scripts/generate_sitemap.py --check
PASS sitemap: 125 Git-backed game URLs + portal; base=https://lzeo2.github.io/TestRepoGame/
python3 -B scripts/test_portal_seo.py --check --metadata-baseline e787681
PASS metadata-only: 122 owned entries unchanged outside the approved description patch
PASS descriptions: 124/124 nonprotected entries; Character AI unchanged; byte-preserving parser fixtures
PASS static: 125 games, 126 sitemap URLs, metadata/manifest/3 icon sizes
node --check assets/portal-ux.js
```

Node produced no output (exit 0). After documentation edits, maintenance check
again passed; owned-document `git diff --check` exited 0. Catalog assertions
passed all 125 records, required schema, unique integer IDs and Git-backed URLs.
Owned-path/path-hygiene review passed all six changed documents. Global whitespace
check remains the separate exit-2/22-finding result above. This documentation
interval measured 2,346,868,736 free bytes before edits and 2,346,307,584 before
commit (shared delta -561,152 bytes, not solely attributable to documentation).
Inventory already current; no refresh. Only
`docs/maintenance/**` and `CHANGELOG.md` are owned here. No runtime, script, catalog,
source growth, sparse changes, install, fetch, origin change or push. Explicit-path
commit and final clean-status/free-byte receipts accompany the worker return.
