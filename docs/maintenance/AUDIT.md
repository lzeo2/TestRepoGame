# Comprehensive maintenance audit: integrated findings and evidence

**Local maintenance milestone, not release approval.** The owner requested a code
audit with subagents, extensive documentation for every game/site feature,
continued feature work and a month outlook. The delivered scope is **120 game
manuals, nine site-feature guides, ranked source audits and the first reliability
refurbishment wave**. No game was added, registered, deleted, published or pushed.
Foldwild remains unregistered and its integrated native input acceptance is held.

Start at [the manual/index](README.md), [scope contract](SCOPE.md),
[refurbishment programme](REFURBISHMENT.md) and [3D outlook](3d-outlook.md).
The documentation is deliberately source-grounded: implementations, controls,
state/storage, dependencies/provenance, findings, smallest safe patches,
verification and future work. A page's existence does not certify its engine.

## Inventory, coverage and what comprehensive means here

The current catalog has **115 unique integer IDs and tracked entry URLs**.
Git has **120 game projects plus shared `_emulatorjs` infrastructure**. The five
unregistered projects are 2048, Foldwild, Hextris, QWOP and Slope; none silently
received ID225. Missing local folders are sparse exclusion, not deployment failure.

[Inventory](inventory.json) records entry/tree IDs, sizes and page identity;
`python3 -B scripts/check_maintenance_docs.py` compares them against Git and checks
120 pages, 1080 required sections and one index link per game. Main refreshed it
only after inspecting the committed source changes. Nine site guides cover portal
features, style/accessibility, browser state, tests, deployment/routes, disabled
proxy, emulation, rights/sparse work and 3D budgets. There is no implemented density
or copy-share widget just because historical prose mentioned one.

### Frozen machine audit and individual source review

