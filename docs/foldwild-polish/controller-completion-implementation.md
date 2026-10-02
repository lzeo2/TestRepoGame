# Worker 97: controller/completion checkpoint

Owned paths: `Games/Foldwild/script.js`, `index.html`, optional `style.css`,
`scripts/test_foldwild_completion_ui.py`, and this report. No other source,
test or manual paths are staged. Existing Foldwild only; zero games added,
no registration, dependency, install, build or push. Catalog remains untouched.

Read AGENTS, CODE_QUALITY, complete ponytail skill, maintenance README/Foldwild
manual and inventory entry, frozen implementation order, both source-worker
reports, complete controller/entry/style/world/campaign/builds/battle/economy,
and traced imported APIs/callers. Baseline ranks `3cd9963`, campaign `c2acba9`,
report `6b95b35`; dispatch HEAD `6c74943`. Runtime tree at dispatch
`abb9cc8f2d33841877e9207f015606d82244697a` differs from maintenance inventory
`a95c344888434010772c481f419cc9b933bc6dc0`; that manual/inventory is stale and
unowned. No acceptance inferred from historical reports.

## Wiring and ABI

Uses frozen `FINALE_STAGES`, `ENDING`, `challengeFor`, `settleChallenge`,
`classRank`, `classProgress`, `perksFor`. Every newly created fight supplies
its earned `classRank`; Continue retains canonical saved ranks. No pure-module
ABI or renderer changes. `foldwildSnapshot` remains a deep-frozen cloned getter
with its existing shape; state already carries canonical version3 finale and
pending context. No writable/debug grant API.

Field record displays objective and active rank/progress/perks; services show
campaign objective and class thresholds. Start/Continue and replacement summaries
include migrated campaign progress and pending fight rank. Camps retain explicit
free healing/four-kite floor plus lesson selection. Named opponent previews use
the exact fixed table and Begin/Back. Begin rechecks phase, visible dialog, save
queue/block/permission/current primary bytes, readiness and current location via
`challengeFor`. Neutral enemy identities, order, levels, seed and encounter are
canonical. Rematch markers retain rival type and take this explicit challenge
path, never ordinary first-trial settlement.

Each challenge command records the immediate pre-command checkpoint. Nonterminal
commands copy roster resources and update the pending snapshot. Terminal commands
call pure settlement before roster mutation, replace state, clear local preview
context and share evolution/result rendering. Completion uses exact frozen ending
copy and Continue free play. Result heading gets initial keyboard focus; once the
existing busy window ends, the enabled Continue button receives focus without
scrolling. This is not a mobile ledger Close workaround. Service-to-preview closes
one dialog before opening another; its deferred close handler does not steal
focus from a new modal. Existing single canvas/cache/RAF/view are unchanged.

Pathfinder and Quartermaster resolve pre-transaction bonuses, retain caps and
one-shot atomic transaction boundaries. No class Wait bonus or boss addition.
Ordinary wild/trial economy and UID rules are unchanged. Import/recovery refuses
stacking previews over an already-open modal; exact-byte consent/queue/Web Locks,
backup limits and separate render/save diagnostics otherwise remain intact.

## Evidence status at source milestone

`node --experimental-default-type=module --check Games/Foldwild/script.js` and
`git diff --check`: exit0, no diagnostics before test creation. New native check
is written but not yet executed at this checkpoint. It uses ordinary input for
fresh start, keyboard movement, camp/class UI and manual save/reload. High-level
finale, ending, loss, rematch, old-save and threshold coverage uses explicitly
labeled canonical hostile/composition files introduced only via visible import
and confirmation. They are not natural campaign/rank/pacing evidence.

Final executed commands, exits and failures will be appended in an evidence-only
owned report commit. Original/async M2 suites are untouched and not run here;
original Close hold remains. No full catalog gate or smoke. Main owns independent
review, native checks, images and unowned maintenance refresh.

Disk guard initially: `/dev/mmcblk0p2   29G   26G  2.2G  93% /`.
Worker transcript basename:
`2026-10-02T11-46-03-200Z_01a0fc6f-893d-711d-bb94-d9623afe13ae.jsonl`.
Executing model `openai-codex/gpt-6-astra`, reasoning `high`.
All commits use anonymous `Arcade Worker <>` attribution.

Held: stable original/async native Close, natural complete campaign/ranks/pacing,
physical touch/hardware, rights, full registered-catalog release gate and release.
Fixtures cannot remove these holds. No release acceptance or full-polish image
approval is claimed by this implementation report.

## Executed evidence and final limitations

Source milestone: `32ee01a` (`feat: wire Foldwild ranks and campaign completion
controller`). Follow-up adds explicit rank wording and next-rank perks, and fixes
the native check to compare canonical saved state rather than raw live movement
state. No style.css change was needed. Existing combat, economy, world and renderer
modules remain untouched by this worker.

