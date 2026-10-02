# Foldwild completion implementation and acceptance checkpoint

Owner instruction: finish the existing Foldwild plan and implement through subagents. Main finalized [the concrete order](implementation-order.md); genuine Astra workers implemented disjoint modules, followed by Main integration/review. This is a bounded existing-game code milestone, **not full-polish/release acceptance**.

## Delivered source

- `3cd9963`: [class ranks/combat](class-ranks-implementation.md). Five classes have history-derived ranks 0..3; capped exact perks and pinned fight ranks. No new stored rank counters. New regression proves 168 old baseline replay snapshots, ignoring only additive rank metadata.
- `c2acba9`, evidence `6b95b35`: [campaign/save](campaign-save-implementation.md). Three authored return lessons at existing camps, exact opponents and explicit progression; canonical schema3 migrates genuine v1/v2 to unstarted finale. Exact pending context/identity/rank validation; one-shot deterministic terminal settlement, ordinary capped rewards, loss recovery, completed-trial rematches. No new map/species/artwork.
- `32ee01a`, `f00d033`, evidence `225075d`: [controller/UI](controller-completion-implementation.md). Named preview/Begin/Back, camp rest retained, pre-command settlement, objectives/ranks/perks, exact pending Continue, ending/free-play focus and saved summaries. Field/economy transactions use the preceding rank. Import avoids stacked dialogs; queued Web Lock/byte-guard behavior remains.
- Main `6c74943`: old save-conflict rejection fixtures now use unsupported version4, accepted migration asserts version3/unstarted/null. All previous storage-conflict/byte-preservation assertions remain.
- Main `2e5f068`: shared result presentation announces the current result rather than stale command instructions; native fixture regression checks it.
- Main `433963e`: async M2 evidence-directory selection uses a per-run UUID and logs the directory. No gameplay, mobile/delayed sequence, assertions or timeouts changed. Old evidence is retained rather than deleted/overwritten.

Current game entry `690ba0a57c2b5fdef68373c09a47c4a84c40ae14`, tree `0920ddc5055f4735e73c60f56dee4efe5c5c31e4`, **95 files / 8,965,655 logical bytes**, runtime last changed `2e5f068`. Difference from prior current tree is +16,911 logical bytes and one small authored campaign module. Supplied 80 model/four vendor blobs, data, region layouts, catalog, Character AI, Eaglercraft and netlify security settings are unchanged from `559f825`. Hidden species stays null; registered catalog remains115.

## Actual workers, not inherited labels

Delegations95/96/97 used the real `delegate_to_worker` tool in fresh explicit-provider Astra dispatch hosts. Main independently read each actual assistant session record: `api=openai-codex-responses`, `provider=openai-codex`, `model=gpt-6-astra`. Each worker exited0 and committed owned paths as `Arcade Worker <>`. Logs: `worker-2026-10-02T11-20-01-755Z.log`, `worker-2026-10-02T11-20-01-779Z.log`, `worker-2026-10-02T11-46-02-275Z.log`. The first dispatch host itself timed out1020s **after** both workers completed; that host exit124 is not rewritten as success. No abandoned child/server remains.

## Independent frozen verification

Main's initial pure-module run at `6c74943` passed all13 with module hashes unchanged; concurrent controller source was expressly excluded from that freeze. Main then froze all tracked Foldwild runtime/test files at `2e5f068` and executed:

| Check | Actual exit / scope |
| --- | --- |
| data, regions, economy, builds, battle, battle_v2, world, save_v2, continuity, cap_xp, save_conflict, class_ranks, campaign | **13/13 exit0**; hashes unchanged |
| `xvfb-run -a python3 -B scripts/test_foldwild_completion_ui.py` | **exit0**, 58.92s; natural fresh start/keyboard movement/camp/class UI/rest/manual save/reload, plus explicitly imported synthetic high-level composition fixtures |
| focused `test_foldwild_polish_save.py` | **exit0**, 73.76s; ordinary tabs/manual/pending export-import/consent race plus labeled denial/corrupt/quota fixtures |
| `test_foldwild_render_lifecycle.py` | **exit0**, 37.11s; labeled context/load/cache/deadline fixtures, actual deadline20004ms |
| original `test_foldwild_m2.py`, unchanged | **exit1**, 19.89s; immediate synchronous manual-save assertion before inspection |
| first async invocation before harness correction | **exit1 before browser**, 0.72s; `FileExistsError` on retained task91 output directory. Not gameplay failure/coverage |

