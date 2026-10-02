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
Fixtures cannot remove these holds. No acceptance or subjective image approval
is claimed by this implementation report.