| Evidence | Actual coverage | Limits |
| --- | --- | --- |
| [Kickoff static report](audits/static-tree.md), [JSON](audits/static-tree.json), `8c8a055` | All tracked blob metadata; 2217 selected-extension sources/232115906 bytes; 220 Node units passed; 115 valid catalog entries | Pattern candidates need data-flow review. Binary/extensionless/Markdown exclusions and 81 oversized structural-parse exclusions disclosed. |
| [Current JSON](audits/current-tree.json), `c669f4201b6ad7a3ad4faff8abc2bd249fb3c9c1` | 2222 selected-extension sources/232578221 bytes; game sources 2145/230313762 bytes; 220 Node units passed; catalog schema/URLs clean; 126.54 seconds | Frozen before this final report/gallery. Runtime is identical to Main's focused-check source. JSON metadata is not full game execution or legal review. |
| Eight [game groups](README.md#audit-refurbishment-and-month-outlook) plus [3D audit](audits/3d.md) | Every project entry/bootstrap; small authored gameplay read; relevant state/input/reset/load boundaries; broader syntax checks recorded per group | Each page lists human-read versus sampled/unread engine/vendor/binary areas. Counts overlap across workers and must not be summed as unique tested games. |
| [Portal](audits/portal.md), [infrastructure](audits/infrastructure.md), [complexity](audits/complexity.md) | Authored UX and selected compiled application interfaces; config/functions/UV/shared emulator; provenance and architectural triage | Large engine internals, compressed code/data, ROMs, art, worker/socket paths and some vendor APIs are not fully human-reviewed. |

The scanner reads Git blobs in bounded chunks without materializing all 1.88GB
of Games. It handles NUL-delimited paths, UTF-8/chunk overlap, literal URL/base
resolution and bounded Node parsing. It does not decompile binaries, resolve every
dynamic import/CSS asset or certify no secrets from a few credential patterns.
Native loading, actual play, hardware and copyright clearance are separate layers.

## Ranked integrated findings

Statuses below override only the identified repairs; the baseline reports remain
dated evidence. Severity is maintenance/release priority, not proof of remote
exploitation. Existing public attribution/contact metadata is a privacy/notice
policy decision, not automatically a leaked credential. Rights holds are evidence
gaps/conflicts, not adjudicated infringement.

| Priority/status | Source boundary and impact | Next smallest action |
| --- | --- | --- |
| **CRITICAL policy, protected/open** | Alsen `addMessage/handleInput`: raw user/name-derived text enters `innerHTML`, sharing the site origin | Character AI remains read-only. Escalated owner containment/disposition; no exploit run or unauthorized sink edit. Plain text at shared sink would be a separately permitted action. |
| **CRITICAL policy, source-confirmed external-load hold** | Nested Subway export pages, Ovo `sdk.html` harnesses and shared `Translate.html` contain executable remote analytics/SDK tags | Trace actual route/cache/constructed consumers; approve wrapper or deployment containment separately. Clean catalog entry does not clear unlisted published helper paths. No deletion or new remote fallback. |
| **HIGH, conditional/open** | Shared emulator loopback/debug updater contacts `raw.githack.com`; source/live-minified condition reviewed | Repro localhost versus hosted behavior; legitimate shared vendor-patch path. Do not enable netplay or hand-edit a bundle to evade provenance. |
| **HIGH, save integrity/open** | A Dark Room `deleteSave` clears all origin storage; import replaces data before validation. Cookie/Temple/Vex/emulator restore/write failure paths are unguarded or misleading | Shared owned-key/validated transaction/error boundary, backup preservation and denied/corrupt/quota fixtures. Never clear portal/unrelated game saves. |
| **HIGH, boot/source recovery/open** | Doge main parser failure; Isekai ActionScript loaded as JS; Duck missing webpack closure; historical Flash/Unity/Run3 play holds | Confirm authentic source/consumers and reproduce each actual bootstrap. Parser errors and inert stub files cannot be waved away by a load-only pass. No fabricated game replacement. |
| **HIGH/MEDIUM, rules/lifecycle/open** | Multiple small games have stale restart callbacks, AI ownership/worker cleanup, illegal/false terminal transitions, final-wave or occupied-board failures | Ranked exact anchors and normal-input repros are in the game groups; first reproduce unmeasured risk rows, then fix shared owners/rule transactions. See programme wave B. |
| **HIGH, Foldwild held** | Single touch Close after 390-to-320 resize leaves dialog/inspection open in unchanged full M2 despite zero reported browser/load errors | Input root remains unknown. Preserve failure; no mouse substitution/repeated tap/longer timeout. Isolate actual input routing before another approved patch. |
| **HIGH/MEDIUM, repaired locally** | Portal accepted input/blur route; malformed recent records; self-induced DOM reconciliation; Portal order restore | `2d66059`, fresh Main native regression and layout checks passed. P-05 favorite write denial/P-06 catalog recovery and other audit holds remain open. |
| **MEDIUM, repaired locally** | Archery hit timeout survives restart; keyboard mutates flight aim; stale drag/reset state and native control focus | `250b00d`, baseline failure reproduced and fresh Main normal-input win/loss/reset/touch checks passed. Per-frame physics/hardware remain deferred. |
| **HIGH evidence holds** | ROM/game/art/music/font grants or source pins absent/conflicting; Cookie no-rehosting notice; derivative/community claims without authentic full source/assets record | Owner source/rights decision. Preserve notices, source URLs/pins and qualification; do not infer permission from engine MIT/GPL or claim copyright outreach occurred. |
| **MEDIUM, graphics/accessibility/open** | 3D context-loss/start gaps, promise-load errors, board keyboard/zoom/targets, misleading controls, dialog semantics | Bounded authored wrapper/root fixes with actual input/images. No unsupported whole-engine redesign or new CDN to make startup green. |

Additional per-game findings are actionable, not hidden behind a single overall
score. Source-confirmed examples include Snake full-board termination, Chess
pending reply after reset, Backgammon off-counter mutation, Ultimate Tic-Tac-Toe
three drawn boards counted as a win, Word Scramble malformed record, Hanoi illegal
lower-disk moves, Gomoku/Mancala turn guards and Missile/Invader final-state access.
No native success is claimed for those unfixed branches.

### Simplification queue, not deletion permission

The complexity audit ranks verified identical Subway payloads, Ovo audio,
idempotent portal writes, sort snapshots and a duplicate language-helper branch.
Portal idempotence/snapshot repairs have now landed; repeated recent parsing during
comparison remains a small potential optimization, not a measured bottleneck.
`GameSave` has only self-matches in the bounded HTML/JS consumer search, but requires
constructed-path/owner review before deletion. Identical-blob groups have a
791533422-byte logical duplicate ceiling, **not reclaimable disk space**: Git shares
objects and deployed relative paths may require copies. No framework/dependency,
asset, notice or runtime folder was deleted; no savings were fabricated.

## Refurbishment and acceptance actually completed

### Portal source milestone `2d66059`

Shared capture route now handles input/change and composition; immediate subsequence
search keeps all cards mounted and query survives React category/star rerenders.
Recent reader validates/projects/deduplicates/caps eight; writers, render and sort
reuse it. Count/status/recent updates are idempotent; canonical standard-grid rank
undoes other sort modes without changing featured partition.

[Report](portal-refurbishment.md) includes the two failed Clear-filter development
runs and demonstrated sibling blur/change cause. Final worker and Main runs passed
seven groups. Baseline observation was 300 DOM mutations/1200ms; patched empty and
populated history each observed zero. This measures DOM convergence, not CPU/FPS.
Negative storage/synthetic composition fixtures are separate; trusted OS IME,
write-denial fallback and complete popup/gameplay behavior are not certified.

### Archery source milestone `250b00d`

Shared round reset cancels owned hit work, `setAim` rejects flying/locked updates,
input cleanup owns capture/reset and field keys preserve native buttons. No scoring,
ring order, wind, gravity, asset or license rewrite. [Report](archery-refurbishment.md)
records original baseline exit1 (`old hit callback moved restarted target`) and two
patched worker passes. Main independently reran it successfully: actual ten-shot
loss and win/Play-again on desktop/touch, restart/cancel/locked-flight checks,
zero console/page/request/HTTP/external errors. Legal aim is computed from read-only
observations and sent through normal input, never state grants/seed replacement.

### Foldwild remains held, not a third blind core patch

[Independent finish report](audits/foldwild-input.md) recovered original foreground
M2 exit1 after four desktop stages, an after-timeout observation that still had
open dialog/view inspection, narrower eight-context diagnostic exit0, and a
one-second altered-observation full variant exit0. The exact unchanged failure is
authoritative; none of the other results substitutes. The input root is **unknown**.
The observation-only diagnostic was retained; no Foldwild runtime/model bytes changed.
Main's nine pure suites passed again, not a fresh native M2/campaign/hardware pass.

## Main's fresh verification ledger

Native source frozen at `2d66059cc18f98659fd7f6970dbc0555cb1349a8`:

- Portal UX SHA-256 `ee597750b1e3824415d861a300638db044b43c3eb7224cddc71e0bfce16af0db`.
- Archery HTML SHA-256 `b16ca71abf902a2875b8d726ba5bcf2d6c864d5664d933ade16b5c2fd878f2d7`.

Main captured each real foreground process return, not PIPESTATUS guesses. The
serial focused batch took **147.9785 seconds**, with runtime hashes unchanged:

```text
portal-refurbishment-main exit 0
portal-layout-main exit 0
archery-refurbishment-main exit 0
foldwild-data-main exit 0
foldwild-regions-main exit 0
foldwild-economy-main exit 0
foldwild-builds-main exit 0
foldwild-battle-main exit 0
foldwild-battle_v2-main exit 0
foldwild-world-main exit 0
foldwild-save_v2-main exit 0
foldwild-continuity-main exit 0
```

First three use `timeout 180s xvfb-run -a python3 -B scripts/test_<name>.py`
with the existing portal review runner as the second. Pure suites use
`node --experimental-default-type=module scripts/test_foldwild_<suite>.mjs`.
Temporary logs/status files share the names above; machine ledger basename
`maintenance-main-focused.json`. Each command/server terminates; no installs.

Also run: scanner URL/parser self-test, sparse wrapper self-test, current collector
and catalog validation, Python AST, source/diff/scope/preview/link checks, maintenance
refresh/check. The collector printed `syntax_summary: {"pass":220}`, schema errors
and missing URLs empty. These are not 220 played games. [Reviewed previews](previews.md)
are real current-build captures, not concepts or final release proof.

### Full gate count: zero new full-catalog passes

A fresh unfiltered 115-game load gate would require a renewed bounded storage lease.
Ticket `pi-912882-1790909258579` requested the existing sparse approach/300MiB maximum
with a stronger 2GB floor where feasible; no reply arrived. Normal growth remains
bounded and Games is restored sparse-excluded. **No fresh full gate was started**
under an unconfirmed exception. Historical 115/115 at `3b3bc7a` is not this run.
This is a QA hold, not a failed current full-gate result or permission to push.

Final scope/check output also confirmed 28 Python scripts parse, one Archery
inline unit parses, 151 maintenance Markdown targets/privacy checks pass,
seven image hashes match, 115 unique catalog URLs exist in Git, and protected
Character AI/shared runtime/Foldwild trees plus all80 models are unchanged.
The temporary link/privacy collector initially misread Markdown angle-wrapped
paths and its own documented forbidden-prefix regex; those were corrected as
collector false matches, without changing the frozen game audits. Fragment
semantics are not certified by a file-existence check.

Exact sparse selection restored: `assets`, `docs`, `scripts`; Games absent,
remaining Games bytes0. Git game-tree inventory remains 11489 blobs/1881613679
logical bytes. Final disk guard printed `29G 26G 2.4G 92% /`; no orphan test server
or maintenance launcher matched the final process check. These rounded figures
are not a measured exclusive free-space gain. Full gate/push counts remain zero.

Before any separately authorized release, use unchanged
`xvfb-run python3 scripts/run_sparse_smoke.py` under an approved lease. Stock smoke
has known request/console exclusions, short wait/generic Start attempts and no
`pageerror` listener. Even its pass does not prove all outcomes/saves, offline
branch closure, rights, screenshots or N100 performance. Do not weaken filters.

## Coordination, commits and retained holds

Actual worker model throughout: `openai-codex/gpt-6.1-sol`, disjoint paths and
bounded tasks. Documentation groups 62/67 and input audit 69 ended without complete
supervisor digests; finish-only workers recovered/validated evidence and committed
owned paths. No supervisor exit was invented; no third blind Foldwild core retry.
Main owns scope, integration and subjective images, not a worker's claimed green.

| Deliverable | Commit(s) |
| --- | --- |
| Scope/inventory foundation | `8c8a055` |
| Groups 61/62/63/64 | `ed24bad`, `b86af0f`, `8b1af49`, `a97d613` |
| Groups 65/66/67/68 | `8a10bd9`, `4133f80`, `aae2f66`, `dff8273` |
| Static/portal/infra/3D source audits | `9863169`, `62a3166`, `61cd1a3`, `3ede248` |
| Archery repair/evidence | `250b00d`, `6d2ae5d` |
| Held Foldwild investigation | `39b01e0` |
| Portal reliability repair | `2d66059` |
| Main index/inventory/programme integration | `c669f42` |

Security/route disposition ticket `pi-912882-1790908520374`, prior input tickets,
N100 hardware, metadata/privacy and rights/history-policy questions remain pending.
No license-notice erasure or history rewrite. Character AI, disabled Bare proxy,
Netlify security settings, all original Foldwild model blobs and vendor code are
unchanged. Code changes touch only authored portal UX and existing Archery HTML.
Catalog bytes/order are unchanged, no new source downloads/assets were ingested.

Future: execute [the four-week refurbishment programme](REFURBISHMENT.md), broaden
legitimate 3D source research, secure actual hardware and resolve holds before
requesting publication. Three inspected candidates currently yield **no ingestion
GO**: HexGL pending, Trigger Rally content and OpenLara game-data routes rejected.
No self-made game was added to satisfy a count, no month-long background work is
promised and no push occurred. Final scope/storage/clean-state checks accompany
this report; logical tracked growth is not claimed as exclusive disk use/reclamation.