Runner ledger: temporary `foldwild-completion-frozen-results.json`; logs `foldwild-completion-frozen-<check>.log`. Source and test hashes match before/after. Workers' earlier shared-tree runs and one failed UI comparison remain documented separately; they are not overwritten by Main's passes. UI comparison was corrected from live movement state to the exact canonical saved projection, retaining whole-state equality.

After the isolated evidence-path correction, at unchanged runtime and committed `433963e`, Main ran async M2 twice with the **same** actions/resize/screenshots/single tap/assertions/timeouts:

1. `foldwild-completion-frozen-m2-async-rerun.log`: **exit0**, 86.30s, all seven stages and labeled storage/model negatives. Evidence suffix `44fc21de977d4714858975faa6dd1b7b`.
2. `foldwild-completion-frozen-m2-async-repeat.log`: **exit1**, 103.37s, four desktop stages then the historical **single `#collection-close.tap()`** at390→320 failed world readiness at line295 with `Page.wait_for_function: Timeout 30000ms exceeded.` Evidence suffix `f5a08da421a54110a3b0729dadd0499c`.

Both complete runtime/test hash ledgers match; no intervening changes. **Current async M2 result1/2, unstable and HELD.** The first pass is genuine scoped evidence, not proof of a root fix. No third retry, timing inflation, extra tap, mutable hook or pointer workaround. Original M2 SHA256 stays `4187de5f03366332af2eddd9bed3a61ac33c9532115ac0b2fb09435bc85c12ea`. Prior passive trace found trusted touch without compatibility click; underlying root still unknown. Escalated updated evidence in ticket `pi-912882-1790943419159`.

Quoted independent outputs include `80 tracked/local SHA matches; models=7300844 bytes`, `168 baseline legacy replay snapshots exact`, and campaign `Natural campaign acceptance NOT established.` Native UI fixtures introduce synthetic high-level/preterminal saves only through supported file upload and visible consent. They verify wiring/full canonical next state/reload/one-shot rewards, **not natural campaign/rank progression**. No seeded replacement or live grant is represented as natural gameplay.

## Main's actual image review

Six fresh frozen-runtime frames below were personally opened/reviewed. Class dialog text/controls fit, with vertical modal scroll for later classes. Ending copy/Continue fit320/390 without horizontal overflow; mobile pages still require vertical scrolling. Creature preview/name/Close targets fit the narrow frames; Reset is below the dialog viewport and requires scrolling. These screenshots cannot certify reliable Close, whole80-roster fit, hardware or themes.

- [Natural initial camp/class panel](completion-previews/natural-classes.png),1100×720. Rank1 shown; no rank was naturally earned in this check.
- [Synthetic imported ending390](completion-previews/fixture-ending-390.png) and [320](completion-previews/fixture-ending-320.png), composition fixtures, not a natural completed campaign.
- [Normal resumed battle](completion-previews/battle-resumed.jpg),1280×720, actual weakened Budriv/RNG/resources.
- [Mobile inspector390](completion-previews/mobile-inspection.jpg) and [320](completion-previews/mobile-inspection-320.jpg), before the Close tap in the passing run. Identical sequence subsequently failed; image correctness does not close that hold.

## Remaining boundaries and restoration

Natural full campaign/alternate starter/earning ranks/whole80 acquisition and cosmetic fit/pacing, physical touch/N100, rights, stable M2 and unfiltered registered-catalog release gate remain unverified/held. Broader fifteen distinct reactive tasks, NPC exchange, evolution deferral, audio, optional frontier/horror are not delivered by this milestone. No atomic two-key backup or protection from historical noncooperating writers is promised; export/close older tabs before schema3 upgrade.

Main refreshed the exact nine-section maintenance manual/inventory; checker reports `PASS: 120 game documents cover 115 registered + 5 unregistered games; Git inventory current.` Coverage is not factual/gameplay certification. Final syntax/AST/catalog/protected identities/privacy/diff/storage/sparse checks are recorded at integration commit. Full smoke/push/registration were not attempted; pending full-gate storage lease is not inferred approved. Sparse baseline restored to assets/docs/scripts after QA; >=2GB free, no worker/browser/server left.

Scope: **only existing authorized Foldwild; games added0, build/register commit pairs0, catalog changes0, deletion0, push0**. Owner subsequently queued two 3D car conversions; intended existing title-to-genre mapping is still awaiting clarification (`pi-912882-1790942787729`). No car code/assets or near-brand designs changed. Original fictional compact cars can be proposed, but similar names/designs are not blanket copyright/trademark clearance.