Native command: `python3 -B scripts/test_foldwild_completion_ui.py`, exactly two
attempts, no third run. Logs are outside Git:

- `foldwild-97-native-attempt1.log`: **exit1**, assertion at the fresh/manual
  reload equality check, `snapshot(page)['state'] == natural`. It captured raw
  live state rather than the canonical persisted projection. Movement yaw is
  normalized at the save boundary; the failed run did not print the differing
  field, so that exact numeric difference was not independently retained.
- Corrected the comparison to `json.loads(slots(page)[0])`, preserving strict
  whole-state equality after Continue. No assertion removed, timing inflated,
  extra tap, mutable hook or runtime grant added.
- `foldwild-97-native-attempt2.log`: **exit0**. Actual output:

```text
PASS natural inputs: fresh start, keyboard movement, camp services/rank UI, free rest, manual save/reload
PASS composition fixtures: old-save unstarted migration, named preview/Back, earned rank3, exact initial/nonterminal/pending Continue
PASS composition fixtures: exact terminal loss/free recovery, ending/focus/320+390 layout, rematch ordinary payout and no reload payout
PASS composition fixtures: explicit rematch Begin UID/context; threshold-crossing supply uses OLD rank
CLEANUP: native browser and bounded server stopped
PASS controller check; natural campaign/ranks/pacing, touch, M2, hardware/rights/release remain HELD
```

The browser used normal keyboard and mouse inputs, read-only snapshots/storage,
and supported file upload/visible replacement consent. Fixture generation occurs
in a separate Node process using canonical pure modules. Zero console/page errors
or external loads were observed in the successful check. Loss fixture checks
zero-Marks/kites recovery; terminal fixtures compare the entire settled canonical
state, battle and stored state with pure settlement. Initial challenge compares
exact opponents, seed, rank3 and full pending save. Reload preserves the exact
nonterminal checkpoint. These are composition assertions, not gameplay pacing.

Screenshots in temporary `foldwild-completion-ui/`:
`natural-classes.png` (desktop), `fixture-ending-390.png`,
`fixture-ending-320.png`. Three screenshots, about 204 KiB total. Worker inspected
the desktop class panel and 320px ending: text/buttons fit; ending copy and button
are visible. The existing last action message above the result can still describe
the resumed encounter; no wholesale UI polish is claimed. Main independently
owns image review, theme coverage and original/async native checks. No actual
physical touch or alternate-theme acceptance here.

Pure command for each suite:
`node --experimental-default-type=module scripts/test_foldwild_<suite>.mjs`.
`foldwild-97-pure.log` records **12/12 exit0**: data, builds, class_ranks,
campaign, continuity, battle, battle_v2, world, regions, economy, save_v2, cap_xp.
Important actual output includes `80 tracked/local SHA matches;
models=7300844 bytes`, `168 baseline legacy replay snapshots exact`, and campaign
`Natural campaign acceptance NOT established.` Historical v2 banners in older
suites are not claims that the canonical version remains 2.

A separate run of Main-owned, already-committed `save_conflict` also exited0:
`PASS: optimistic expected-null/bytes writes; stale primary AND backup preservation;
exact raw metadata; unchanged two-argument API; legacy/pending replay; negative
corrupt/UTF-8/version/denied/quota fixtures`. It was neither edited nor staged by
this worker. **13 pure suites passed total**, plus one successful scoped native
check after one retained failure. No full catalog smoke was run.

ESM syntax and `git diff --check`: exit0. Catalog schema/unique IDs/tracked URLs:
exit0, `catalog schema/unique IDs/tracked URLs: 115`. Protected originals/vendor/
data/region/catalog and original/async M2 diff against dispatch HEAD: empty.
No new runtime network/dependency loads, canvas or RAF added.

Maintenance checker was run without refresh: **exit1**, actual assertion
`Commit inspected source changes before validating its inventory.` This occurred
while the owned follow-up was dirty. After the final source commit it is rerun
below; Main owns the stale inventory/manual and must update them independently.
Rounded disk before/after remains 2.2G free (reported delta 0.0G). Exact initial
bytes were not captured; no byte-accurate storage delta claimed. No assets grew.

Unaddressed coverage: native tests do not naturally earn ranks/campaign completion,
exercise all lessons from beginning to end, prove Quartermaster threshold crossing
through a native delivery, test a multi-tab Begin conflict, cover all reset/backup/
quota paths again, clear original/async mobile Close, certify physical devices or
rights, or run full release gates. Those remain held despite pure-module coverage.
The existing exact-byte save protocol was preserved, not newly certified in full.
